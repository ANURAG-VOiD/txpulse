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
        Path, State, Query,
        ws::{Message, WebSocket, WebSocketUpgrade},
        ConnectInfo,
    },
    http::StatusCode,
    response::IntoResponse,
    routing::{get, post},
};
use dotenvy::dotenv;
use futures_util::StreamExt;
use serde::{Serialize, Deserialize};
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

mod llm;
mod db;
mod stripe;

use std::time::Instant;
use tokio::sync::RwLock;
use std::collections::HashMap;

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
    llm_service: Option<Arc<llm::LlmService>>,
    explain_cache: Arc<RwLock<HashMap<String, (ExplainResponse, Instant)>>>,
    rate_limiter: Arc<RateLimiter>,
    db_pool: Option<sqlx::PgPool>,
    stripe_service: Option<Arc<stripe::StripeService>>,
}

const CACHE_TTL_SECS: u64 = 300; // 5 minutes
const RATE_LIMIT_MAX_REQUESTS: u32 = 100; // Max requests per window
const RATE_LIMIT_WINDOW_SECS: u64 = 60; // 1 minute window

struct RateLimiter {
    requests: Arc<RwLock<HashMap<String, (u32, Instant)>>>,
    max_requests: u32,
    window_secs: u64,
}

impl RateLimiter {
    fn new(max_requests: u32, window_secs: u64) -> Self {
        Self {
            requests: Arc::new(RwLock::new(HashMap::new())),
            max_requests,
            window_secs,
        }
    }

    async fn check_limit(&self, client_id: &str) -> bool {
        let now = Instant::now();
        let mut requests = self.requests.write().await;

        if let Some(entry) = requests.get(client_id).cloned() {
            let (count, reset_at) = entry;
            if now.duration_since(reset_at).as_secs() > self.window_secs {
                // Window expired, reset
                requests.insert(client_id.to_string(), (1, now));
                return true;
            }
            if count >= self.max_requests {
                return false;
            }
            requests.insert(client_id.to_string(), (count + 1, reset_at));
            true
        } else {
            requests.insert(client_id.to_string(), (1, now));
            true
        }
    }

    async fn cleanup(&self) {
        let now = Instant::now();
        let mut requests = self.requests.write().await;
        requests.retain(|_, (_, reset_at)| {
            now.duration_since(*reset_at).as_secs() <= self.window_secs * 2
        });
    }
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

#[derive(Debug, Deserialize)]
struct ExplainQuery {
    network: Option<String>,
}

impl ExplainQuery {
    fn network(&self) -> &str {
        self.network.as_deref().unwrap_or("mainnet-beta")
    }
}

#[derive(Debug, Serialize, Clone)]
#[serde(rename_all = "camelCase")]
struct ExplainResponse {
    hash: String,
    network: String,
    error_code: Option<String>,
    plain_english: String,
    fix_suggestion: String,
    risk_level: String,
    economic_context: String,
    viewed_count: i64,
    created_at: String,
    share_url: String,
}

#[tokio::main]
async fn main() -> Result<()> {
    init_tracing();

    // Initialize Sentry (optional)
    let _sentry_guard = match env::var("SENTRY_DSN") {
        Ok(dsn) => {
            let guard = sentry::init(sentry::ClientOptions {
                dsn: dsn.parse().ok(),
                release: sentry::release_name!(),
                traces_sample_rate: 1.0,
                ..Default::default()
            });
            info!("Sentry initialized");
            Some(guard)
        }
        Err(_) => {
            info!("Sentry not configured");
            None
        }
    };

    load_environment();

    let config = load_config()?;
    let rpc_client = Arc::new(RpcClient::new(config.helius_http_url.clone()));

    // Initialize LLM service (optional - will fallback to rule-based if unavailable)
    let llm_service = match llm::LlmService::new() {
        Ok(service) => {
            info!("LLM service initialized successfully");
            Some(Arc::new(service))
        }
        Err(e) => {
            warn!("LLM service not available, falling back to rule-based explanations: {}", e);
            None
        }
    };

    let rate_limiter = Arc::new(RateLimiter::new(RATE_LIMIT_MAX_REQUESTS, RATE_LIMIT_WINDOW_SECS));

    // Spawn cleanup task for rate limiter
    let limiter_clone = rate_limiter.clone();
    tokio::spawn(async move {
        loop {
            tokio::time::sleep(Duration::from_secs(60)).await;
            limiter_clone.cleanup().await;
        }
    });

    // Initialize database (optional)
    let db_pool = match env::var("DATABASE_URL") {
        Ok(url) => match db::create_pool(&url).await {
            Ok(pool) => {
                if let Err(e) = db::run_migrations(&pool).await {
                    warn!("Database migration failed: {}", e);
                } else {
                    info!("Database initialized successfully");
                }
                Some(pool)
            }
            Err(e) => {
                warn!("Database connection failed: {}", e);
                None
            }
        },
        Err(_) => {
            info!("DATABASE_URL not set, running without database");
            None
        }
    };

    // Initialize Stripe service (optional)
    let stripe_service = match stripe::StripeService::new() {
        Ok(service) => {
            info!("Stripe service initialized successfully");
            Some(Arc::new(service))
        }
        Err(e) => {
            warn!("Stripe service not available: {}", e);
            None
        }
    };

    let app_state = AppState {
        active_clients: Arc::new(AtomicUsize::new(0)),
        total_ws_connections: Arc::new(AtomicUsize::new(0)),
        total_events_streamed: Arc::new(AtomicUsize::new(0)),
        failed_events_streamed: Arc::new(AtomicUsize::new(0)),
        last_event_unix: Arc::new(AtomicU64::new(0)),
        started_at_unix: current_unix_timestamp_secs(),
        rpc_client,
        helius_ws_url: config.helius_ws_url.clone(),
        llm_service,
        explain_cache: Arc::new(RwLock::new(HashMap::new())),
        rate_limiter,
        db_pool,
        stripe_service,
    };

    let app = Router::new()
        .route("/health", get(health_handler))
        .route("/admin/metrics", get(admin_metrics_handler))
        .route("/admin/llm-status", get(llm_status_handler))
        .route("/monitor/{address}", get(monitor_handler))
        .route("/explain/{tx_hash}", get(explain_handler))
        .route("/api/billing/checkout", post(checkout_handler))
        .route("/api/billing/portal", post(portal_handler))
        .route("/api/billing/usage", get(usage_handler))
        .with_state(app_state)
        .layer(CorsLayer::new().allow_origin(Any).allow_methods(Any).allow_headers(Any))
        .layer(TraceLayer::new_for_http())
        .into_make_service_with_connect_info::<std::net::SocketAddr>();

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

#[derive(Debug, Serialize)]
struct LlmStatusResponse {
    status: String,
    llm_available: bool,
    model: Option<String>,
    timeout_secs: Option<u64>,
}

async fn llm_status_handler(State(state): State<AppState>) -> Json<LlmStatusResponse> {
    match &state.llm_service {
        Some(llm) => {
            let status = llm.status();
            Json(LlmStatusResponse {
                status: "ok".to_string(),
                llm_available: status.available,
                model: Some(status.model),
                timeout_secs: Some(status.timeout_secs),
            })
        }
        None => Json(LlmStatusResponse {
            status: "degraded".to_string(),
            llm_available: false,
            model: None,
            timeout_secs: None,
        }),
    }
}

async fn explain_handler(
    Path(tx_hash): Path<String>,
    Query(query): Query<ExplainQuery>,
    State(state): State<AppState>,
    ConnectInfo(addr): ConnectInfo<std::net::SocketAddr>,
) -> Result<Json<ExplainResponse>, (StatusCode, Json<serde_json::Value>)> {
    let client_id = addr.ip().to_string();

    // Check rate limit
    if !state.rate_limiter.check_limit(&client_id).await {
        info!(client = %client_id, "rate limit exceeded");
        return Err((
            StatusCode::TOO_MANY_REQUESTS,
            Json(serde_json::json!({
                "error": "rate limit exceeded",
                "message": format!("Maximum {} requests per {} seconds exceeded", RATE_LIMIT_MAX_REQUESTS, RATE_LIMIT_WINDOW_SECS),
                "code": "RATE_LIMIT_EXCEEDED"
            })),
        ));
    }

    let network = query.network();

    if !is_valid_network(network) {
        return Err((
            StatusCode::BAD_REQUEST,
            Json(serde_json::json!({
                "error": "invalid network parameter",
                "message": "network must be one of: mainnet-beta, devnet, testnet",
                "code": "INVALID_NETWORK"
            })),
        ));
    }

    let tx_hash_trimmed = tx_hash.trim();
    if tx_hash_trimmed.is_empty() {
        return Err((
            StatusCode::BAD_REQUEST,
            Json(serde_json::json!({
                "error": "transaction hash is required",
                "message": "tx_hash path parameter cannot be empty",
                "code": "MISSING_TX_HASH"
            })),
        ));
    }

    if tx_hash_trimmed.len() < 64 || tx_hash_trimmed.len() > 88 {
        return Err((
            StatusCode::BAD_REQUEST,
            Json(serde_json::json!({
                "error": "invalid transaction hash length",
                "message": "transaction hash must be 64-88 base58 characters",
                "code": "INVALID_TX_HASH_LENGTH"
            })),
        ));
    }

    if !is_valid_base58(tx_hash_trimmed) {
        return Err((
            StatusCode::BAD_REQUEST,
            Json(serde_json::json!({
                "error": "invalid transaction hash format",
                "message": "transaction hash must contain only base58 characters (A-Z, a-z, 0-9, except 0, O, I, l)",
                "code": "INVALID_TX_HASH_FORMAT"
            })),
        ));
    }

    let tx_hash_lower = tx_hash_trimmed.to_lowercase();
    let cache_key = format!("{}:{}", tx_hash_lower, network);

    // Check cache first
    {
        let cache = state.explain_cache.read().await;
        if let Some((cached_response, timestamp)) = cache.get(&cache_key) {
            let elapsed = timestamp.elapsed().as_secs();
            if elapsed < CACHE_TTL_SECS {
                debug!(hash = %tx_hash_lower, "cache hit");
                let response = cached_response.clone();
                return Ok(Json(response));
            }
        }
    }

    let signature = match Signature::from_str(&tx_hash_lower) {
        Ok(sig) => sig,
        Err(error) => {
            warn!(tx_hash = %tx_hash, error = %error, "invalid transaction hash format");
            return Err((
                StatusCode::BAD_REQUEST,
                Json(serde_json::json!({
                    "error": "invalid transaction hash",
                    "message": "transaction hash is not a valid Solana signature",
                    "code": "INVALID_TX_HASH"
                })),
            ));
        }
    };

    let config = RpcTransactionConfig {
        encoding: Some(UiTransactionEncoding::Json),
        commitment: None,
        max_supported_transaction_version: Some(0),
    };

    let tx_response = state
        .rpc_client
        .get_transaction_with_config(&signature, config.clone())
        .await;

    let (error_code, plain_english, fix_suggestion, risk_level, economic_context) = match tx_response {
        Ok(response) => {
            let meta = response.transaction.meta;
            let err = meta.as_ref().and_then(|m| m.err.as_ref());

            if let Some(error) = err {
                // Extract transaction data for LLM
                let error_str = error.to_string();

                // Get meta reference from already-moved variable
                let meta_ref = meta.as_ref();

                let pre_balances: Vec<u64> = meta_ref.map(|m| m.pre_balances.clone()).unwrap_or_default();
                let post_balances: Vec<u64> = meta_ref.map(|m| m.post_balances.clone()).unwrap_or_default();
                let fee = meta_ref.map(|m| m.fee).unwrap_or(0);

                // Build logs from error context
                let logs = vec![format!("Error: {}", error_str)];

                let meta_data = format!(
                    "Signature: {}\nSlot: {}\nFee: {} lamports\nPre-balances: {:?}\nPost-balances: {:?}\nError: {}",
                    signature,
                    response.slot,
                    fee,
                    pre_balances,
                    post_balances,
                    error_str
                );

                let network_metrics = format!(
                    "Network: {}\nPriority Fee: {} micro-lamports",
                    network,
                    0 // Would be populated from actual network data
                );

                if let Some(llm) = state.llm_service.as_deref() {
                    match llm.explain_transaction(logs.clone(), meta_data, network_metrics).await {
                        Ok(explanation) => {
                            debug!("Using LLM diagnostic analysis");
                            (
                                Some(explanation.error_code),
                                explanation.plain_english,
                                explanation.fix_suggestion,
                                explanation.risk_level,
                                explanation.economic_context,
                            )
                        }
                        Err(e) => {
                            warn!("LLM explanation failed, falling back to rule-based: {}", e);
                            let (code, explanation, fix) = classify_transaction_error(error);
                            (code, explanation, fix, "Low".to_string(), "Unable to determine".to_string())
                        }
                    }
                } else {
                    let (code, explanation, fix) = classify_transaction_error(error);
                    (code, explanation, fix, "Low".to_string(), "LLM not available".to_string())
                }
            } else {
                (
                    None,
                    "Transaction executed successfully".to_string(),
                    "No fix needed - the transaction was successful.".to_string(),
                    "Low".to_string(),
                    "Transaction was successful".to_string(),
                )
            }
        }
        Err(error) => {
            let error_str = error.to_string().to_lowercase();
            let (status, code, message) = if error_str.contains("not found") || error_str.contains("skip") {
                (StatusCode::NOT_FOUND, "TX_NOT_FOUND", "transaction not found on the specified network")
            } else if error_str.contains("timeout") || error_str.contains("request") {
                (StatusCode::GATEWAY_TIMEOUT, "RPC_TIMEOUT", "RPC request timed out - please try again")
            } else if error_str.contains("429") || error_str.contains("rate limit") {
                (StatusCode::TOO_MANY_REQUESTS, "RATE_LIMIT_EXCEEDED", "RPC rate limit exceeded - please try again later")
            } else {
                (StatusCode::BAD_GATEWAY, "RPC_ERROR", "failed to fetch transaction from RPC")
            };

            warn!(tx_hash = %tx_hash, error = %error, "rpc error");
            return Err((
                status,
                Json(serde_json::json!({
                    "error": message,
                    "code": code,
                    "hint": "check that the transaction exists on the specified network"
                })),
            ));
        }
    };

    let now = current_unix_timestamp_secs();
    let created_at = chrono_timestamp_to_rfc3339(now);
    let share_url = format!("/s/{}", tx_hash_lower);

    let response = ExplainResponse {
        hash: tx_hash_lower,
        network: network.to_string(),
        error_code,
        plain_english,
        fix_suggestion,
        risk_level,
        economic_context,
        viewed_count: 0,
        created_at,
        share_url,
    };

    // Store in cache
    {
        let mut cache = state.explain_cache.write().await;
        cache.insert(cache_key, (response.clone(), Instant::now()));
    }

    Ok(Json(response))
}

#[derive(Debug, Deserialize)]
struct CheckoutRequest {
    plan: String,
    email: String,
}

#[derive(Debug, Serialize)]
struct CheckoutResponse {
    checkout_url: String,
}

async fn checkout_handler(
    State(state): State<AppState>,
    Json(req): Json<CheckoutRequest>,
) -> Result<Json<CheckoutResponse>, (StatusCode, Json<serde_json::Value>)> {
    let stripe = match &state.stripe_service {
        Some(s) => s,
        None => {
            return Err((
                StatusCode::SERVICE_UNAVAILABLE,
                Json(serde_json::json!({
                    "error": "billing not available",
                    "message": "Stripe service is not configured"
                })),
            ));
        }
    };

    let user_id = uuid::Uuid::new_v4().to_string();
    let success_url = format!("{}/app?upgrade=success", env::var("FRONTEND_URL").unwrap_or_else(|_| "http://localhost:3000".to_string()));
    let cancel_url = format!("{}/app?upgrade=cancelled", env::var("FRONTEND_URL").unwrap_or_else(|_| "http://localhost:3000".to_string()));

    match stripe.create_checkout_session(&user_id, &req.email, &req.plan, &success_url, &cancel_url).await {
        Ok(url) => {
            info!(plan = %req.plan, "created checkout session");
            Ok(Json(CheckoutResponse { checkout_url: url }))
        }
        Err(e) => {
            error!(error = %e, "failed to create checkout session");
            Err((
                StatusCode::INTERNAL_SERVER_ERROR,
                Json(serde_json::json!({
                    "error": "checkout failed",
                    "message": e.to_string()
                })),
            ))
        }
    }
}

async fn portal_handler(
    State(state): State<AppState>,
    Json(customer_id): Json<serde_json::Value>,
) -> Result<Json<CheckoutResponse>, (StatusCode, Json<serde_json::Value>)> {
    let stripe = match &state.stripe_service {
        Some(s) => s,
        None => {
            return Err((
                StatusCode::SERVICE_UNAVAILABLE,
                Json(serde_json::json!({
                    "error": "billing not available",
                    "message": "Stripe service is not configured"
                })),
            ));
        }
    };

    let customer_id_str = customer_id.as_str().unwrap_or("");
    let return_url = env::var("FRONTEND_URL").unwrap_or_else(|_| "http://localhost:3000".to_string());

    match stripe.create_portal_session(customer_id_str, &return_url).await {
        Ok(url) => {
            Ok(Json(CheckoutResponse { checkout_url: url }))
        }
        Err(e) => {
            error!(error = %e, "failed to create portal session");
            Err((
                StatusCode::INTERNAL_SERVER_ERROR,
                Json(serde_json::json!({
                    "error": "portal failed",
                    "message": e.to_string()
                })),
            ))
        }
    }
}

#[derive(Debug, Serialize)]
struct UsageResponse {
    plan: String,
    usage_count: i32,
    limit: i32,
}

async fn usage_handler(
    State(state): State<AppState>,
) -> Result<Json<UsageResponse>, (StatusCode, Json<serde_json::Value>)> {
    // For now, return mock data - in production would check DB for user
    let plan = "free";
    let usage_count = 0;
    let limit = 100;

    Ok(Json(UsageResponse {
        plan: plan.to_string(),
        usage_count,
        limit,
    }))
}

fn classify_transaction_error<T: std::fmt::Display>(error: &T) -> (Option<String>, String, String) {
    let error_str = error.to_string();

    if error_str.contains("\"Code\":") || error_str.contains("\"code\":") {
        if let Ok(json) = serde_json::Value::from_str(&error_str) {
            if let Some(obj) = json.as_object() {
                if let Some(code) = obj.get("Code").or(obj.get("code")).and_then(|v| v.as_i64()) {
                    let (plain_english, fix_suggestion) = match code {
                        6001 => (
                            "The program ran out of compute units before completing.".to_string(),
                            "Optimize your instruction logic or reduce the number of accounts processed. Consider breaking up the operation into multiple transactions.".to_string(),
                        ),
                        6002 => (
                            "The transaction attempted to write to an account that is read-only.".to_string(),
                            "Remove any write operations to this account or use a writable account for the data.".to_string(),
                        ),
                        6003 => (
                            "The transaction exceeded the maximum allowed compute unit limit.".to_string(),
                            "Reduce computation in your program or request a higher compute limit.".to_string(),
                        ),
                        6004 => (
                            "The PDA derived does not match the seeds provided.".to_string(),
                            "Verify that your seed derivation uses the correct program ID and seed order.".to_string(),
                        ),
                        6005 => (
                            "An account was not initialized but is required by the instruction.".to_string(),
                            "Initialize the account before using it, or use the correct initialization instruction.".to_string(),
                        ),
                        _ => (
                            format!("Transaction failed with error code: {}", code),
                            "Review the program logs for more details on the specific failure.".to_string(),
                        ),
                    };
                    return (Some(format!("AnchorError::{}", code)), plain_english, fix_suggestion);
                }
            }
        }
    }

    if error_str.contains("insufficient funds") || error_str.to_lowercase().contains("insufficient") {
        (
            Some("InsufficientFunds".to_string()),
            "The source account does not have enough SOL to complete the transaction.".to_string(),
            "Add more SOL to the source wallet or reduce the transfer amount.".to_string(),
        )
    } else if error_str.contains("block height") || error_str.contains("timeout") {
        (
            Some("TransactionExpired".to_string()),
            "The transaction was not confirmed within the expected time window.".to_string(),
            "Retry the transaction with a higher priority fee to increase confirmation speed.".to_string(),
        )
    } else if error_str.contains("signature") {
        (
            Some("InvalidSignature".to_string()),
            "The transaction signature could not be verified.".to_string(),
            "Ensure you are signing with the correct wallet and the transaction is not malformed.".to_string(),
        )
    } else {
        (
            Some("TransactionError".to_string()),
            format!("Transaction failed: {}", error_str),
            "Review the full error message for debugging steps.".to_string(),
        )
    }
}

fn chrono_timestamp_to_rfc3339(timestamp_secs: u64) -> String {
    let datetime = chrono::DateTime::from_timestamp(timestamp_secs as i64, 0)
        .unwrap_or_else(|| {
            chrono::DateTime::from_timestamp(0, 0).unwrap()
        });
    datetime.to_rfc3339()
}

fn is_valid_network(network: &str) -> bool {
    matches!(network, "mainnet-beta" | "devnet" | "testnet")
}

fn is_valid_base58(s: &str) -> bool {
    !s.is_empty() && s.bytes().all(|b| {
        (b >= b'A' && b <= b'Z')
            || (b >= b'a' && b <= b'z')
            || (b >= b'1' && b <= b'9')
            || b == b'4' || b == b'5' || b == b'6' || b == b'7' || b == b'8' || b == b'9'
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
