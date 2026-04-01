# OrbitFlare Infra Accelerator - Application

## 1. Project Overview

### Project Name

TxPulse

### Tagline

Real-time transaction health monitoring for Solana developers.

### Description

TxPulse is a dashboard that lets you paste any Solana wallet or program address and immediately see how your transactions are performing. Confirmation times, failure rates, dropped transactions, priority fees, slot lag - all live, no setup needed.

Block explorers like Solscan are great for looking up past transactions but they are not built for monitoring. Developers today have no lightweight tool to watch transaction behavior as it happens. TxPulse is that tool.

It is built for developers and protocol teams who are actively shipping on Solana and need quick answers: are my transactions landing, how fast, and are my priority fees doing anything useful.

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

The frontend is a Next.js app deployed on Vercel. It connects to OrbitFlare RPC over WebSocket and subscribes to logs and signature events for the address the user provides. When a new signature comes in, we fetch the full transaction via `getTransaction` and compute the metrics on the client side.

For the MVP there is no custom backend. All RPC calls go directly from the browser to OrbitFlare. Once we add historical data storage in a later phase, we will introduce a small Node.js service that persists transaction records to a Postgres database so page refreshes do not wipe your data.

There are no on-chain programs in TxPulse. It is purely a read layer on top of existing Solana data.

<?xml version="1.0" encoding="utf-8"?><svg xmlns="http://www.w3.org/2000/svg" xmlns:xlink="http://www.w3.org/1999/xlink" data-d2-version="v0.7.0-HEAD" preserveAspectRatio="xMidYMid meet" viewBox="0 0 1151 648"><svg class="d2-1632160240 d2-svg" width="1151" height="648" viewBox="-101 -101 1151 648"><rect x="-101.000000" y="-101.000000" width="1151.000000" height="648.000000" rx="0.000000" fill="#FFFFFF" class=" fill-N7" stroke-width="0" /><style type="text/css"><![CDATA[
.d2-1632160240 .text-bold {
	font-family: "d2-1632160240-font-bold";
}
@font-face {
	font-family: d2-1632160240-font-bold;
	src: url("data:application/font-woff;base64,d09GRgABAAAAABDIAAoAAAAAGVgAAguFAAAAAAAAAAAAAAAAAAAAAAAAAABPUy8yAAAA9AAAAGAAAABgXxHXrmNtYXAAAAFUAAAArwAAAO4E5gViZ2x5ZgAAAgQAAAnnAAANcEzyZ8hoZWFkAAAL7AAAADYAAAA2G38e1GhoZWEAAAwkAAAAJAAAACQKfwXvaG10eAAADEgAAAC0AAAAwF2MCDBsb2NhAAAM/AAAAGIAAABiVr5TQG1heHAAAA1gAAAAIAAAACAASAD3bmFtZQAADYAAAAMoAAAIKgjwVkFwb3N0AAAQqAAAAB0AAAAg/9EAMgADAioCvAAFAAACigJYAAAASwKKAlgAAAFeADIBKQAAAgsHAwMEAwICBGAAAvcAAAADAAAAAAAAAABBREJPACAAIP//Au7/BgAAA9gBESAAAZ8AAAAAAfAClAAAACAAA3icfM3bKgVhHMbh51uz7Jdl2e/H2M8gF0HEgZLSHLsC5UjuiZyicCtchtJfJsfe06feH5JMQkfbJ3I9ma5CZdeefYeOnTp3qXbt1l0ECuWfHzhy4syF2pWbX48PLSm+4yve4y1e4yWe4yke4yHum9p/S3aa50qpJdPWp9+AQUOGjegY1TWmZ9yESVOmzZg1Z96CRUuW5VYUVq1Zt2HTlm1+AAAA//8BAAD//wKZJjMAeJyEVn1sW9XZf87xjW/jOh/+uL62E3/e+F47iZ3E19c3n3Xc2E7a2Pls0xTy0Ua8b0qTpn1b923KwjqJAhNzAc2hpEMDhkDTJjoVdZMKWyZt2tgQnWArW/bHaAFN3QQSNSiaYE2up3ttt2n/2R/Jsa7Oec5zfs/v+f0eKIMhADyDl0EF5VAFeqAAeJ1L5+E5jiFFXhQZWiVySEcOYb302qucj/D5iHrniuOR6WmUmsLLm/MPpmZm/jXd0SG9+OZb0jl04i0AFaQAcCfOgA6s4JZj8kGTiTKqSUpZ1IyKD4aFEMswOj6orKkbsfluvzfYEzveOx0PtwRDidHTnV2jOGNLRBpGq4iK/mjPHh96sp5hndL4eIMHAEEgv46b8QrUAJS5WVYIhcN80ESTLMu41WrKaOKDYZFWo8mRp0b3nhuJPOQasIhM466GsT5vxDwwok0+d2T+wjDvnqJtwamdDx2rs0wcACTnj27hDGxX8KBcFE8xlItKoRXp9vXrqApnlh77xvklgOLef+IMlG/dm0IvSF998gnOLD2/tAmlfXhvKSZP8QKvY3SMLpX9eHn5Y5y5fXszjaqlXGkvfIQzoFL26lJZnNlMF2NcxBlwKN8NJhPNh8Oigdcx8tNFhiQZjmPsmKJSP3hYo9cQGp1m9uUnyHIVIUwOT4YIYhuJM9L12h12+45a5N5M33IODjle+PrrFxxDg85bpTyTOAOGwh00z7KCnKuKY0wmiko9/+NugqjMyEtZBc5Iv3g29K32m5tpFH86vNT+DwDASl2+iVeg6r7KKMXnCqV3y/VBY+OP9/c/Pl743zMw0NMzMKAduXB47rnBwfOHD18YOZOemVlYmJlJy3Hl3JpxBrRg3MIqNcNQd3j0Ud/JRCIdH+5b7O6M4Qw3MZicafoQjRzi6wFKMUZxBiqB3spMA8MpUQq0TH0WPx6LCMuvPTqcbO/qak/ijGd8oG+Slm5/9hk60NLczMpYMfl1rMErUK+8khNNpkIAjgvge8lIGU00XcgWGbvPBPcwY96An2/Y6+pkOx6OtR6r73d2c6y/rX5PR6J9Qdsc+B8767Y5bPq6yqZEU3g81Fg/aalx1NrtOrd5Tzw80QoILADYgDNAyi9hBBfF6K5eRv++jKuXljZzBd7tyq/jQaUX5RwFHa9T2kL5oUYDZ55YbhfFzqcf055/FU1J2QPJ5AF0RHrl1fOAoBJA5cQZcAHwqi18u/tLxahYlmPUalL15Onn/epKNaExaBKPJjQGDUFWkP5z6Te7t1WUEeqKbV04I73Hz4ZCszxqkd5rOSQIs0HUsplGXjZVV5dipb8Chvr8OvoAbYAFGADaLVNHVCAkOQVQSsfI94nBsCgoPf7L2NDZLGZ8ju46oWmuffp/FzWEo3ebxWMY6HRo90UGxqtcnJk6aKtbOC79na9ljtOGfZoGm5lW+BDNr2MTXgWj3FVyFRmS0fEUeR9hGbcsXiju6rER2hNZwhZzd443dU6Ps+GxRp/Rq3U5Bbz6etJq2/F/yb2nI4uJ5BP+d/WVSg3q8utoFW2A9X6dKjCjoFJqZIkfjfb9fyzQWxtnnEIk0mwOGNo9Y9qukyOj6S47PW1LRrtTVNUBZ02By1x+HW3gVTCAs4SVEpiTG/YOSiUCfjlxtGM65Gu1qLOLGsKawGZOb2gwMuEm7XdOD5/cUWtO/mizp8XKLBot7+ore3p3xQEruX+MNsBcxGdrL5MumfFy7ipeaWnk6D2+s2e+o3eyicDSmibRIoRb2KnvXeYa3WHtjvTIcDoSmYsZPOVh3rXfakftPqGpwFMzAErjd+RV5rJ4X//Isqp7YOfOuqEeR6i6psKqrbHv248ePVJWI4yFtOr5sjIXaz8hPSb7jzvvxyTagCbogN0KMqwQkoGQySSUnkDzFFMUEDen1EGml1GtVm1RKENREdyssuXL9qnWXkON02z1tU8Jja6fDZLloXHR5tC7fUMTB2NLu20cZ7NxnC/YzXl4i0tb03XN2trY6SUqvI6aYDWhjzV0Dnq1c9vdxrbddZoqk0Hf0cMPB9A79T7O5/X66qVsnYWuVqnMllpbAZuoXGyFo4p3kKVG0ClZkrpolqztDw7vytqctV4zXn19v6VhblK6ilxhr4WW3oB8HkQA+BBfwyz4AYCEADwFkM/n/5DvhBvK96bi98ydO+14FbQFD+JFXtZIkoo+Q3z/5Z/8/KVjEbwqLfz2qvS3X/U+Iu/PryM9XoWqAhNLOiOT4/fJjqyuvIxU67Ue7YP9mNlco/UIHSkjC/eobGhD0RgdL8uKXPV7XkjeWaNybydahKjBtbtlqD9rc3qa5X9NKNft8Dd43S2lZzdLbxSXEn5oo4hf8Y6t+C1qCGfqDoAoF7H778Gv0AcKp/67p5kiR2Oxo5HIQiy2EPEHAv6A31/s4a706MjJrlOp7mhSbuUizugZtAH6e95fYH0hs5okS9VqzBWW6touI8rtC7aUlZ0hCF9Q+ggQUPl19BLaAE7B/a4HsQUPuhNMdiA7pozqay2z7E53xOGy2wJWe4f34b1t+xw7rSFrWxvr7PId0rKOCUsNbdCZDBptXZsvPsaZx40mzmyp3M60BXomC5zU5dfRAk7LLir7isAIosgrw89dQYOJwVhS98ipU4xNa9HQBlF7eOydI+qzZ0/8rt6jJubU2kKszvw6+grl5Prcwx1dUcb+Mrwra3fWsqbs4naVY7d2bhKFpBuCz2pDfVJ13NMISOYpyqMcVCheRRcdSuRVl3+43C27UblBEz33Csp96klxXMrzqVRd0h2cQ7mix909tyUCwxU9jlxe+m6zWqMmyIpy8UxreRVJkOVk07dPve4nK0iC3E42otxNTx/L7mZuKmuf56ZU/TaT8HoTzNvKfZUAaB3lZO/mDdyWa0j67j2VK8+82KgxaYht+m3ulWcvvNispbVEubGcQ/jzIaqBohqoofwXI1QjRTWYRuS48kDyU5RT5lDBIA8DKp5i338THXt/bRAFTgxIfzwh7+vKr8MtuCjPoQXHKIjeeZbnWZbntQLnFQQvJxTm6x0I4KLMTZoLhzm3m9lyJGlvbUeYwEw4zAZDE78eMEY9DV42sDs6slioa18+hbz4hlwTuiC+tGLZ9NVIPB6ZCINB8fLs9bNnr8+yB9fmDq/NAILmfApVF89wYWWaEpUmy0y0BoOtE5F4/DI7s3Z4bu0gq5wFBG6YQp/jsPwmUWAEXigQ8U+XLs1fujR15dCVK4euFHsNPkC50lwdzaKcVA0ofxG3wSi+Jp/XbXmgJxDweAIB3FbPMPXyn0wxWS//jHJQfU+/KdOUus7hq7JqDBobnXWmfrNNPa8iOB/6QjKEHxDhPwAAAP//AQAA//9y4t5gAAABAAAAAguFfR/dWV8PPPUAAQPoAAAAANhdoIQAAAAA3WYvNv43/sQIbQPxAAEAAwACAAAAAAAAAAEAAAPY/u8AAAiY/jf+NwhtAAEAAAAAAAAAAAAAAAAAAAAweJwUzLEuxmAUxvH/eZqIxJciqaYWQ70h4W1jI9EOZxGGkxhIajC6Dndg72pmsboBA5O7sVS+G/jpg1u+QI+EruiVCK0IvRLWEfojNBN6o9cdoSdCmUNl9jVzU3SU2uZEI26/JI0ca4Nk9zSqaXWJW8W51cuPEm4HePGAa8B1SrIX3D7Zs2d2dcGgLVbFJo1Ead8cWWa0TG8T1zZxph1aq3BY3tfmPwAAAP//AQAA///t2x0GAAAALAAsAGAAjACiALYAzADYAQoBLAFYAXoBoAHgAfICEAJKAoICtALgAxIDRgNsA9QD9gQCBA4EJgRCBHQElgTCBOIFHgVEBWYFggW6BeYF+gYQBjAGSgZkBngGhAaaBrgAAAABAAAAMACQAAwAYwAHAAEAAAAAAAAAAAAAAAAABAADeJyclM9uG1UUxn9ObNMKwQJFVbqJ7oJFkejYVEnVNiuH1IpFFAePC0JCSBPP+I8ynhl5Jg7hCVjzFrxFVzwEz4FYo/l87NgF0SaKknx37vnznXO+c4Ed/mabSvUh8Ec9MVxhr35ueIsH9RPD27TrW4arPKn9abhGWJsbrvN5rWf4I95WfzP8gP3qT4YfslttG/6YZ9Udw59sO/4y/Cn7vF3gCrzgV8MVdskMb7HDj4a3eYTFrFR5RNNwjc/YM1xnD+gzoSBmQsIIx5AJI66YEZHjEzFjwpCIEEeHFjGFviYEQo7Rf34N8CmYESjimAJHjE9MQM7YIv4ir5RzZRzqNLO7FgVjAi7kcUlAgiNlREpCxKXiFBRkvKJBg5yB+GYU5HjkTIjxSJkxokGXNqf0GTMhx9FWpJKZT8qQgmsC5XdmUXZmQERCbqyuSAjF04lfJO8Opzi6ZLJdj3y6EeFLHN/Ju+SWyvYrPP26NWabeZdsAubqZ6yuxLq51gTHui3ztvhWuOAV7l792WTy/h6F+l8o8gVXmn+oSSVikuDcLi18Kch3j3Ec6dzBV0e+p0OfE7q8oa9zix49WpzRp8Nr+Xbp4fiaLmccy6MjvLhrSzFn/IDjGzqyKWNH1p/FxCJ+JjN15+I4Ux1TMvW8ZO6p1kgV3n3C5Q6lG+rI5TPQHpWWTvNLtGcBI1NFJoZT9XKpjdz6F5oipqqlnO3tfbkNc9u95RbfkGqHS7UuOJWTWzB631S9dzRzrR+PgJCUC1kMSJnSoOBGvM8JuCLGcazunWhLClornzLPjVQSMRWDDonizMj0NzDd+MZ9sKF7Z29JKP+S6eWqqvtkcerV7YzeqHvLO9+6HK1NoGFTTdfUNBDXxLQfaafW+fvyzfW6pTzliJSY8F8vwDM8muxzwCFjZRjoZm6vQ1MvRJOXHKr6SyJZDaXnyCIc4PGcAw54yfN3+rhk4oyLW3FZz93imCO6HH5QFQv7Lke8Xn37/6y/i2lTtTierk4v7j3FJ3dQ6xfas9v3sqeJlZOYW7TbrTgjYFpycbvrNbnHeP8AAAD//wEAAP//9LdPUXicYmBmAIP/5xiMGLAAAAAAAP//AQAA//8vAQIDAAAA");
}]]></style><style type="text/css"><![CDATA[.shape {
  shape-rendering: geometricPrecision;
  stroke-linejoin: round;
}
.connection {
  stroke-linecap: round;
  stroke-linejoin: round;
}
.blend {
  mix-blend-mode: multiply;
  opacity: 0.5;
}
		.d2-1632160240 .fill-N7{fill:#FFFFFF;}
		.d2-1632160240 .fill-B1{fill:#000410;}
		.d2-1632160240 .fill-B6{fill:#FFFFFF;}
		.d2-1632160240 .stroke-B1{stroke:#000410;}
		.d2-1632160240 .fill-N1{fill:#000410;}]]></style><g class="YnJvd3Nlcg=="><g class="shape"><rect x="389" y="0" width="167" height="66" stroke="#000410" fill="#FFFFFF" style="stroke-width:2;"/></g><text x="472.5" y="38.5" fill="#000410" style="text-anchor:middle;font-size:16px;font-weight:bold">Browser (Next.js)</text></g><g class="d3M="><g class="shape"><rect x="0" y="174" width="290" height="82" stroke="#000410" fill="#FFFFFF" style="stroke-width:2;"/></g><text x="145" y="212.5" fill="#000410" style="text-anchor:middle;font-size:16px;font-weight:bold"><tspan x="145" dy="0">OrbitFlare WebSocket</tspan><tspan x="145" dy="18.5">logsSubscribe, signatureSubscribe</tspan></text></g><g class="ZXZlbnRz"><g class="shape"><rect x="28" y="372" width="234" height="66" stroke="#000410" fill="#FFFFFF" style="stroke-width:2;"/></g><text x="145" y="410.5" fill="#000410" style="text-anchor:middle;font-size:16px;font-weight:bold">Incoming Signature Events</text></g><g class="cnBj"><g class="shape"><rect x="350" y="166" width="244" height="98" stroke="#000410" fill="#FFFFFF" style="stroke-width:2;"/></g><text x="472" y="204.5" fill="#000410" style="text-anchor:middle;font-size:16px;font-weight:bold"><tspan x="472" dy="0">OrbitFlare HTTP RPC</tspan><tspan x="472" dy="17.67">getTransaction, getSlot</tspan><tspan x="472" dy="17.67">getRecentPrioritizationFees</tspan></text></g><g class="bWV0cmljcw=="><g class="shape"><rect x="654" y="174" width="295" height="82" stroke="#000410" fill="#FFFFFF" style="stroke-width:2;"/></g><text x="801.5" y="212.5" fill="#000410" style="text-anchor:middle;font-size:16px;font-weight:bold"><tspan x="801.5" dy="0">Metrics Engine</tspan><tspan x="801.5" dy="18.5">confirmation time, fee calc, slot lag</tspan></text></g><g class="dWk="><g class="shape"><rect x="720" y="364" width="164" height="82" stroke="#000410" fill="#FFFFFF" style="stroke-width:2;"/></g><text x="802" y="402.5" fill="#000410" style="text-anchor:middle;font-size:16px;font-weight:bold"><tspan x="802" dy="0">Recharts UI</tspan><tspan x="802" dy="18.5">live feed + charts</tspan></text></g><marker id="mk-arrow" markerWidth="10" markerHeight="12" refX="7" refY="6" viewBox="0 0 10 12" orient="auto" markerUnits="userSpaceOnUse"><polygon points="0,0 10,6 0,12" fill="#000410"/></marker><path d="M 386.56 54.69 C 193.7 103.64 145 127.6 145 170" stroke="#000410" fill="none" style="stroke-width:2;" marker-end="url(#mk-arrow)"/><path d="M 145 258 C 145 302.4 145 325.6 145 368" stroke="#000410" fill="none" style="stroke-width:2;" marker-end="url(#mk-arrow)"/><path d="M 472 68 C 472 106 472 126 472 162" stroke="#000410" fill="none" style="stroke-width:2;" marker-end="url(#mk-arrow)"/><path d="M 558.44 54.52 C 752.5 103.61 801.5 127.6 801.5 170" stroke="#000410" fill="none" style="stroke-width:2;" marker-end="url(#mk-arrow)"/><path d="M 801.5 258 C 801.5 302.4 801.5 324 801.5 360" stroke="#000410" fill="none" style="stroke-width:2;" marker-end="url(#mk-arrow)"/></svg></svg>

Future: a lightweight Node backend will sit between the browser and RPC to handle persistence and rate limiting server-side.

### Tech Stack

| Layer | Technology |
| --- | --- |
| Frontend | Next.js 14, TypeScript, Tailwind CSS, Recharts |
| RPC | OrbitFlare HTTP + WebSocket, `@solana/web3.js` |
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
    rpc.ts                # OrbitFlare connection, subscriptions, reconnect logic
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
| Public RPC drops WebSocket events under load | High | 1 day, swap to OrbitFlare |
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
| 1 | OrbitFlare RPC integrated, connection hardened | Stable WebSocket connection with reconnect and backoff. Zero silent failures. Devnet demo running cleanly. |
| 2 | Mainnet data pipeline working | Mainnet mode live. All transaction states classified correctly. Timeout logic done. Fee parsing solid. |
| 3 | Production hardening | Load tested on a high-volume program. Rate limiting in place. Sentry set up. Vercel deployment stable. |
| 4 | Public launch | txpulse.xyz live on mainnet. Shareable dashboard URLs working. Launch post published. |

### Infrastructure Needs

We use `logsSubscribe` and `signatureSubscribe` heavily. These are WebSocket subscriptions and they need to stay open and reliable. Public RPCs fall over here which is the core reason we need OrbitFlare.

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

Free tier for one address with 24 hour history. Paid tier at around $15 per month for teams who need multiple addresses, longer history, and alerting. Infrastructure costs stay manageable with OrbitFlare's post-accelerator pricing.

### Roadmap

- Month 1: email and Telegram alerts when failure rate or latency crosses a threshold
- Month 2: multi-address dashboards
- Month 3: persistent history via a small backend and Postgres
- Month 4 onwards: API for teams who want to pull TxPulse data into their own stack

### Continued Infrastructure

Yes. OrbitFlare RPC is not a nice to have here, it is what makes TxPulse actually work at scale. We plan to stay on OrbitFlare and usage will grow as the user base does.

---

## 8. Additional Information

### How did you hear about the OrbitFlare Infra Accelerator?

OrbitFlare's GitHub and the Solana developer community on Twitter.

### Previous Accelerators or Grants

None.

### Anything Else

The core of TxPulse is achievable in the first two weeks. The last two weeks are for hardening and launch. The scope is deliberately kept tight so we can actually ship something useful rather than overpromise.
