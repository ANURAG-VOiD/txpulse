# TxPulse

![License](https://img.shields.io/badge/License-MIT-green?style=flat-square)
![Next.js](https://img.shields.io/badge/Next.js-14-black?style=flat-square&logo=next.js)
![TypeScript](https://img.shields.io/badge/TypeScript-007ACC?style=flat-square&logo=typescript&logoColor=white)
![Rust](https://img.shields.io/badge/Rust-Backend-CE412B?style=flat-square&logo=rust)
![Solana](https://img.shields.io/badge/Solana-RPC-14F195?style=flat-square&logo=solana&logoColor=black)
![PRs Welcome](https://img.shields.io/badge/PRs-Welcome-brightgreen?style=flat-square)

TxPulse is a Solana developer product for transaction reliability. It solves two core problems in one workflow: real-time transaction health monitoring and failed-transaction root-cause explanation with actionable fixes.

All RPC traffic is proxied through a high-throughput Rust middleware, which means no client-side rate limiting and no API keys exposed to the browser.


## Table of Contents

- [Overview](#overview)
- [Problem Statement](#problem-statement)
- [Architecture](#architecture)
- [Failed Transaction Explainer](#failed-transaction-explainer)
- [Core API Surface](#core-api-surface)
- [Tech Stack](#tech-stack)
- [Getting Started](#getting-started)
- [Environment Variables](#environment-variables)
- [Project Structure](#project-structure)
- [Contributing](#contributing)
- [License](#license)


## Overview

TxPulse gives Solana developers a single place to diagnose and improve transaction reliability. The product is built around two primary use cases:

1. Monitor transaction health in real time for any wallet or program address.
2. Explain failed transactions in plain English and suggest concrete fixes.

The frontend connects to a local Rust server over WebSocket. The Rust server handles Solana RPC subscriptions, computes confirmation latency and priority fees, and powers transaction decode/explanation flows.

## Problem Statement

Solana teams usually debug transaction reliability across multiple disconnected tools: explorers, custom logs, RPC dashboards, and internal scripts. This creates slow incident response and unclear ownership when transactions fail under production load.

TxPulse addresses this with one product surface:

1. Observe reliability in real time.
2. Explain failures in plain English with suggested fixes.


## Architecture

The system operates on a two-tier model.

1. The Next.js frontend establishes a single WebSocket connection to the Rust backend.
2. The Rust backend opens a `logsSubscribe` WebSocket connection to the Helius RPC for the requested address.
3. On each log trigger, Rust fetches the full transaction data via HTTP, calculates confirmation latency and priority fees, and broadcasts a lightweight JSON payload to the frontend.

## Failed Transaction Explainer

Positioning statement:

"Paste a failed Solana transaction hash. Get a plain-English explanation of exactly what went wrong and how to fix it. For developers, by a developer."

TxPulse includes a built-in failed-transaction explainer experience alongside live monitoring.

### Product Scope

- Input field for a transaction hash.
- Solana RPC integration to fetch full transaction data (`getTransaction`).
- Instruction decoder (Anchor IDL-aware where available).
- Error classifier that maps known program/runtime error codes to human-readable explanations.
- Fix suggestion engine using pattern-matched remediation guidance.
- Simple web UI with a shareable result URL.

### Product Principle

Every failed transaction explanation should answer three questions in under 30 seconds:

1. What failed?
2. Why did it fail?
3. What should I change next?

### Integrations

- Solana RPC provider: Helius or QuickNode (recommended for reliability).
- Anchor IDL registry/source for instruction and error decoding.
- Stripe for billing and plan limits.
- Optional: Discord bot command for quick transaction explain lookup.

### Data Model

#### `decoded_txs`

| Column | Type | Purpose |
|---|---|---|
| `hash` | text (pk) | Solana transaction signature/hash |
| `network` | text | `mainnet-beta`, `devnet`, etc. |
| `error_code` | text nullable | Normalized error code (if available) |
| `plain_english` | text | Human explanation of what failed |
| `fix_suggestion` | text | Suggested next action to fix issue |
| `viewed_count` | bigint | Popularity/usage counter |
| `created_at` | timestamptz | First decode timestamp |

#### `users`

| Column | Type | Purpose |
|---|---|---|
| `id` | uuid (pk) | Internal user id |
| `email` | text unique | Login/contact |
| `stripe_id` | text nullable | Stripe customer id |
| `plan` | text | `free`, `pro`, `team` |

#### `usage`

| Column | Type | Purpose |
|---|---|---|
| `user_id` | uuid | FK to `users.id` |
| `tx_hash` | text | Queried tx hash |
| `timestamp` | timestamptz | Access time |

## Core API Surface

- `GET /explain/:tx_hash?network=mainnet-beta`
- `GET /s/:hash` (shareable short/public result link)
- `POST /api/billing/checkout` (Stripe checkout session)

### Example Explainer Response

```json
{
	"hash": "5Q...xyz",
	"network": "mainnet-beta",
	"error_code": "AnchorError::ConstraintSeeds",
	"plain_english": "The PDA account does not match the seeds expected by the program.",
	"fix_suggestion": "Recompute PDA seeds on the client and ensure program ID and seed order match exactly.",
	"share_url": "/s/5Q...xyz"
}
```

### Product Build Plan

1. RPC retrieval and decode pipeline.
2. Error classification + fix suggestion dictionary.
3. UI for hash input and explanation rendering.
4. Persist decoded results and usage analytics.
5. Shareable URL and Stripe gating.
6. Optional Discord command.


## Tech Stack

**Frontend**
- Next.js 14 (App Router)
- React, TypeScript, Tailwind CSS
- Aceternity UI, Framer Motion, Recharts

**Backend**
- Rust, Axum, Tokio
- Solana SDK, Helius RPC


## Getting Started

### Prerequisites

- Node.js v18 or higher
- Rust stable toolchain via [rustup](https://rustup.rs)
- Git

### 1. Clone the Repository

```bash
git clone https://github.com/TxPulse/txpulse.git
cd txpulse
```

### 2. Start the Rust Backend

```bash
cd backend
cargo build
cargo run
```

The Axum server runs on port 3000 by default. You can change this via `SERVER_PORT`.

### 3. Start the Next.js Frontend

Open a new terminal window:

```bash
cd frontend
yarn install
yarn dev
```

The frontend will be available at `http://localhost:3001`. If port 3000 is occupied by the backend, Next.js will automatically use the next available port.

Both servers must be running at the same time for the live feed to work.


## Environment Variables

Create a `.env` file in the `backend/` directory and a `.env.local` file in the `frontend/` directory.

### backend/.env

| Variable | Description |
|---|---|
| `HELIUS_HTTP_URL` | Your Helius HTTP RPC endpoint (required) |
| `HELIUS_WS_URL` | Your Helius WebSocket endpoint (reserved for WS subscription mode) |
| `SERVER_HOST` | Bind host for Axum server (default: 0.0.0.0) |
| `SERVER_PORT` | Port for the Axum server (default: 3000) |
| `RUST_LOG` | Logging filter, e.g. `info,tower_http=info` |

### frontend/.env.local

| Variable | Description |
|---|---|
| `NEXT_PUBLIC_WS_URL` | WebSocket URL for the local Rust server, e.g. `ws://127.0.0.1:3000/monitor` |
| `NEXT_PUBLIC_API_BASE_URL` | HTTP API base URL for explainer and billing routes |

Example files are provided as `backend/.env.example` and `frontend/.env.local.example`.

## Current Product Status

- Backend includes `GET /health` and `GET /monitor/:address` WebSocket endpoint.
- `/monitor/:address` validates Solana pubkey and streams `NEW_TRANSACTION` plus `METRICS_UPDATE` payloads.
- Backend opens `logsSubscribe` to Helius (`HELIUS_WS_URL`) and enriches each log-triggered signature via `getTransaction` over HTTP (`HELIUS_HTTP_URL`).
- Frontend monitor input opens live websocket connection to the backend and auto-reconnects with exponential backoff.
- POC emits live address activity (deduped) with rolling metrics.

Explainer workflow status:

- Positioning, product scope, data model, and API surface are defined.
- Instruction decoding, error classification, and suggestion engine are the next implementation milestones.

Quick local POC test:

1. Create backend env:
	- `cp backend/.env.example backend/.env`
	- Replace `YOUR_API_KEY` in `HELIUS_HTTP_URL` (and optionally `HELIUS_WS_URL`).
2. Create frontend env:
	- `cp frontend/.env.local.example frontend/.env.local`
	- Set `NEXT_PUBLIC_WS_URL=ws://127.0.0.1:3000/monitor`
3. Start backend:
	- `cd backend && cargo run`
4. In another terminal, start frontend:
	- `cd frontend && yarn dev`
5. Validate backend health:
	- `curl http://127.0.0.1:3000/health`
6. Open frontend app, connect wallet, then monitor a valid Solana address.


## Project Structure

```
txpulse/
├── frontend/
│   ├── app/               # App Router pages and layouts
│   ├── components/        # UI components
│   ├── lib/               # WebSocket client, hooks, utilities
│   └── tailwind.config.ts
│
├── backend/
│   ├── src/
│   │   └── main.rs        # Axum entry point, logsSubscribe pipeline, and metric computation
│   └── Cargo.toml
│
├── LICENSE
└── README.md
```

## Deployment

TxPulse deploys as two services.

1. Backend Rust websocket API as a Docker container on a platform like Railway, Render, or Fly.io.
2. Frontend Next.js app on Vercel.

### Backend Deployment

1. Use `backend/Dockerfile` as the service image.
2. Set runtime env vars:
	- `HELIUS_HTTP_URL`
	- `HELIUS_WS_URL`
	- `SERVER_HOST=0.0.0.0`
	- `SERVER_PORT=3000`
	- `RUST_LOG=info,tower_http=info`
3. Expose port `3000`.
4. Verify with `GET /health` after deploy.

### Frontend Deployment (Vercel)

1. Import this repository in Vercel.
2. Set root directory to `frontend`.
3. Add env var:
	- `NEXT_PUBLIC_WS_URL=wss://<your-backend-domain>/monitor`
4. Deploy and verify `/app`, `/admin`, and `/docs` routes.

### Local Container Deployment

Use Docker Compose to run full stack locally:

```bash
docker compose up --build -d
```

Then open:

1. `http://localhost:3001` for frontend.
2. `http://localhost:3000/health` for backend health.

Stop stack:

```bash
docker compose down
```


## Contributing

Contributions are welcome. If you find a bug, have a feature idea, or want to improve the docs, please open an issue or submit a pull request.

Steps to contribute:

1. Fork the repository.
2. Create a new branch: `git checkout -b feat/your-feature-name`
3. Make your changes and commit them: `git commit -m "feat: describe your change"`
4. Push to your fork: `git push origin feat/your-feature-name`
5. Open a pull request against the `main` branch.

Please follow [Conventional Commits](https://www.conventionalcommits.org) for commit messages. Issues tagged `good first issue` are a good place to start if you are new to the project.

For larger changes, open an issue first to discuss the approach before writing code.


## License

MIT License

Copyright (c) 2026 TxPulse Contributors

Permission is hereby granted, free of charge, to any person obtaining a copy of this software and associated documentation files (the "Software"), to deal in the Software without restriction, including without limitation the rights to use, copy, modify, merge, publish, distribute, sublicense, and/or sell copies of the Software, and to permit persons to whom the Software is furnished to do so, subject to the following conditions:

The above copyright notice and this permission notice shall be included in all copies or substantial portions of the Software.

THE SOFTWARE IS PROVIDED "AS IS", WITHOUT WARRANTY OF ANY KIND, EXPRESS OR IMPLIED, INCLUDING BUT NOT LIMITED TO THE WARRANTIES OF MERCHANTABILITY, FITNESS FOR A PARTICULAR PURPOSE AND NONINFRINGEMENT. IN NO EVENT SHALL THE AUTHORS OR COPYRIGHT HOLDERS BE LIABLE FOR ANY CLAIM, DAMAGES OR OTHER LIABILITY, WHETHER IN AN ACTION OF CONTRACT, TORT OR OTHERWISE, ARISING FROM, OUT OF OR IN CONNECTION WITH THE SOFTWARE OR THE USE OR OTHER DEALINGS IN THE SOFTWARE.