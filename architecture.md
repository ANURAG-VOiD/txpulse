# System Design Architecture: TxPulse (POC / MVP)

## 1. Architectural Overview

For the MVP, TxPulse utilizes a two-tier architecture designed for high-throughput real-time monitoring. It consists of a **Next.js frontend** styled with Aceternity UI, and a **Rust WebSocket middleware** acting as the metrics engine. 

Instead of the browser connecting directly to OrbitFlare, the client opens a single WebSocket connection to the Rust backend. The Rust service manages the Solana RPC subscriptions, fetches transaction payloads, calculates metrics, and streams optimized, sanitized updates back to the UI.

## 2. Component Breakdown

### A. Frontend Layer (Next.js 14 + Aceternity UI)
* **Framework:** Next.js 14 (App Router), React, TypeScript.
* **Styling:** Tailwind CSS, Framer Motion (for Aceternity).
* **App Shell & Navigation:**
    * A clean, responsive `layout.tsx` establishing the dark-mode theme.
    * **Aceternity UI Floating Navbar** (or similar sleek top navigation) to hold branding and basic links.
* **Core Dashboard:**
    * **Search Bar:** *Placeholders And Vanish Input* component.
    * **Metrics Dashboard:** *Bento Grid* component.
    * **Transaction Feed:** *Tracing Beam* component.
    * **Background:** *Background Beams* or *Sparkles*.
    * **Charts:** Recharts (styled to match the dark aesthetic).

### B. Metrics Engine Layer (Rust)
* **Core Stack:** `axum` (web/WS routing), `tokio` (async runtime), `solana-client` (RPC interaction), `serde_json`.
* **Responsibilities:**
    1. Accept WS connections from the Next.js client.
    2. Open a `logsSubscribe` connection to OrbitFlare.
    3. Fire HTTP `getTransaction` requests upon log triggers.
    4. Calculate confirmation latency and extract priority fees.
    5. Push structured `TxEvent` and `MetricsUpdate` JSON payloads to the frontend.

## 3. Real-Time Data Flow
1. User pastes address into the Vanish Input.
2. Next.js connects to Rust backend: `ws://api.txpulse.xyz/monitor/<ADDRESS>`.
3. Rust connects to OrbitFlare via WS (`logsSubscribe`).
4. OrbitFlare pushes log notification to Rust.
5. Rust fetches full transaction via HTTP, computes metrics.
6. Rust broadcasts JSON event to Next.js.
7. Next.js updates state and animates UI.

## 4. API & Payload Contracts

### Server -> Client: Transaction Event Payload
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

### Server -> Client: Aggregated Metrics Payload (Sent every 3s)
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

---

## 5. Deployment Strategy (MVP)
* **Frontend:** Vercel.
* **Backend:** Dockerized Rust app on AWS EC2 / Fly.io.

---

## 6. AI Coding Guidelines & System Prompt

**Role & Persona:**
You are an expert full-stack developer specializing in high-performance Rust backends (`axum`, `tokio`) and modern Next.js 14 (App Router) frontends. Your code must be production-ready, strictly typed, and built for maximum performance. This is a 100% scratch build.

### 0. ABSOLUTE CONSTRAINTS (DO NOT VIOLATE)
* **No Truncation:** DO NOT use placeholders like `// ... rest of the code` or `/* implementation here */`. Output the entire file, start to finish.
* **Zero-to-One Build:** Assume an empty repository. You must generate the foundational layout (`layout.tsx`), global CSS, and a top-level navigation component (e.g., Aceternity Floating Navbar) before diving into the specific dashboard views.
* **No Unwraps:** In Rust, you are strictly forbidden from using `.unwrap()` or `.expect()`. Handle all `Result` and `Option` types explicitly using pattern matching, `?`, or default values.

### 1. Frontend Directives (Next.js & React)
* **Strict Typing:** Export interfaces for all WebSocket payloads (`TxEvent`, `MetricsUpdate`). Do not use `any`.
* **State & Architecture:** Manage WebSocket state robustly. The connection logic should ideally live in a custom hook (e.g., `useTxPulseSocket`) to keep UI components clean.
* **Performance First:** The transaction feed will receive data at high velocity. You MUST use `React.memo`, `useMemo`, and `useCallback` to prevent the Aceternity UI components (like Tracing Beam and Bento Grid) from causing cascading re-renders. 
* **Client Components:** Aceternity UI components heavily rely on `framer-motion` and browser APIs. Ensure any component using hooks or animations is strictly marked with `"use client"` at the very top of the file.
* **Styling Utilities:** Always generate and use a utility function (e.g., `cn` wrapping `clsx` and `tailwind-merge`) when applying conditional Tailwind classes to prevent style conflicts.
* **WebSocket Resilience:** Implement automatic reconnection logic with exponential backoff for the client-side WebSocket connection.

### 2. Backend Directives (Rust & Axum)
* **Error Handling:** Use `anyhow` for application-level errors or define custom error enums using `thiserror`. Propagate errors using the `?` operator. Log errors using the `tracing` crate; do not panic.
* **Concurrency:** Leverage `tokio` effectively. Manage state across WebSocket connections using `Arc<RwLock<T>>` or `tokio::sync::broadcast` channels. Ensure disconnected clients are cleanly removed from state to prevent memory leaks.
* **Solana RPC Boundaries:** * Implement a basic retry mechanism with backoff when fetching `getTransaction` via HTTP to handle OrbitFlare rate limits or timeouts.
    * Use `Option<T>` for fields in the transaction payload that might be missing (e.g., older transactions lacking priority fee data).
* **Graceful Shutdown:** Implement signal handlers to cleanly close RPC subscriptions and WebSocket connections when the server process is terminated.
