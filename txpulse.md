# Infra Accelerator - Application

## 1. Project Overview

### Project Name

TxPulse

### Tagline

Transaction reliability platform for Solana developers.

### Description

TxPulse is a developer product focused on one startup problem: Solana teams cannot quickly understand transaction reliability issues in production. We solve this with two core experiences in one app.

1. Paste any wallet or program address and monitor transaction health live (confirmation times, failure rates, dropped transactions, priority fees, slot lag).
2. Paste a failed transaction hash and get a plain-English explanation of what broke and how to fix it.

Block explorers like Solscan are great for looking up past transactions but they are not built for monitoring. Developers today have no lightweight tool to watch transaction behavior as it happens. TxPulse is that tool.

It is built for developers and protocol teams who are actively shipping on Solana and need quick answers: are my transactions landing, how fast, and are my priority fees doing anything useful.

From the beginning, TxPulse product positioning has included this core workflow:

"Paste a failed Solana transaction hash. Get a plain-English explanation of exactly what went wrong and how to fix it. For developers, by a developer."

This is a core TxPulse workflow that complements live monitoring and helps developers debug failed transactions quickly.

### Main Problem We Solve

Developers lose hours diagnosing failed transactions because the current workflow is fragmented across explorers, RPC logs, and ad-hoc scripts. TxPulse unifies detection and diagnosis so teams can move from alert to fix in minutes, not hours.

### Category

- Developer Tooling
- Data / Analytics

### Links

| Resource | Link |
| --- | --- |
| Website | https://txpulse.xyz (coming soon) |
| GitHub Repository | https://github.com/TXPulse/txpulse |
| Demo / Prototype | https://devnet.txpulse.xyz (in progress) |
| Documentation | in progress |

---

## 2. Team

### Team Members

| Name | Role | GitHub | LinkedIn | Relevant Experience |
| --- | --- | --- | --- | --- |
| Manish Kumar Jha | Rust / Solana Dev | @keirsalterego | /in/mxnish | Solana development, Rust, WebSocket integrations |


### Team Location(s)

Remote. UTC+5:30.

### Time Commitment

Full-time for the 4-week program. This is the only active project during the accelerator.

### Prior Work

- Built transaction monitoring experiments on Solana devnet using `@solana/web3.js`
- Experience with real-time WebSocket data pipelines
- Familiar with Solana RPC subscription methods and their edge cases

---

## 3. Technical Details

### Architecture Overview

The frontend is a Next.js app deployed on Vercel. It connects to Helius RPC over WebSocket and subscribes to logs and signature events for the address the user provides. When a new signature comes in, we fetch the full transaction via `getTransaction` and compute the metrics on the client side.

For the MVP there is no custom backend. All RPC calls go directly from the browser to Helius. Once we add historical data storage in a later phase, we will introduce a small Node.js service that persists transaction records to a Postgres database so page refreshes do not wipe your data.

There are no on-chain programs in TxPulse. It is purely a read layer on top of existing Solana data.

Architecture path for failed transaction explainer product:

- User submits tx hash/signature.
- API fetches full transaction payload from reliable RPC (Helius or QuickNode).
- Decoder parses instructions and resolves Anchor IDL context where available.
- Error classifier converts failure codes to plain-English explanation.
- Suggestion engine generates practical fix recommendations.
- Result can be opened by shareable URL and counted in usage analytics.

Architecture diagram: frontend, RPC, and metrics/explainer flow (source SVG removed from markdown for readability).

Future: a lightweight Node backend will sit between the browser and RPC to handle persistence and rate limiting server-side.

### Tech Stack

| Layer | Technology |
| --- | --- |
| Frontend | Next.js 14, TypeScript, Tailwind CSS, Recharts |
| RPC | Helius HTTP + WebSocket, `@solana/web3.js` |
| Hosting | Vercel |
| Error tracking | Sentry |
| Backend (phase 2) | Node.js, Postgres |

### Smart Contracts / Programs

None. TxPulse is read-only.

### Repository Structure

```
txpulse/
  app/
    page.tsx              # main dashboard
    layout.tsx
  components/
    TransactionFeed.tsx   # live tx list
    MetricsCards.tsx      # confirmation time, success rate, fees
    SlotLagChart.tsx      # slot lag over time
  lib/
    rpc.ts                # Helius connection, subscriptions, reconnect logic
    metrics.ts            # fee parsing, latency calc, slot lag
    types.ts
  .env.example
```

---

## 4. Current Status

### Development Stage

Working devnet prototype.

### What Works as a POC

You paste a wallet or program address, TxPulse subscribes to it over WebSocket, and you see:

- A live feed of transactions with status (confirmed, failed, dropped)
- Average confirmation time across the last 50 transactions
- Success rate percentage
- Priority fee per transaction in microlamports
- Current slot lag estimate

The full pipeline works end to end on devnet. The only issue is it is running against a public RPC which drops events under any real load.

### Known Limitations

- Using a public RPC endpoint. It rate-limits and drops WebSocket events frequently.
- No reconnect logic on WebSocket disconnect. Data just stops silently.
- No timeout handling for pending transactions so dropped ones sit in "pending" forever.
- Hardcoded devnet URL, no env config yet.
- Page refresh clears all data.
- Mobile layout needs work.

### Devnet Deployment

https://devnet.txpulse.xyz (in progress)

---

## 5. Path to Mainnet

### Mainnet Blockers

| Blocker | Severity | Estimated Effort |
| --- | --- | --- |
| Public RPC drops WebSocket events under load | High | 1 day, swap to Helius |
| RPC URL is hardcoded, no environment config | High | half a day |
| No WebSocket reconnect or backoff logic | High | 1 to 2 days |
| Pending transactions never time out | High | 2 days |
| Priority fee field missing on some transactions, causes parse crash | Medium | 1 day |
| No client-side RPC rate limiting, will hammer endpoint on busy addresses | Medium | 1 day |
| No error monitoring on production frontend | Medium | 1 day with Sentry |
| Mobile layout broken | Low | 1 day |

### Proposed Milestones

| Week | Milestone | Deliverable |
| --- | --- | --- |
| 1 | Helius RPC integrated, connection hardened | Stable WebSocket connection with reconnect and backoff. Zero silent failures. Devnet demo running cleanly. |
| 2 | Mainnet data pipeline working | Mainnet mode live. All transaction states classified correctly. Timeout logic done. Fee parsing solid. |
| 3 | Production hardening | Load tested on a high-volume program. Rate limiting in place. Sentry set up. Vercel deployment stable. |
| 4 | Public launch | txpulse.xyz live on mainnet with both reliability dashboard and failed-transaction explainer workflows. Launch post published. |

### Infrastructure Needs

We use `logsSubscribe` and `signatureSubscribe` heavily. These are WebSocket subscriptions and they need to stay open and reliable. Public RPCs fall over here which is the core reason we need Helius.

For busy program addresses like a DEX router, incoming events can be 50 to 100 per second. We need an endpoint that can handle that volume without throttling the subscription.

RPC methods we call: `getTransaction`, `getSlot`, `getRecentPrioritizationFees`, `logsSubscribe`, `signatureSubscribe`.

We may explore Jetstream in week 3 if we want more accurate slot lag data from the raw stream rather than polling.

Users are globally distributed so we want low-latency RPC from US and EU regions.

---

## 6. Ecosystem Fit

### Target Users

Solana developers and protocol teams actively shipping products. Anyone who has ever wondered why their transaction dropped or whether their priority fee is working.

### Problem Evidence

This comes up constantly in Solana developer Discord servers and forums. Developers ask why transactions are dropping silently, how to tune priority fees, why confirmation is slow. There is no tool that shows this in real time. Solscan is for forensics not monitoring. The gap is real and developers work around it with custom logging or just guessing.

### Competitive Landscape

| Project | How We Differ |
| --- | --- |
| Solscan / SolanaFM | Block explorers. Look up past transactions, not live monitoring. |
| Helius webhooks | Event delivery to your backend. Not a visual monitoring tool. |
| Grafana with custom pipelines | Works but requires significant setup. TxPulse is zero config. |
| Solana Beach | Chain-wide stats, not per-address transaction health. |

### Ecosystem Contribution

Better visibility into transaction behavior means developers can ship more reliable products. TxPulse also demonstrates clearly what high-performance RPC makes possible and would not work the same way on a public endpoint.

---

## 7. Post-Program Plans

### Sustainability

Free tier for one address with 24 hour history. Paid tier at around $15 per month for teams who need multiple addresses, longer history, and alerting. Infrastructure costs stay manageable with Helius pricing.

### Roadmap

- Month 1: stable mainnet release for live monitoring and failed-transaction explanation
- Month 2: email and Telegram alerts when failure rate or latency crosses a threshold
- Month 3: multi-address dashboards and persistent explanation history
- Month 4 onwards: API for teams who want to pull TxPulse data into their own stack

Failed tx explainer product roadmap:

- Ship hash-based explainer MVP UI and API.
- Add normalized error classification dictionary for common Solana failure patterns.
- Persist decoded explanations to support shareable URLs and revisit history.
- Add Stripe-based plan limits and usage metering.
- Optional Discord command for quick explain in developer communities.

### Data Model

`decoded_txs (hash, network, error_code, plain_english, fix_suggestion, viewed_count, created_at)`

`users (id, email, stripe_id, plan)`

`usage (user_id, tx_hash, timestamp)`

### Continued Infrastructure

Yes. Helius RPC is not a nice to have here, it is what makes TxPulse actually work at scale. We plan to stay on Helius and usage will grow as the user base does.

---

## 8. Additional Information

### How did you hear about the infra accelerator?

Helius docs and the Solana developer community on Twitter.

### Previous Accelerators or Grants

None.

### Anything Else

The core of TxPulse is achievable in the first two weeks. The last two weeks are for hardening and launch. The scope is deliberately kept tight so we can actually ship something useful rather than overpromise.
