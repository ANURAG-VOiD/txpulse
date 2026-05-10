use anyhow::{Context, Result};
use reqwest::Client;
use serde::{Deserialize, Serialize};
use std::env;
use std::time::Duration;
use tracing::{debug, error, info, warn};

#[derive(Clone)]
pub struct LlmService {
    client: Client,
    api_key: String,
    base_url: String,
    model: String,
    timeout_secs: u64,
}

#[derive(Debug, Serialize)]
struct ClaudeRequest {
    model: String,
    max_tokens: u32,
    messages: Vec<Message>,
    system: String,
}

#[derive(Debug, Serialize)]
struct Message {
    role: String,
    content: String,
}

#[derive(Debug, Deserialize)]
struct ClaudeResponse {
    content: Vec<Content>,
    #[serde(rename = "stop_reason")]
    stop_reason: Option<String>,
}

#[derive(Debug, Deserialize)]
struct Content {
    text: String,
}

#[derive(Debug, Serialize, Deserialize, Clone)]
pub struct LlmExplanation {
    pub error_code: String,
    pub plain_english: String,
    pub fix_suggestion: String,
    pub risk_level: String,
    pub economic_context: String,
}

impl Default for LlmExplanation {
    fn default() -> Self {
        LlmExplanation {
            error_code: "Unknown".to_string(),
            plain_english: "Unable to analyze transaction failure".to_string(),
            fix_suggestion: "Check program logs using 'solana confirm -v'".to_string(),
            risk_level: "Low".to_string(),
            economic_context: "Unable to determine economic context".to_string(),
        }
    }
}

#[derive(Debug, Serialize)]
pub struct LlmServiceStatus {
    pub available: bool,
    pub model: String,
    pub timeout_secs: u64,
}

impl LlmService {
    pub fn new() -> Result<Self> {
        let api_key = env::var("ANTHROPIC_API_KEY")
            .context("ANTHROPIC_API_KEY environment variable not set")?;

        let timeout_secs = env::var("LLM_TIMEOUT_SECS")
            .unwrap_or_else(|_| "30".to_string())
            .parse()
            .unwrap_or(30);

        let model = env::var("LLM_MODEL")
            .unwrap_or_else(|_| "claude-3-5-sonnet-20241022".to_string());

        Ok(Self {
            client: Client::builder()
                .timeout(Duration::from_secs(timeout_secs))
                .build()
                .context("failed to build HTTP client")?,
            api_key,
            base_url: "https://api.anthropic.com".to_string(),
            model,
            timeout_secs,
        })
    }

    pub fn is_available(&self) -> bool {
        !self.api_key.is_empty()
    }

    pub fn status(&self) -> LlmServiceStatus {
        LlmServiceStatus {
            available: self.is_available(),
            model: self.model.clone(),
            timeout_secs: self.timeout_secs,
        }
    }

    pub async fn explain_transaction(
        &self,
        logs: Vec<String>,
        meta_data: String,
        network_metrics: String,
    ) -> Result<LlmExplanation> {
        let system_prompt = r#"You are the TxPulse Reasoning Engine, a specialized Solana SVM diagnostic tool.
Your goal is to transform raw RPC data into developer-ready insights.

### CORE TASKS:
1. DIAGNOSTIC: Analyze transaction logs and error codes. Even if an Anchor IDL is missing, use the log trace to identify failures (e.g., custom program errors, slippage, or rent issues).
2. ECONOMIC: Compare the transaction's priority fee and compute units against current network conditions to see if the failure was due to congestion or insufficient fees.
3. SECURITY: Scan pre/post account state changes for "drainer" patterns or high-risk movements (e.g., a user sending a high-value NFT for 0 SOL).

### RESPONSE RULES:
- You MUST respond ONLY with a raw JSON object. No prose before or after.
- If a fix is unknown, provide a general debugging step (e.g., "Check program logs using 'solana confirm -v'").
- Tone: Technical, concise, and actionable.

### JSON SCHEMA:
{
  "error_code": "String (e.g., 'Anchor::ConstraintSeeds' or 'Custom(0x1)')",
  "plain_english": "A 1-2 sentence explanation of WHAT happened and WHY.",
  "fix_suggestion": "A concrete, code-level or parameter-level change the dev can make.",
  "risk_level": "Low | Medium | High (based on security scan)",
  "economic_context": "Brief note on if the priority fee was sufficient for current network load."
}"#;

        let user_prompt = format!(
            "--- TRANSACTION LOGS ---\n{}\n\n\
             --- METADATA (Pre/Post Balances) ---\n{}\n\n\
             --- CURRENT NETWORK METRICS ---\n{}\n\n\
             Analyze this failure and return ONLY the raw JSON object following the schema above.",
            logs.join("\n"),
            meta_data,
            network_metrics
        );

        let request = ClaudeRequest {
            model: self.model.clone(),
            max_tokens: 1500,
            messages: vec![Message {
                role: "user".to_string(),
                content: user_prompt,
            }],
            system: system_prompt.to_string(),
        };

        debug!("Sending LLM diagnostic request");

        let response = self
            .client
            .post(&format!("{}/v1/messages", self.base_url))
            .header("x-api-key", &self.api_key)
            .header("anthropic-version", "2023-06-01")
            .header("content-type", "application/json")
            .json(&request)
            .send()
            .await
            .context("Failed to send request to Claude API")?;

        if !response.status().is_success() {
            let status = response.status();
            let error_text = response.text().await.unwrap_or_default();
            error!("Claude API error: {} - {}", status, error_text);
            return Err(anyhow::anyhow!("LLM API error: {}", status));
        }

        let claude_response: ClaudeResponse = response
            .json()
            .await
            .context("Failed to parse Claude API response")?;

        let explanation_text = claude_response
            .content
            .first()
            .map(|c| c.text.clone())
            .unwrap_or_else(|| "Unable to generate explanation".to_string());

        // Parse the JSON response from LLM
        let parsed = self.parse_llm_response(&explanation_text);

        info!("Generated LLM diagnostic analysis");
        Ok(parsed)
    }

    fn parse_llm_response(&self, response: &str) -> LlmExplanation {
        // Try to parse as JSON
        if let Ok(explanation) = serde_json::from_str::<LlmExplanation>(response) {
            return explanation;
        }

        // Try to extract JSON from markdown code block
        if let Some(start) = response.find("```json") {
            if let Some(end) = response[start + 7..].find("```") {
                let json_str = &response[start + 7..start + 7 + end];
                if let Ok(explanation) = serde_json::from_str::<LlmExplanation>(json_str) {
                    return explanation;
                }
            }
        }

        // Try to extract JSON from curly braces
        if let Some(start) = response.find('{') {
            if let Some(end) = response.rfind('}') {
                let json_str = &response[start..=end];
                if let Ok(explanation) = serde_json::from_str::<LlmExplanation>(json_str) {
                    return explanation;
                }
            }
        }

        // Fallback: return default
        warn!("Failed to parse LLM response as JSON, using default");
        LlmExplanation::default()
    }

    pub async fn health_check(&self) -> Result<bool> {
        // Simple health check - try to make a minimal request
        let request = ClaudeRequest {
            model: self.model.clone(),
            max_tokens: 10,
            messages: vec![Message {
                role: "user".to_string(),
                content: "Hello".to_string(),
            }],
            system: "You are a helpful assistant.".to_string(),
        };

        let response = self
            .client
            .post(&format!("{}/v1/messages", self.base_url))
            .header("x-api-key", &self.api_key)
            .header("anthropic-version", "2023-06-01")
            .header("content-type", "application/json")
            .json(&request)
            .timeout(std::time::Duration::from_secs(5))
            .send()
            .await;

        match response {
            Ok(resp) if resp.status().is_success() => Ok(true),
            _ => Ok(false),
        }
    }
}