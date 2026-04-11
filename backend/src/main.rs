use std::{
    env,
    str::FromStr,
    sync::{
        Arc,
        atomic::{AtomicUsize, Ordering},
    },
    time::{Duration, SystemTime, UNIX_EPOCH},
};

use anyhow::{Context, Result};
use axum::{
    Json, Router,
    extract::{
        Path, State,
        ws::{Message, WebSocket, WebSocketUpgrade},
    },
    http::StatusCode,
    response::IntoResponse,
    routing::get,
};
use dotenvy::dotenv;
use futures_util::StreamExt;
use serde::Serialize;
use solana_sdk::pubkey::Pubkey;
use tokio::{net::TcpListener, signal};
use tower_http::trace::TraceLayer;
use tracing::{debug, error, info, warn};
use tracing_subscriber::EnvFilter;

#[derive(Clone, Debug, Default)]
struct AppState {
    active_clients: Arc<AtomicUsize>,
}

#[derive(Debug, Clone)]
struct ServerConfig {
    host: String,
    port: u16,
}

impl ServerConfig {
    fn bind_addr(&self) -> String {
        format!("{}:{}", self.host, self.port)
    }
}

#[derive(Debug, Serialize)]
struct HealthResponse {
    status: &'static str,
    service: &'static str,
    active_clients: usize,
}

#[derive(Debug, Serialize, Clone)]
#[serde(rename_all = "camelCase")]
struct TxEvent {
    signature: String,
    status: TxStatus,
    timestamp: u64,
    compute_units_consumed: u64,
    priority_fee_microlamports: u64,
    confirmation_latency_ms: u64,
    slot: u64,
}

#[derive(Debug, Serialize, Clone, Copy)]
#[serde(rename_all = "lowercase")]
enum TxStatus {
    Success,
    Failed,
    Pending,
    Dropped,
}

#[derive(Debug, Serialize, Clone)]
#[serde(rename_all = "camelCase")]
struct MetricsUpdate {
    success_rate_pct: f64,
    avg_confirmation_ms: f64,
    current_slot_lag: u64,
    tx_per_minute: u64,
}

#[derive(Debug, Serialize)]
struct ServerEnvelope<T> {
    #[serde(rename = "type")]
    message_type: &'static str,
    data: T,
}

#[tokio::main]
async fn main() -> Result<()> {
    init_tracing();
    load_environment();

    let config = load_config()?;
    let app_state = AppState {
        active_clients: Arc::new(AtomicUsize::new(0)),
    };

    let app = Router::new()
        .route("/health", get(health_handler))
        .route("/monitor/{address}", get(monitor_handler))
        .with_state(app_state)
        .layer(TraceLayer::new_for_http());

    let bind_addr = config.bind_addr();
    let listener = TcpListener::bind(&bind_addr)
        .await
        .with_context(|| format!("failed to bind server to {}", bind_addr))?;

    info!(address = %bind_addr, "txpulse backend listening");

    axum::serve(listener, app)
        .with_graceful_shutdown(shutdown_signal())
        .await
        .context("server exited unexpectedly")?;

    info!("server shutdown complete");
    Ok(())
}

fn init_tracing() {
    let env_filter = match EnvFilter::try_from_default_env() {
        Ok(value) => value,
        Err(_) => EnvFilter::new("info,tower_http=info"),
    };

    tracing_subscriber::fmt().with_env_filter(env_filter).init();
}

fn load_environment() {
    match dotenv() {
        Ok(path) => debug!(path = %path.display(), "loaded environment file"),
        Err(error) => debug!(error = %error, "no .env loaded, using process environment"),
    }
}

fn load_config() -> Result<ServerConfig> {
    let host = env::var("SERVER_HOST").unwrap_or_else(|_| "0.0.0.0".to_string());

    let port = match env::var("SERVER_PORT") {
        Ok(raw_port) => raw_port
            .parse::<u16>()
            .with_context(|| format!("SERVER_PORT is invalid: {}", raw_port))?,
        Err(_) => 3000,
    };

    Ok(ServerConfig { host, port })
}

async fn health_handler(State(state): State<AppState>) -> Json<HealthResponse> {
    let active_clients = state.active_clients.load(Ordering::Relaxed);

    Json(HealthResponse {
        status: "ok",
        service: "txpulse-backend",
        active_clients,
    })
}

async fn monitor_handler(
    Path(address): Path<String>,
    State(state): State<AppState>,
    ws: WebSocketUpgrade,
) -> impl IntoResponse {
    match Pubkey::from_str(&address) {
        Ok(pubkey) => {
            info!(address = %pubkey, "accepted monitor websocket upgrade");
            ws.on_upgrade(move |socket| handle_monitor_socket(socket, state, pubkey))
                .into_response()
        }
        Err(error) => {
            warn!(address = %address, error = %error, "invalid pubkey for monitor route");
            (
                StatusCode::BAD_REQUEST,
                Json(serde_json::json!({ "error": "invalid Solana address" })),
            )
                .into_response()
        }
    }
}

async fn handle_monitor_socket(mut socket: WebSocket, state: AppState, pubkey: Pubkey) {
    let connected = state.active_clients.fetch_add(1, Ordering::SeqCst) + 1;
    info!(address = %pubkey, active_clients = connected, "monitor websocket connected");

    let mut tx_ticker = tokio::time::interval(Duration::from_secs(2));
    let mut metrics_ticker = tokio::time::interval(Duration::from_secs(3));
    let mut total_events: u64 = 0;
    let mut success_events: u64 = 0;
    let mut latency_sum_ms: u64 = 0;

    loop {
        tokio::select! {
            maybe_message = socket.next() => {
                match maybe_message {
                    Some(Ok(Message::Close(_))) => {
                        info!(address = %pubkey, "client closed monitor websocket");
                        break;
                    }
                    Some(Ok(Message::Ping(payload))) => {
                        if let Err(error) = socket.send(Message::Pong(payload)).await {
                            warn!(address = %pubkey, error = %error, "failed to send pong");
                            break;
                        }
                    }
                    Some(Ok(Message::Text(_))) | Some(Ok(Message::Binary(_))) | Some(Ok(Message::Pong(_))) => {}
                    Some(Err(error)) => {
                        warn!(address = %pubkey, error = %error, "websocket receive error");
                        break;
                    }
                    None => {
                        info!(address = %pubkey, "monitor websocket stream ended");
                        break;
                    }
                }
            }
            _ = tx_ticker.tick() => {
                total_events = total_events.saturating_add(1);

                let event = build_mock_tx_event(pubkey, total_events);
                if matches!(event.status, TxStatus::Success) {
                    success_events = success_events.saturating_add(1);
                }
                latency_sum_ms = latency_sum_ms.saturating_add(event.confirmation_latency_ms);

                let envelope = ServerEnvelope {
                    message_type: "NEW_TRANSACTION",
                    data: event,
                };

                if let Err(error) = send_json(&mut socket, &envelope).await {
                    warn!(address = %pubkey, error = %error, "failed to push tx event");
                    break;
                }
            }
            _ = metrics_ticker.tick() => {
                if total_events == 0 {
                    continue;
                }

                let metrics = MetricsUpdate {
                    success_rate_pct: (success_events as f64 / total_events as f64) * 100.0,
                    avg_confirmation_ms: latency_sum_ms as f64 / total_events as f64,
                    current_slot_lag: total_events % 5,
                    tx_per_minute: total_events.saturating_mul(30),
                };

                let envelope = ServerEnvelope {
                    message_type: "METRICS_UPDATE",
                    data: metrics,
                };

                if let Err(error) = send_json(&mut socket, &envelope).await {
                    warn!(address = %pubkey, error = %error, "failed to push metrics update");
                    break;
                }
            }
        }
    }

    let remaining = state
        .active_clients
        .fetch_sub(1, Ordering::SeqCst)
        .saturating_sub(1);
    info!(address = %pubkey, active_clients = remaining, "monitor websocket disconnected");
}

fn build_mock_tx_event(pubkey: Pubkey, sequence: u64) -> TxEvent {
    let status = match sequence % 8 {
        0 => TxStatus::Dropped,
        3 => TxStatus::Failed,
        5 => TxStatus::Pending,
        _ => TxStatus::Success,
    };

    let signature = format!("{}-{sequence:06}", &pubkey.to_string()[..8]);
    let timestamp = SystemTime::now()
        .duration_since(UNIX_EPOCH)
        .map_or(0, |duration| duration.as_secs());

    TxEvent {
        signature,
        status,
        timestamp,
        compute_units_consumed: 10_000u64.saturating_add(sequence.saturating_mul(280)),
        priority_fee_microlamports: 2_000u64.saturating_add(sequence.saturating_mul(225)),
        confirmation_latency_ms: 620u64.saturating_add(sequence.saturating_mul(33)),
        slot: 281_000_000u64.saturating_add(sequence),
    }
}

async fn send_json<T: Serialize>(socket: &mut WebSocket, payload: &T) -> Result<()> {
    let body = serde_json::to_string(payload).context("failed to serialize websocket payload")?;

    socket
        .send(Message::Text(body.into()))
        .await
        .context("failed to send websocket payload")?;

    Ok(())
}

async fn shutdown_signal() {
    let ctrl_c = async {
        if let Err(error) = signal::ctrl_c().await {
            error!(error = %error, "failed to listen for ctrl+c signal");
        }
    };

    #[cfg(unix)]
    let terminate = async {
        match signal::unix::signal(signal::unix::SignalKind::terminate()) {
            Ok(mut signal_stream) => {
                signal_stream.recv().await;
            }
            Err(error) => {
                error!(error = %error, "failed to install terminate signal handler");
            }
        }
    };

    #[cfg(not(unix))]
    let terminate = std::future::pending::<()>();

    tokio::select! {
        _ = ctrl_c => {},
        _ = terminate => {},
    }

    info!("shutdown signal received");
}
