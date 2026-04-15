# TxPulse Frontend

Frontend app for TxPulse, built with Next.js App Router and TypeScript.

This frontend supports real-time Solana transaction health monitoring and a built-in failed transaction explainer workflow.

## Product Pillars

1. Live reliability visibility for wallet and program activity.
2. Fast failure diagnosis from tx hash to plain-English explanation.
3. Shareable outputs for team collaboration and incident response.

## Failed Transaction Explainer

Positioning statement:

"Paste a failed Solana transaction hash. Get a plain-English explanation of exactly what went wrong and how to fix it. For developers, by a developer."

This is a core workflow in the app, with existing live monitoring views continuing as primary dashboards.

### MVP Frontend Product Scope

- Tx hash input field.
- Network selector.
- Result view with:
	- decoded failure summary,
	- plain-English explanation,
	- fix suggestion.
- Shareable result URL page.

### UX Quality Bar

- A developer should understand failure cause and next action in under 30 seconds.
- Explanation output should prioritize clarity over protocol jargon.
- Share links should be stable and easy to post in team chats or tickets.

## Getting Started

Run the development server:

```bash
yarn install
yarn dev
```

Open `http://localhost:3001` (or the port reported by Next.js).

## Environment Variables

Use `.env.local` in this directory.

| Variable | Description |
|---|---|
| `NEXT_PUBLIC_WS_URL` | WebSocket endpoint for live monitoring backend |
| `NEXT_PUBLIC_API_BASE_URL` | HTTP API base for explainer endpoints |

## Planned Frontend Routes (Product Docs)

- `/app` - live monitoring dashboard.
- `/explain` - hash input and decode trigger.
- `/explain/[hash]` - rendered explainer result page.
- `/s/[hash]` - public/share-friendly result path.

## Integration Notes

- Solana transaction retrieval and decode happen via backend APIs.
- Anchor IDL-aware decoding is surfaced as enriched labels in UI when available.
- Stripe flows are consumed from frontend for plan upgrades.
- Optional Discord command remains external and links back to the share URL.

## Current Implementation Status

- Live monitoring UX is active and tied to backend WebSocket streaming.
- Explainer routes and contracts are documented and ready for implementation.
- Billing and plan-gating flows are planned in integration phase.
