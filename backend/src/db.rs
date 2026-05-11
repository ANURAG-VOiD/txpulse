use sqlx::{postgres::PgPoolOptions, PgPool, Row};
use std::time::Duration;
use tracing::{info, error};

pub async fn create_pool(database_url: &str) -> Result<PgPool, sqlx::Error> {
    let pool = PgPoolOptions::new()
        .max_lifetime(Duration::from_secs(30 * 60))
        .acquire_timeout(Duration::from_secs(10))
        .connect(database_url)
        .await?;

    info!("Database pool created successfully");
    Ok(pool)
}

pub async fn run_migrations(pool: &PgPool) -> Result<(), sqlx::Error> {
    // Create decoded_txs table
    sqlx::query(
        r#"
        CREATE TABLE IF NOT EXISTS decoded_txs (
            hash TEXT PRIMARY KEY,
            network TEXT NOT NULL,
            error_code TEXT,
            plain_english TEXT NOT NULL,
            fix_suggestion TEXT NOT NULL,
            risk_level TEXT DEFAULT 'Low',
            economic_context TEXT,
            viewed_count BIGINT DEFAULT 0,
            created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
        )
        "#,
    )
    .execute(pool)
    .await?;

    // Create users table
    sqlx::query(
        r#"
        CREATE TABLE IF NOT EXISTS users (
            id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
            email TEXT UNIQUE NOT NULL,
            stripe_customer_id TEXT,
            plan TEXT NOT NULL DEFAULT 'free' CHECK (plan IN ('free', 'pro', 'team')),
            usage_count INTEGER DEFAULT 0,
            created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
            updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
        )
        "#,
    )
    .execute(pool)
    .await?;

    // Create usage table
    sqlx::query(
        r#"
        CREATE TABLE IF NOT EXISTS usage_events (
            id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
            user_id UUID REFERENCES users(id),
            tx_hash TEXT NOT NULL,
            network TEXT NOT NULL,
            timestamp TIMESTAMPTZ NOT NULL DEFAULT NOW()
        )
        "#,
    )
    .execute(pool)
    .await?;

    // Create index on usage timestamp
    sqlx::query(
        "CREATE INDEX IF NOT EXISTS idx_usage_timestamp ON usage_events(timestamp)"
    )
    .execute(pool)
    .await?;

    info!("Database migrations completed");
    Ok(())
}

// Database operations
pub async fn save_decoded_tx(
    pool: &PgPool,
    hash: &str,
    network: &str,
    error_code: Option<&str>,
    plain_english: &str,
    fix_suggestion: &str,
    risk_level: &str,
    economic_context: Option<&str>,
) -> Result<(), sqlx::Error> {
    sqlx::query(
        r#"
        INSERT INTO decoded_txs (hash, network, error_code, plain_english, fix_suggestion, risk_level, economic_context, viewed_count)
        VALUES ($1, $2, $3, $4, $5, $6, $7, 1)
        ON CONFLICT (hash) DO UPDATE SET
            viewed_count = decoded_txs.viewed_count + 1
        "#,
    )
    .bind(hash)
    .bind(network)
    .bind(error_code)
    .bind(plain_english)
    .bind(fix_suggestion)
    .bind(risk_level)
    .bind(economic_context)
    .execute(pool)
    .await?;

    Ok(())
}

pub async fn get_decoded_tx(pool: &PgPool, hash: &str) -> Result<Option<DecodedTx>, sqlx::Error> {
    let row = sqlx::query_as::<_, DecodedTxRow>(
        "SELECT hash, network, error_code, plain_english, fix_suggestion, risk_level, economic_context, viewed_count, created_at FROM decoded_txs WHERE hash = $1"
    )
    .bind(hash)
    .fetch_optional(pool)
    .await?;

    Ok(row.map(|r| DecodedTx {
        hash: r.hash,
        network: r.network,
        error_code: r.error_code,
        plain_english: r.plain_english,
        fix_suggestion: r.fix_suggestion,
        risk_level: r.risk_level,
        economic_context: r.economic_context,
        viewed_count: r.viewed_count,
        created_at: r.created_at.to_rfc3339(),
    }))
}

pub async fn log_usage_event(
    pool: &PgPool,
    user_id: Option<&str>,
    tx_hash: &str,
    network: &str,
) -> Result<(), sqlx::Error> {
    sqlx::query(
        "INSERT INTO usage_events (user_id, tx_hash, network) VALUES ($1, $2, $3)"
    )
    .bind(user_id)
    .bind(tx_hash)
    .bind(network)
    .execute(pool)
    .await?;

    Ok(())
}

pub async fn get_user_usage_count(pool: &PgPool, user_id: &str) -> Result<i32, sqlx::Error> {
    let row: (i32,) = sqlx::query_as(
        "SELECT COALESCE(SUM(1), 0)::int FROM usage_events WHERE user_id = $1"
    )
    .bind(user_id)
    .fetch_one(pool)
    .await?;

    Ok(row.0)
}

pub async fn get_plan_limits(pool: &PgPool, plan: &str) -> Result<PlanLimits, sqlx::Error> {
    let limits = match plan {
        "pro" => PlanLimits { monthly_explains: 10000 },
        "team" => PlanLimits { monthly_explains: 100000 },
        _ => PlanLimits { monthly_explains: 100 }, // free tier
    };
    Ok(limits)
}

#[derive(Debug, Clone)]
pub struct DecodedTx {
    pub hash: String,
    pub network: String,
    pub error_code: Option<String>,
    pub plain_english: String,
    pub fix_suggestion: String,
    pub risk_level: String,
    pub economic_context: Option<String>,
    pub viewed_count: i64,
    pub created_at: String,
}

#[derive(sqlx::FromRow)]
struct DecodedTxRow {
    hash: String,
    network: String,
    error_code: Option<String>,
    plain_english: String,
    fix_suggestion: String,
    risk_level: String,
    economic_context: Option<String>,
    viewed_count: i64,
    created_at: chrono::DateTime<chrono::Utc>,
}

pub struct PlanLimits {
    pub monthly_explains: i32,
}