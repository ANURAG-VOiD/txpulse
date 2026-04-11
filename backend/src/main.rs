use std::{
    collections::{HashSet, VecDeque},
    env,
    str::FromStr,
    sync::{
        Arc,
        atomic::{AtomicU64, AtomicUsize, Ordering},
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
use solana_client::{
    nonblocking::rpc_client::RpcClient,
    rpc_client::GetConfirmedSignaturesForAddress2Config,
    rpc_config::{
        RpcTransactionConfig,
        RpcTransactionLogsConfig,
        RpcTransactionLogsFilter,
    },
};
use solana_pubsub_client::nonblocking::pubsub_client::PubsubClient;
use solana_sdk::signature::Signature;
use solana_sdk::pubkey::Pubkey;
use solana_transaction_status::UiTransactionEncoding;
use tokio::{net::TcpListener, signal};
use tower_http::{
    cors::{Any, CorsLayer},
    trace::TraceLayer,
};
use tracing::{debug, error, info, warn};
use tracing_subscriber::EnvFilter;

#[derive(Clone)]
struct AppState {
    active_clients: Arc<AtomicUsize>,
    total_ws_connections: Arc<AtomicUsize>,
    total_events_streamed: Arc<AtomicUsize>,
    failed_events_streamed: Arc<AtomicUsize>,
    last_event_unix: Arc<AtomicU64>,
    started_at_unix: u64,
    rpc_client: Arc<RpcClient>,
    helius_ws_url: String,
}

#[derive(Debug, Clone)]
struct ServerConfig {
    host: String,
    port: u16,
    helius_http_url: String,
    helius_ws_url: String,
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

#[derive(Debug, Serialize)]
#[serde(rename_all = "camelCase")]
struct AdminMetricsResponse {
    status: &'static str,
    service: &'static str,
    active_clients: usize,
    total_ws_connections: usize,
    total_events_streamed: usize,
    failed_events_streamed: usize,
    success_rate_pct: f64,
    uptime_seconds: u64,
    last_event_unix: u64,
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

#[derive(Debug, Default)]
struct ConnectionMetrics {
    total_events: u64,
    success_events: u64,
    latency_sum_ms: u64,
    event_timestamps: VecDeque<u64>,
    latest_observed_slot: u64,
}

#[derive(Debug, Default)]
struct SeenSignatures {
    set: HashSet<String>,
    order: VecDeque<String>,
}

impl SeenSignatures {
    fn insert(&mut self, signature: String) {
        if self.set.contains(&signature) {
            return;
        }

        self.set.insert(signature.clone());
        self.order.push_back(signature);

        const MAX_TRACKED_SIGNATURES: usize = 512;
        if self.order.len() > MAX_TRACKED_SIGNATURES {
            if let Some(oldest) = self.order.pop_front() {
                self.set.remove(&oldest);
            }
        }
    }

    fn contains(&self, signature: &str) -> bool {
        self.set.contains(signature)
    }
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
    let rpc_client = Arc::new(RpcClient::new(config.helius_http_url.clone()));
    let app_state = AppState {
        active_clients: Arc::new(AtomicUsize::new(0)),
        total_ws_connections: Arc::new(AtomicUsize::new(0)),
        total_events_streamed: Arc::new(AtomicUsize::new(0)),
        failed_events_streamed: Arc::new(AtomicUsize::new(0)),
        last_event_unix: Arc::new(AtomicU64::new(0)),
        started_at_unix: current_unix_timestamp_secs(),
        rpc_client,
        helius_ws_url: config.helius_ws_url.clone(),
    };

    let app = Router::new()
        .route("/health", get(health_handler))
        .route("/admin/metrics", get(admin_metrics_handler))
        .route("/monitor/{address}", get(monitor_handler))
        .with_state(app_state)
        .layer(CorsLayer::new().allow_origin(Any).allow_methods(Any).allow_headers(Any))
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

    let helius_http_url = env::var("HELIUS_HTTP_URL")
        .context("HELIUS_HTTP_URL is required (set it in backend/.env)")?;
    let helius_ws_url = env::var("HELIUS_WS_URL")
        .context("HELIUS_WS_URL is required (set it in backend/.env)")?;

    Ok(ServerConfig {
        host,
        port,
        helius_http_url,
        helius_ws_url,
    })
}

async fn health_handler(State(state): State<AppState>) -> Json<HealthResponse> {
    let active_clients = state.active_clients.load(Ordering::Relaxed);

    Json(HealthResponse {
        status: "ok",
        service: "txpulse-backend",
        active_clients,
    })
}

async fn admin_metrics_handler(State(state): State<AppState>) -> Json<AdminMetricsResponse> {
    let active_clients = state.active_clients.load(Ordering::Relaxed);
    let total_ws_connections = state.total_ws_connections.load(Ordering::Relaxed);
    let total_events_streamed = state.total_events_streamed.load(Ordering::Relaxed);
    let failed_events_streamed = state.failed_events_streamed.load(Ordering::Relaxed);
    let last_event_unix = state.last_event_unix.load(Ordering::Relaxed);
    let uptime_seconds = current_unix_timestamp_secs().saturating_sub(state.started_at_unix);

    let success_rate_pct = if total_events_streamed == 0 {
        100.0
    } else {
        let successful = total_events_streamed.saturating_sub(failed_events_streamed);
        (successful as f64 / total_events_streamed as f64) * 100.0
    };

    Json(AdminMetricsResponse {
        status: "ok",
        service: "txpulse-backend",
        active_clients,
        total_ws_connections,
        total_events_streamed,
        failed_events_streamed,
        success_rate_pct,
        uptime_seconds,
        last_event_unix,
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
    state.total_ws_connections.fetch_add(1, Ordering::SeqCst);
    info!(address = %pubkey, active_clients = connected, "monitor websocket connected");

    let mut metrics_ticker = tokio::time::interval(Duration::from_secs(3));
    let mut metrics = ConnectionMetrics::default();
    let mut seen_signatures = SeenSignatures::default();

    let pubsub_client = match PubsubClient::new(&state.helius_ws_url).await {
        Ok(client) => client,
        Err(error) => {
            warn!(address = %pubkey, error = %error, "failed to connect to Helius pubsub");
            let remaining = state
                .active_clients
                .fetch_sub(1, Ordering::SeqCst)
                .saturating_sub(1);
            info!(address = %pubkey, active_clients = remaining, "monitor websocket disconnected");
            return;
        }
    };

    let (mut logs_stream, logs_unsubscribe) = match pubsub_client
        .logs_subscribe(
            RpcTransactionLogsFilter::Mentions(vec![pubkey.to_string()]),
            RpcTransactionLogsConfig {
                commitment: None,
            },
        )
        .await
    {
        Ok(value) => value,
        Err(error) => {
            warn!(address = %pubkey, error = %error, "failed to subscribe to logs");
            let remaining = state
                .active_clients
                .fetch_sub(1, Ordering::SeqCst)
                .saturating_sub(1);
            info!(address = %pubkey, active_clients = remaining, "monitor websocket disconnected");
            return;
        }
    };

    match fetch_recent_events_for_address(&state.rpc_client, pubkey, &mut seen_signatures, 12).await {
        Ok(events) => {
            for event in events {
                record_event_metrics(&mut metrics, &event);
                record_global_event_metrics(&state, &event);

                let envelope = ServerEnvelope {
                    message_type: "NEW_TRANSACTION",
                    data: event,
                };

                if let Err(error) = send_json(&mut socket, &envelope).await {
                    warn!(address = %pubkey, error = %error, "failed to push bootstrap tx event");
                    logs_unsubscribe().await;

                    let remaining = state
                        .active_clients
                        .fetch_sub(1, Ordering::SeqCst)
                        .saturating_sub(1);
                    info!(address = %pubkey, active_clients = remaining, "monitor websocket disconnected");
                    return;
                }

            }
        }
        Err(error) => {
            warn!(address = %pubkey, error = %error, "failed to fetch bootstrap tx events");
        }
    }

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
            maybe_log = logs_stream.next() => {
                match maybe_log {
                    Some(log_notification) => {
                        let signature_value = log_notification.value.signature;
                        if seen_signatures.contains(&signature_value) {
                            continue;
                        }

                        seen_signatures.insert(signature_value.clone());

                        let signature = match Signature::from_str(&signature_value) {
                            Ok(parsed) => parsed,
                            Err(error) => {
                                warn!(address = %pubkey, signature = %signature_value, error = %error, "invalid signature from logsSubscribe");
                                continue;
                            }
                        };

                        let tx_response = fetch_transaction_with_retry(&state.rpc_client, &signature, 3).await;
                        let tx_event = build_live_tx_event(
                            &signature_value,
                            log_notification.context.slot,
                            None,
                            Some(log_notification.context.slot),
                            log_notification.value.err.is_some(),
                            tx_response,
                        );

                        record_event_metrics(&mut metrics, &tx_event);
                        record_global_event_metrics(&state, &tx_event);

                        let envelope = ServerEnvelope {
                            message_type: "NEW_TRANSACTION",
                            data: tx_event,
                        };

                        if let Err(error) = send_json(&mut socket, &envelope).await {
                            warn!(address = %pubkey, error = %error, "failed to push tx event");
                            break;
                        }
                    }
                    None => {
                        warn!(address = %pubkey, "logs subscription stream ended");
                        break;
                    }
                }
            }
            _ = metrics_ticker.tick() => {
                if metrics.total_events == 0 {
                    continue;
                }

                let network_slot = match state.rpc_client.get_slot().await {
                    Ok(slot) => slot,
                    Err(error) => {
                        warn!(address = %pubkey, error = %error, "failed to fetch current slot");
                        metrics.latest_observed_slot
                    }
                };

                prune_old_timestamps(&mut metrics.event_timestamps);

                let metrics_payload = MetricsUpdate {
                    success_rate_pct: (metrics.success_events as f64 / metrics.total_events as f64) * 100.0,
                    avg_confirmation_ms: metrics.latency_sum_ms as f64 / metrics.total_events as f64,
                    current_slot_lag: network_slot.saturating_sub(metrics.latest_observed_slot),
                    tx_per_minute: metrics.event_timestamps.len() as u64,
                };

                let envelope = ServerEnvelope {
                    message_type: "METRICS_UPDATE",
                    data: metrics_payload,
                };

                if let Err(error) = send_json(&mut socket, &envelope).await {
                    warn!(address = %pubkey, error = %error, "failed to push metrics update");
                    break;
                }
            }
        }
    }

    logs_unsubscribe().await;

    let remaining = state
        .active_clients
        .fetch_sub(1, Ordering::SeqCst)
        .saturating_sub(1);
    info!(address = %pubkey, active_clients = remaining, "monitor websocket disconnected");
}

fn record_event_metrics(metrics: &mut ConnectionMetrics, event: &TxEvent) {
    metrics.total_events = metrics.total_events.saturating_add(1);
    if matches!(event.status, TxStatus::Success) {
        metrics.success_events = metrics.success_events.saturating_add(1);
    }

    metrics.latency_sum_ms = metrics
        .latency_sum_ms
        .saturating_add(event.confirmation_latency_ms);
    metrics.latest_observed_slot = metrics.latest_observed_slot.max(event.slot);
    metrics.event_timestamps.push_back(event.timestamp);

    prune_old_timestamps(&mut metrics.event_timestamps);
}

fn record_global_event_metrics(state: &AppState, event: &TxEvent) {
    state.total_events_streamed.fetch_add(1, Ordering::SeqCst);
    if matches!(event.status, TxStatus::Failed | TxStatus::Dropped) {
        state.failed_events_streamed.fetch_add(1, Ordering::SeqCst);
    }
    state
        .last_event_unix
        .store(event.timestamp, Ordering::SeqCst);
}

fn prune_old_timestamps(event_timestamps: &mut VecDeque<u64>) {
    let now = current_unix_timestamp_secs();
    let oldest_allowed = now.saturating_sub(60);

    while let Some(ts) = event_timestamps.front() {
        if *ts < oldest_allowed {
            event_timestamps.pop_front();
        } else {
            break;
        }
    }
}

async fn fetch_transaction_with_retry(
    rpc_client: &RpcClient,
    signature: &Signature,
    max_attempts: usize,
) -> Option<solana_transaction_status::EncodedConfirmedTransactionWithStatusMeta> {
    let config = RpcTransactionConfig {
        encoding: Some(UiTransactionEncoding::Json),
        commitment: None,
        max_supported_transaction_version: Some(0),
    };

    for attempt in 0..max_attempts {
        match rpc_client
            .get_transaction_with_config(signature, config.clone())
            .await
        {
            Ok(response) => return Some(response),
            Err(error) => {
                let is_last_attempt = attempt + 1 == max_attempts;
                if is_last_attempt {
                    warn!(signature = %signature, error = %error, "failed to fetch transaction after retries");
                    return None;
                }

                let delay_ms = 250u64.saturating_mul(1u64 << attempt);
                tokio::time::sleep(Duration::from_millis(delay_ms)).await;
            }
        }
    }

    None
}

async fn fetch_recent_events_for_address(
    rpc_client: &RpcClient,
    pubkey: Pubkey,
    seen_signatures: &mut SeenSignatures,
    limit: usize,
) -> Result<Vec<TxEvent>> {
    let signatures = rpc_client
        .get_signatures_for_address_with_config(
            &pubkey,
            GetConfirmedSignaturesForAddress2Config {
                before: None,
                until: None,
                limit: Some(limit),
                commitment: None,
            },
        )
        .await
        .context("failed to fetch recent signatures for bootstrap")?;

    let mut events = Vec::new();

    for signature_row in signatures.iter().rev() {
        if seen_signatures.contains(&signature_row.signature) {
            continue;
        }

        seen_signatures.insert(signature_row.signature.clone());

        let signature = match Signature::from_str(&signature_row.signature) {
            Ok(value) => value,
            Err(error) => {
                warn!(signature = %signature_row.signature, error = %error, "invalid bootstrap signature");
                continue;
            }
        };

        let tx_response = fetch_transaction_with_retry(rpc_client, &signature, 3).await;
        let tx_event = build_live_tx_event(
            &signature_row.signature,
            signature_row.slot,
            signature_row.block_time,
            None,
            signature_row.err.is_some(),
            tx_response,
        );
        events.push(tx_event);
    }

    Ok(events)
}

fn build_live_tx_event(
    signature: &str,
    fallback_slot: u64,
    fallback_block_time: Option<i64>,
    observed_slot: Option<u64>,
    has_signature_error: bool,
    tx_response: Option<solana_transaction_status::EncodedConfirmedTransactionWithStatusMeta>,
) -> TxEvent {
    let now = current_unix_timestamp_secs();

    if let Some(tx) = tx_response {
        let meta = tx.transaction.meta;
        let block_time = tx.block_time.or(fallback_block_time).unwrap_or_default();
        let timestamp = if block_time > 0 { block_time as u64 } else { now };
        let confirmation_latency_ms = estimate_confirmation_latency_ms(
            tx.slot,
            observed_slot,
            tx.block_time.or(fallback_block_time),
            now,
        );

        let compute_units_consumed = meta
            .as_ref()
            .and_then(|value| {
                serde_json::to_value(value)
                    .ok()
                    .and_then(|json| json.get("computeUnitsConsumed").and_then(|v| v.as_u64()))
            })
            .unwrap_or_default();

        let fee_lamports = meta.as_ref().map_or(0, |value| value.fee);
        let failed_in_meta = meta.as_ref().is_some_and(|value| value.err.is_some());

        let status = if has_signature_error || failed_in_meta {
            TxStatus::Failed
        } else {
            TxStatus::Success
        };

        return TxEvent {
            signature: signature.to_string(),
            status,
            timestamp,
            compute_units_consumed,
            priority_fee_microlamports: fee_lamports,
            confirmation_latency_ms,
            slot: tx.slot,
        };
    }

    let is_stale_unresolved = fallback_block_time
        .and_then(|value| u64::try_from(value).ok())
        .is_some_and(|block_time| now.saturating_sub(block_time) > 120);

    let status = if has_signature_error {
        TxStatus::Failed
    } else if is_stale_unresolved {
        TxStatus::Dropped
    } else {
        TxStatus::Pending
    };

    TxEvent {
        signature: signature.to_string(),
        status,
        timestamp: now,
        compute_units_consumed: 0,
        priority_fee_microlamports: 0,
        confirmation_latency_ms: 0,
        slot: fallback_slot,
    }
}

fn estimate_confirmation_latency_ms(
    tx_slot: u64,
    observed_slot: Option<u64>,
    block_time: Option<i64>,
    now_secs: u64,
) -> u64 {
    if let Some(observed) = observed_slot {
        let slot_delta = observed.saturating_sub(tx_slot);
        return slot_delta.saturating_mul(400).min(120_000);
    }

    if let Some(block_time_secs) = block_time.and_then(|value| u64::try_from(value).ok()) {
        let age_secs = now_secs.saturating_sub(block_time_secs);
        if age_secs <= 300 {
            return age_secs.saturating_mul(1_000);
        }
    }

    0
}

fn current_unix_timestamp_secs() -> u64 {
    SystemTime::now()
        .duration_since(UNIX_EPOCH)
        .map_or(0, |duration| duration.as_secs())
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
