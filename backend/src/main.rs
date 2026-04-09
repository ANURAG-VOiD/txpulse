use std::env;

use anyhow::{Context, Result};
use axum::{Json, Router, extract::State, routing::get};
use dotenvy::dotenv;
use serde::Serialize;
use tokio::{net::TcpListener, signal};
use tower_http::trace::TraceLayer;
use tracing::{debug, error, info};
use tracing_subscriber::EnvFilter;

#[derive(Clone, Debug, Default)]
struct AppState;

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
}

#[tokio::main]
async fn main() -> Result<()> {
    init_tracing();
    load_environment();

    let config = load_config()?;
    let app_state = AppState;

    let app = Router::new()
        .route("/health", get(health_handler))
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

async fn health_handler(State(_state): State<AppState>) -> Json<HealthResponse> {
    Json(HealthResponse {
        status: "ok",
        service: "txpulse-backend",
    })
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
