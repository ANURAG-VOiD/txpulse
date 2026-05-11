import Link from "next/link";

const topics = [
  { id: "quickstart", title: "Quickstart", number: "01" },
  { id: "architecture", title: "Architecture", number: "02" },
  { id: "stream", title: "Realtime Pipeline", number: "03" },
  { id: "contracts", title: "Payload Contracts", number: "04" },
  { id: "operations", title: "Operations", number: "05" },
  { id: "debug", title: "Debug Playbook", number: "06" },
];

export default function DocsPage() {
  return (
    <div className="relative min-h-screen overflow-hidden bg-black text-white">
      <div className="pointer-events-none absolute inset-0 bg-[radial-gradient(circle_at_12%_6%,rgba(255,255,255,0.12),transparent_24%),radial-gradient(circle_at_88%_14%,rgba(255,255,255,0.08),transparent_28%),linear-gradient(rgba(255,255,255,0.03)_1px,transparent_1px),linear-gradient(90deg,rgba(255,255,255,0.03)_1px,transparent_1px)] bg-[size:auto,auto,54px_54px,54px_54px] opacity-35" />
      <div className="pointer-events-none absolute -left-24 top-24 h-72 w-72 rounded-full bg-white/10 blur-3xl" />
      <div className="pointer-events-none absolute -right-20 top-[28%] h-72 w-72 rounded-full bg-white/10 blur-3xl" />

      <main className="relative z-10 mx-auto w-full max-w-7xl px-4 py-8 sm:px-6 lg:px-8">
        <header className="relative overflow-hidden rounded-[2rem] border border-white/12 bg-white/[0.04] p-6 sm:p-8 lg:p-10">
          <div className="pointer-events-none absolute inset-0 bg-[radial-gradient(circle_at_0%_0%,rgba(255,255,255,0.2),transparent_28%),radial-gradient(circle_at_100%_100%,rgba(255,255,255,0.12),transparent_32%)]" />

          <div className="relative grid gap-6 lg:grid-cols-[1fr_260px] lg:items-end">
            <div>
              <p className="text-[11px] uppercase tracking-[0.34em] text-white/50">TxPulse cookbook</p>
              <h1 className="mt-3 text-4xl font-semibold tracking-[-0.05em] sm:text-6xl">Ship fast without guessing</h1>
              <p className="mt-4 max-w-2xl text-sm leading-7 text-white/72 sm:text-base">
                This page is your operator manual with good taste. It follows the real code paths and helps you go from blank terminal to live monitor without drama.
              </p>

              <div className="mt-6 flex flex-wrap gap-3 text-sm">
                <Link
                  href="/app"
                  className="tx-btn-primary px-5"
                >
                  Open App
                </Link>
                <Link
                  href="/explain"
                  className="tx-btn px-5"
                >
                  Open Decoder
                </Link>
                <Link
                  href="/admin"
                  className="tx-btn px-5"
                >
                  Open Admin
                </Link>
              </div>
            </div>

            <div className="rounded-2xl border border-white/12 bg-black/55 p-4">
              <p className="text-[10px] uppercase tracking-[0.26em] text-white/45">Quick command stack</p>
              <div className="mt-3 space-y-2 font-mono text-xs text-white/85">
                <p className="rounded-lg bg-white/5 px-3 py-2">cd backend && cargo run</p>
                <p className="rounded-lg bg-white/5 px-3 py-2">cd frontend && yarn dev</p>
                <p className="rounded-lg bg-white/5 px-3 py-2">curl 127.0.0.1:3000/health</p>
              </div>
            </div>
          </div>
        </header>

        <section className="mt-8 grid gap-6 lg:grid-cols-[1fr_280px]">
          <article className="space-y-5">
            <section id="quickstart" className="rounded-[1.6rem] border border-white/10 bg-white/[0.03] p-5 sm:p-7">
              <p className="text-[11px] uppercase tracking-[0.3em] text-white/45">Quickstart</p>
              <h2 className="mt-2 text-3xl font-semibold tracking-[-0.04em]">From zero to live stream in four moves</h2>
              <div className="mt-5 grid gap-3 sm:grid-cols-2">
                <div className="rounded-xl border border-white/10 bg-black/50 p-4">
                  <p className="text-[10px] uppercase tracking-[0.24em] text-white/45">Move 1</p>
                  <p className="mt-2 text-sm text-white/80">Run backend and keep it alive.</p>
                </div>
                <div className="rounded-xl border border-white/10 bg-black/50 p-4">
                  <p className="text-[10px] uppercase tracking-[0.24em] text-white/45">Move 2</p>
                  <p className="mt-2 text-sm text-white/80">Run frontend and open the monitor app.</p>
                </div>
                <div className="rounded-xl border border-white/10 bg-black/50 p-4">
                  <p className="text-[10px] uppercase tracking-[0.24em] text-white/45">Move 3</p>
                  <p className="mt-2 text-sm text-white/80">Connect wallet and choose any target address.</p>
                </div>
                <div className="rounded-xl border border-white/10 bg-black/50 p-4">
                  <p className="text-[10px] uppercase tracking-[0.24em] text-white/45">Move 4</p>
                  <p className="mt-2 text-sm text-white/80">Watch feed, latency trend, and metrics update live.</p>
                </div>
              </div>
            </section>

            <section id="architecture" className="rounded-[1.6rem] border border-white/10 bg-white/[0.03] p-5 sm:p-7">
              <p className="text-[11px] uppercase tracking-[0.3em] text-white/45">Architecture</p>
              <h2 className="mt-2 text-3xl font-semibold tracking-[-0.04em]">Browser to backend to Helius</h2>
              <p className="mt-4 text-sm leading-7 text-white/75">
                Frontend streams from Rust backend only. Backend handles logsSubscribe and getTransaction enrichment. This keeps browser clean and secrets out of client code.
              </p>
              <div className="mt-4 flex flex-wrap gap-2 text-xs">
                <span className="rounded-full border border-white/20 bg-black/60 px-3 py-1.5 text-white/80">/monitor/:address</span>
                <span className="rounded-full border border-white/20 bg-black/60 px-3 py-1.5 text-white/80">/health</span>
                <span className="rounded-full border border-white/20 bg-black/60 px-3 py-1.5 text-white/80">/admin/metrics</span>
              </div>
            </section>

            <section id="stream" className="rounded-[1.6rem] border border-white/10 bg-white/[0.03] p-5 sm:p-7">
              <p className="text-[11px] uppercase tracking-[0.3em] text-white/45">Realtime Pipeline</p>
              <h2 className="mt-2 text-3xl font-semibold tracking-[-0.04em]">How events become useful signal</h2>
              <ol className="mt-4 space-y-2 text-sm leading-7 text-white/80">
                <li>Client opens monitor websocket for chosen address.</li>
                <li>Backend validates pubkey and starts per client stream loop.</li>
                <li>Backend sends bootstrap recent events so UI is not empty.</li>
                <li>Live logs trigger signature enrichment with retries.</li>
                <li>Backend pushes transaction envelopes and rolling metrics.</li>
              </ol>
            </section>

            <section id="contracts" className="rounded-[1.6rem] border border-white/10 bg-white/[0.03] p-5 sm:p-7">
              <p className="text-[11px] uppercase tracking-[0.3em] text-white/45">Payload Contracts</p>
              <h2 className="mt-2 text-3xl font-semibold tracking-[-0.04em]">What the socket sends</h2>
              <pre className="mt-4 overflow-x-auto rounded-2xl border border-white/10 bg-black/70 p-4 text-xs text-white/85">
{`type: NEW_TRANSACTION
fields: signature, status, timestamp, computeUnitsConsumed,
priorityFeeMicrolamports, confirmationLatencyMs, slot

type: METRICS_UPDATE
fields: successRatePct, avgConfirmationMs, currentSlotLag, txPerMinute`}
              </pre>
            </section>

            <section id="operations" className="rounded-[1.6rem] border border-white/10 bg-white/[0.03] p-5 sm:p-7">
              <p className="text-[11px] uppercase tracking-[0.3em] text-white/45">Operations</p>
              <h2 className="mt-2 text-3xl font-semibold tracking-[-0.04em]">Everyday local checklist</h2>
              <div className="mt-4 grid gap-3 sm:grid-cols-3">
                <div className="rounded-xl border border-white/10 bg-black/55 p-4">
                  <p className="text-xs uppercase tracking-[0.24em] text-white/45">Health</p>
                  <p className="mt-2 font-mono text-xs text-white/85">curl 127.0.0.1:3000/health</p>
                </div>
                <div className="rounded-xl border border-white/10 bg-black/55 p-4">
                  <p className="text-xs uppercase tracking-[0.24em] text-white/45">Frontend</p>
                  <p className="mt-2 font-mono text-xs text-white/85">cd frontend && yarn lint</p>
                </div>
                <div className="rounded-xl border border-white/10 bg-black/55 p-4">
                  <p className="text-xs uppercase tracking-[0.24em] text-white/45">Backend</p>
                  <p className="mt-2 font-mono text-xs text-white/85">cd backend && cargo check</p>
                </div>
              </div>
            </section>

            <section id="debug" className="rounded-[1.6rem] border border-white/10 bg-white/[0.03] p-5 sm:p-7">
              <p className="text-[11px] uppercase tracking-[0.3em] text-white/45">Debug Playbook</p>
              <h2 className="mt-2 text-3xl font-semibold tracking-[-0.04em]">When things go weird</h2>
              <div className="mt-4 space-y-3 text-sm text-white/78">
                <p><span className="text-white">Connecting forever:</span> backend is down or target address is invalid.</p>
                <p><span className="text-white">Duplicate feed rows:</span> check dedupe behavior in socket pipeline.</p>
                <p><span className="text-white">No admin metrics:</span> verify backend CORS and endpoint availability.</p>
                <p><span className="text-white">Funny latency values:</span> wait for fresh live samples after bootstrap.</p>
              </div>
            </section>
          </article>

          <aside className="h-fit lg:sticky lg:top-6">
            <div className="rounded-[1.6rem] border border-white/10 bg-white/[0.03] p-4">
              <p className="text-[11px] uppercase tracking-[0.3em] text-white/45">Topics</p>
              <div className="mt-4 space-y-2 border-l border-white/15 pl-3">
                {topics.map((topic) => (
                  <a
                    key={topic.id}
                    href={`#${topic.id}`}
                    className="group flex items-center justify-between rounded-lg px-2 py-2 text-sm text-white/72 transition hover:bg-white/6 hover:text-white"
                  >
                    <span className="inline-flex items-center gap-2">
                      <span className="font-mono text-[10px] text-white/45">{topic.number}</span>
                      {topic.title}
                    </span>
                    <span className="text-[10px] uppercase tracking-[0.18em] text-white/35 group-hover:text-white/70">go</span>
                  </a>
                ))}
              </div>

              <div className="mt-4 rounded-xl border border-white/10 bg-black/60 p-3">
                <p className="text-[10px] uppercase tracking-[0.2em] text-white/45">Tiny truth</p>
                <p className="mt-2 text-xs leading-5 text-white/72">
                  If this page looks calm, it means someone already panicked and fixed things for you.
                </p>
              </div>
            </div>
          </aside>
        </section>
      </main>
    </div>
  );
}
