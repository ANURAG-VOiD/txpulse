# System Design Architecture: TxPulse

## 1. Product Vision

TxPulse is a transaction reliability platform for Solana developers.

The product solves two core problems in one place:

1. Real-time transaction health monitoring for wallets and programs.
2. Failed transaction diagnosis with plain-English explanations and fix guidance.

Positioning statement:

"Paste a failed Solana transaction hash. Get a plain-English explanation of exactly what went wrong and how to fix it. For developers, by a developer."

### Right Mental Model

Do not position TxPulse as a broad toolkit. Position it as Solana developer mission control.

One screen. Two modes:

1. **Watch mode:** live transaction feed for any wallet/program.
2. **Understand mode:** click any failed transaction and get instant plain-English decode.

This is the product. Additional surfaces are future phases, not current pitch.

## 2. Problem Statement

Today, teams debug reliability issues across fragmented tools: block explorers, raw RPC logs, alerts, and ad-hoc scripts. This slows incident response and increases time-to-fix.

TxPulse unifies detection, diagnosis, and remediation guidance into one workflow.

## 3. Product Goals

1. Reduce mean-time-to-diagnosis for failed Solana transactions.
2. Provide reliable, low-friction live observability.
3. Translate low-level runtime/program errors into actionable next steps.
4. Enable team collaboration with shareable diagnostic URLs.

## 4. System Architecture Overview

TxPulse uses a two-tier architecture:

1. Next.js frontend for monitoring and explainer UX.
2. Rust backend (Axum + Tokio) for RPC fan-in, processing, and API delivery.

All client traffic goes through the backend. The browser does not connect directly to RPC providers in production mode.

### Why this architecture

- Centralizes RPC retries, throttling, and error handling.
- Prevents API key exposure in browser clients.
- Supports deterministic decoding/classification logic.
- Creates a clean path to usage metering and billing gates.

## 5. Core Interaction Architecture

### 5.1 One-Screen Interaction

The primary app experience is a unified workspace:

1. Left/main area: live transaction feed and metrics (Watch mode).
2. Right panel: transaction debugger (Understand mode).

Interaction contract:

1. User watches feed.
2. User clicks failed transaction row.
3. Right panel immediately renders decode, error explanation, and fix suggestion.

No navigation or context switch should be required for this core flow.

### 5.2 Standalone Debugger Entry

The debugger must also be available as a direct route/tab (for inbound users who start from a shared decode or social post). It cannot be gated behind first opening monitor mode.

Required standalone entry:

- `/explain`

Optional share-driven entry:

- `/s/[hash]`

## 6. Component Breakdown

### A. Frontend Layer (Next.js 14, React, TypeScript)

- App routes:
  - `/app`: live reliability dashboard.
  - `/explain`: hash input and decode trigger.
  - `/explain/[hash]`: canonical explain result page.
  - `/s/[hash]`: share-friendly public result path.
- Core UX modules:
  - monitor input + metrics cards + transaction feed.
  - integrated failed tx explainer side panel.
  - share link + copy actions.
  - billing/upgrade surfaces.

### B. Backend Layer (Rust, Axum, Tokio)

- Monitoring pipeline:
  - consume `logsSubscribe` stream.
  - enrich signatures via `getTransaction`.
  - compute metrics and broadcast updates.
- Explainer pipeline:
  - fetch tx by hash.
  - decode instructions (Anchor IDL-aware when available).
  - classify error code/category.
  - generate fix suggestion.
  - persist + return explain response.
- Platform services:
  - usage metering.
  - Stripe plan enforcement.
  - share URL lookup.

### C. Integrations

- RPC: Helius (primary), QuickNode (optional fallback strategy).
- Decoder enrichment: Anchor IDL registry/cache.
- Billing: Stripe.
- Optional channel: Discord command that links to explain URLs.

## 7. Core Data Flows

### 6.1 Live Monitoring Flow

1. User enters wallet/program address.
2. Frontend opens websocket to backend monitor endpoint.
3. Backend subscribes to logs for address mention filters.
4. On each event, backend fetches transaction data and computes metrics.
5. Backend emits `NEW_TRANSACTION` and periodic `METRICS_UPDATE` payloads.
6. Frontend updates charts/feed in real time.

### 6.2 Failed Transaction Explainer Flow

1. User pastes transaction hash.
2. Frontend calls `GET /explain/:tx_hash?network=mainnet-beta`.
3. Backend fetches full transaction from Helius.
4. Decoder resolves instructions and Anchor context where possible.
5. Error classifier maps to normalized code + plain-English explanation.
6. Suggestion engine produces actionable fix guidance.
7. Result is persisted in `decoded_txs` and usage is logged.
8. Frontend renders explanation and offers share URL.

### 6.3 Unified Watch -> Understand Flow

1. Feed receives failed transaction event.
2. User clicks failed row.
3. Frontend calls explainer endpoint for the selected hash.
4. Right panel updates in-place with decode/explanation/fix guidance.
5. User can copy share URL or open full debugger route.

## 8. Data Model

### `decoded_txs`

| Column | Type | Notes |
|---|---|---|
| `hash` | text (pk) | tx signature/hash |
| `network` | text | `mainnet-beta`, `devnet` |
| `error_code` | text nullable | normalized runtime/program code |
| `plain_english` | text | human explanation |
| `fix_suggestion` | text | recommended remediation |
| `viewed_count` | bigint | share/result view counter |
| `created_at` | timestamptz | first decode timestamp |

### `users`

| Column | Type | Notes |
|---|---|---|
| `id` | uuid (pk) | internal user id |
| `email` | text unique | identity/contact |
| `stripe_id` | text nullable | stripe customer id |
| `plan` | text | `free`, `pro`, `team` |

### `usage`

| Column | Type | Notes |
|---|---|---|
| `user_id` | uuid | fk to users |
| `tx_hash` | text | requested hash |
| `timestamp` | timestamptz | usage event time |

## 9. API Contracts

### 8.1 Monitoring Stream Payloads

#### `NEW_TRANSACTION`

```json
{
  "type": "NEW_TRANSACTION",
  "data": {
    "signature": "5Q...xyz",
    "status": "success",
    "timestamp": 1712000000,
    "computeUnitsConsumed": 15400,
    "priorityFeeMicrolamports": 5000,
    "confirmationLatencyMs": 850,
    "slot": 254123999
  }
}
```

#### `METRICS_UPDATE`

```json
{
  "type": "METRICS_UPDATE",
  "data": {
    "successRatePct": 98.5,
    "avgConfirmationMs": 920,
    "currentSlotLag": 2
  }
}
```

### 8.2 Explainer Endpoint

#### `GET /explain/:tx_hash?network=mainnet-beta`

```json
{
  "hash": "5Q...xyz",
  "network": "mainnet-beta",
  "error_code": "AnchorError::ConstraintSeeds",
  "plain_english": "The PDA account does not match the seeds expected by the program.",
  "fix_suggestion": "Recompute PDA seeds on the client and ensure seed order and program ID are correct.",
  "viewed_count": 12,
  "created_at": "2026-04-15T11:21:12Z",
  "share_url": "/s/5Q...xyz"
}
```

### 8.3 Other Product Endpoints

- `GET /s/:hash` for shareable public explain pages.
- `POST /api/billing/checkout` for Stripe checkout session creation.

## 10. Scope and Positioning Constraints

1. Pitch stays focused on one sentence: watch every transaction in real time, and explain in plain English why failures happened.
2. Do not market as a full "Solana dev toolkit" at this stage.
3. Avoid adding unrelated tabs/features before core watch-understand loop is polished.

### Sequencing Rule

- Alerts fits naturally as the third capability after watch and understand.
- Product sequence: Watch -> Understand -> Get notified.
- Alerts is explicitly phase 3, not phase 1.

## 11. Non-Functional Requirements

### Reliability

- WebSocket reconnect/backoff for monitor sessions.
- RPC retry/backoff and timeout control for `getTransaction`.
- Graceful degradation when optional decode metadata is missing.

### Performance

- Keep monitor event handling non-blocking with async tasks/channels.
- Bound memory for rolling metrics and active connection maps.
- Cache decoded explain results for repeat hash lookups.

### Security

- No client-side RPC API keys.
- Validate input formats (pubkey/tx hash/network).
- Plan-aware limits via usage metering and Stripe-backed access control.

### Observability

- Structured logs for RPC errors, decode failures, and disconnects.
- Track explainer request volume and top error categories.

## 12. Deployment Topology

- Frontend: Vercel.
- Backend: Dockerized Rust service on Fly.io/Render/Railway/AWS.
- Data store: Postgres (for decoded results, users, usage).

Required runtime configuration:

- `HELIUS_HTTP_URL`
- `HELIUS_WS_URL`
- `SERVER_HOST`
- `SERVER_PORT`
- `RUST_LOG`
- `NEXT_PUBLIC_WS_URL`
- `NEXT_PUBLIC_API_BASE_URL`

## 13. Current Status and Mainnet Path

### Current status

- Live monitoring pipeline is active in dev/prototype environments.
- Product-level explainer contracts, scope, and data model are defined.

### Mainnet blockers

1. Hardening reconnect/backoff and timeout behavior.
2. Full error-classifier coverage for common failure families.
3. Plan-aware metering and billing enforcement.
4. Production observability and alerting.

### Launch milestones

1. Helius integration hardened for sustained websocket + HTTP load.
2. Mainnet-ready one-screen watch-understand flow.
3. Production hardening and billing integration.
4. Public launch with shareable explain URLs.

### Near-Term Execution Plan (Two Weeks)

Week 1:

1. Ship debugger pipeline.
2. Integrate debugger directly into feed click interactions.
3. Ensure right-panel decode is reliable and fast.

Week 2:

1. Polish onboarding and first-run UX.
2. Improve decode clarity and suggestion quality.
3. Validate with at least 5 active users.

## 14. Risks and Mitigations

- RPC variance across providers:
  - Mitigation: Helius primary configuration, fallback abstraction for secondary providers.
- Incomplete decode context for non-Anchor/custom programs:
  - Mitigation: deterministic fallback classifier and transparent confidence labeling.
- High-traffic addresses causing burst pressure:
  - Mitigation: bounded queues, backpressure, and dedupe in streaming pipeline.

## 15. Future Extensions

- Multi-address team dashboards.
- Alerting (email/Telegram/Discord) as the third major product capability.
- Historical analytics and trend summaries.
- Public API for exporting reliability and explain insights.
