# TxPulse
![Status](https://img.shields.io/badge/Status-MVP-blueviolet?style=for-the-badge)
![License](https://img.shields.io/badge/License-Private-red?style=for-the-badge)

![Next.js](https://img.shields.io/badge/Next.js-14-black?style=for-the-badge&logo=next.js)
![TypeScript](https://img.shields.io/badge/TypeScript-007ACC?style=for-the-badge&logo=typescript&logoColor=white)
![Tailwind](https://img.shields.io/badge/Tailwind_CSS-38B2AC?style=for-the-badge&logo=tailwind-css)

![Rust](https://img.shields.io/badge/Rust-Backend-orange?style=for-the-badge&logo=rust)
![Solana](https://img.shields.io/badge/Solana-RPC-14F195?style=for-the-badge&logo=solana&logoColor=black)
![Vercel](https://img.shields.io/badge/Vercel-Deployment-black?style=for-the-badge&logo=vercel&logoColor=white)

TxPulse is a real-time transaction health monitoring dashboard for Solana developers. It allows users to input a Solana wallet or program address and instantly monitor transaction performance, confirmation times, failure rates, and priority fees via a live feed.

To ensure high performance and prevent client-side rate limiting, this MVP utilizes a high-throughput Rust middleware to handle Solana RPC WebSocket connections, compute metrics, and stream sanitized updates to a Next.js frontend.

## Tech Stack

* Frontend: Next.js 14 (App Router), React, TypeScript, Tailwind CSS
* UI Components: Aceternity UI, Framer Motion, Recharts
* Backend Engine: Rust, Axum, Tokio
* Blockchain Integration: Solana SDK, OrbitFlare RPC

## Architecture Overview

The system operates on a two-tier architecture:
1. The Next.js frontend establishes a single WebSocket connection to the Rust backend.
2. The Rust backend opens a logsSubscribe WebSocket connection to the OrbitFlare RPC for the requested address.
3. Upon receiving a log trigger, Rust fetches the full transaction data via HTTP, calculates confirmation latency and priority fees, and broadcasts a lightweight JSON payload back to the Next.js client.

## Prerequisites

Ensure you have the following installed on your local machine:
* Node.js (v18 or higher)
* Rust (latest stable toolchain via rustup)
* Git

## Getting Started

### 1. Clone the Repository

```bash
git clone [https://github.com/TXPulse/txpulse.git](https://github.com/TXPulse/txpulse.git)
cd txpulse
```

### 2. Setup the Rust Backend

Navigate to the backend directory and run the server. By default, Axum will run on port 3000 (or whichever port you configure in your main.rs).

```bash
cd backend
cargo build
cargo run
```

### 3. Setup the Next.js Frontend

Open a new terminal window, navigate to the frontend directory, install dependencies, and start the development server.

```bash
cd frontend
npm install
npm run dev
```

The frontend will be available at http://localhost:3001 (if port 3000 is occupied by the Rust server, Next.js will automatically choose the next available port).

## Environment Variables

You will need to configure environment variables for both the frontend and backend. Create a .env file in both directories.

### Backend (.env)
* ORBITFLARE_WS_URL: Your OrbitFlare WebSocket endpoint.
* ORBITFLARE_HTTP_URL: Your OrbitFlare HTTP endpoint.
* PORT: The port for the Axum server (default 3000).

### Frontend (.env.local)
* NEXT_PUBLIC_WS_URL: The WebSocket URL for the local Rust server (e.g., ws://127.0.0.1:3000/monitor).

## Project Structure

* /frontend: Contains the Next.js 14 application, Tailwind configuration, and Aceternity UI components.
* /backend: Contains the Rust/Axum application, RPC subscription logic, and metric computation engine.

## License

All rights reserved.