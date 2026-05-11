import Link from "next/link";
import Image from "next/image";
import { StreamingStatsCard } from "@/components/dashboard/StreamingStatsCard";

const pillars = [
  {
    title: "Network Pulse",
    text: "Watch chain health in real time with confirmation latency, slot lag, and success-rate drift at a glance.",
  },
  {
    title: "Wallet-Aware Flows",
    text: "Connect Phantom and jump directly into a live app route built for rapid transaction feedback loops.",
  },
  {
    title: "Operator Console",
    text: "Gate admin access to approved wallets for controlled visibility into sensitive diagnostic views.",
  },
];

const highlights = [
  "Sub-second websocket-driven updates",
  "Purpose-built for Solana builders",
  "Clear metric language for teams",
  "Monochrome UI for high signal contrast",
];

const steps = [
  {
    label: "Step 01",
    title: "Connect Phantom",
    text: "Authorize once to unlock wallet-aware telemetry and personalized routing.",
  },
  {
    label: "Step 02",
    title: "Open Live Monitor",
    text: "Track transaction performance while you ship, test, or demo your protocol.",
  },
  {
    label: "Step 03",
    title: "Decode Failed Tx",
    text: "Open Understand mode to decode failed hashes in plain English and apply concrete next fixes.",
  },
];

const personas = [
  {
    role: "DeFi Protocol Engineer",
    painPoint: "Transactions look successful in local tests, then fail or stall under real network congestion and fee spikes.",
    solvedBy: "TxPulse exposes confirmation latency and failure-rate drift in real time so engineers can tune priority fees before users churn.",
  },
  {
    role: "NFT Mint Operator",
    painPoint: "Mint windows move fast and teams cannot quickly tell whether drops are caused by wallet spam, slot lag, or unstable routing.",
    solvedBy: "TxPulse surfaces slot lag, throughput, and feed-level status changes on one screen so operators can react during live mint traffic.",
  },
  {
    role: "DAO Infrastructure Lead",
    painPoint: "There is no lightweight way to monitor treasury and ops wallet execution health without exposing private dashboards broadly.",
    solvedBy: "TxPulse pairs wallet-aware monitoring with allowlisted admin access so only approved Phantom accounts can open restricted views.",
  },
];

export default function Home() {
  return (
    <div className="relative min-h-screen overflow-hidden bg-black text-white">
      <div className="pointer-events-none absolute inset-0 bg-[radial-gradient(circle_at_15%_0%,rgba(255,255,255,0.11),transparent_26%),radial-gradient(circle_at_85%_15%,rgba(255,255,255,0.08),transparent_30%),linear-gradient(rgba(255,255,255,0.035)_1px,transparent_1px),linear-gradient(90deg,rgba(255,255,255,0.035)_1px,transparent_1px)] bg-[size:auto,auto,56px_56px,56px_56px] opacity-45" />
      <div className="pulse-orb pointer-events-none absolute -left-24 top-28 h-64 w-64 rounded-full bg-white/15 blur-3xl" />
      <div className="pulse-orb pointer-events-none absolute -right-20 top-[40%] h-72 w-72 rounded-full bg-white/10 blur-3xl [animation-delay:900ms]" />

      <main className="relative z-10 mx-auto w-full max-w-6xl px-4 pb-20 pt-8 sm:px-6 lg:px-8 lg:pt-10">
        <section className="reveal-up">
          <header className="flex flex-col items-center justify-center gap-3 border-b border-white/10 pb-6 text-center">
            <div className="inline-flex items-center gap-2 rounded-full border border-white/15 bg-black/60 px-3 py-1.5 backdrop-blur">
              <Image
                src="/txpulse.png"
                alt="TxPulse logo"
                width={18}
                height={18}
                className="h-[18px] w-[18px] rounded-full object-cover"
                priority
              />
              <p className="text-[10px] uppercase tracking-[0.32em] text-white/55">TxPulse live platform</p>
            </div>
            <div className="text-[11px] uppercase tracking-[0.28em] text-white/40">Solana telemetry • wallet-native</div>
          </header>

          <div className="mt-10 grid gap-10 lg:grid-cols-[1.3fr_0.7fr] lg:gap-12">
            <div className="text-center">
              <p className="text-xs uppercase tracking-[0.35em] text-white/45">Built for shipping teams</p>
              <h1 className="mx-auto mt-4 max-w-3xl text-4xl font-semibold leading-[1.03] tracking-[-0.045em] sm:text-6xl lg:text-7xl">
                Feel every
                <span className="ml-2 inline-block border-b border-white/40 pb-1">transaction pulse</span>
                <br />
                before users do.
              </h1>
              <p className="mx-auto mt-6 max-w-2xl text-sm leading-7 text-white/68 sm:text-base">
                TxPulse gives your team one workspace to watch confirmation behavior in real time and decode failed signatures with next-step fixes.
              </p>

              <div className="mt-9 flex flex-wrap justify-center gap-3">
                <Link
                  href="/app"
                  className="tx-btn-primary px-6"
                >
                  Enter Pulse Console
                </Link>
                <Link
                  href="/explain"
                  className="tx-btn px-6"
                >
                  Open Decoder
                </Link>
              </div>

              <div className="mt-4 flex flex-wrap justify-center gap-4 text-xs text-white/60">
                <p>Wallet-auth only</p>
                <p>Live Solana telemetry</p>
                <p>Failed tx decoder</p>
                <p>No API keys in browser</p>
              </div>

              <div className="mt-10 grid gap-4 sm:grid-cols-2">
                {highlights.map((item, index) => (
                  <div
                    key={item}
                    className="reveal-up rounded-2xl border border-white/10 bg-white/[0.03] px-4 py-4 text-center text-sm text-white/78"
                    style={{ animationDelay: `${120 + index * 120}ms` }}
                  >
                    {item}
                  </div>
                ))}
              </div>
            </div>

            <StreamingStatsCard />
          </div>
        </section>

        <section className="mt-20 reveal-up [animation-delay:250ms]">
          <div className="grid gap-4 lg:grid-cols-3">
            {pillars.map((pillar, index) => (
              <article
                key={pillar.title}
                className="group relative overflow-hidden rounded-3xl border border-white/10 bg-white/[0.025] p-6 text-center transition hover:border-white/25 hover:bg-white/[0.045]"
                style={{ animationDelay: `${320 + index * 120}ms` }}
              >
                <div className="absolute -right-12 -top-12 h-32 w-32 rounded-full border border-white/10 opacity-50 transition group-hover:scale-110" />
                <p className="text-[11px] uppercase tracking-[0.28em] text-white/42">0{index + 1}</p>
                <h2 className="mt-3 text-2xl font-semibold tracking-[-0.03em]">{pillar.title}</h2>
                <p className="mt-3 text-sm leading-7 text-white/66">{pillar.text}</p>
              </article>
            ))}
          </div>
        </section>

        <section className="mt-20 reveal-up [animation-delay:320ms]">
          <div className="rounded-[2rem] border border-white/10 bg-white/[0.02] p-6 sm:p-8">
            <div className="mx-auto max-w-3xl text-center">
              <p className="text-xs uppercase tracking-[0.33em] text-white/45">Who this is for</p>
              <h2 className="mt-3 text-3xl font-semibold tracking-[-0.03em] sm:text-4xl">
                3 builder types, 3 headaches, 0 drama
              </h2>
            </div>

            <div className="mt-8 grid gap-4 lg:grid-cols-3">
              {personas.map((persona, index) => (
                <article
                  key={persona.role}
                  className="reveal-up rounded-2xl border border-white/10 bg-black/35 p-5 text-center"
                  style={{ animationDelay: `${360 + index * 120}ms` }}
                >
                  <p className="text-[11px] uppercase tracking-[0.27em] text-white/45">{persona.role}</p>
                  <p className="mt-4 text-sm leading-7 text-white/72">
                    <span className="font-medium text-white">Pain point:</span> {persona.painPoint}
                  </p>
                  <p className="mt-3 text-sm leading-7 text-white/62">
                    <span className="font-medium text-white">Solved by TxPulse:</span> {persona.solvedBy}
                  </p>
                </article>
              ))}
            </div>
          </div>
        </section>

        <section className="mt-20 reveal-up [animation-delay:380ms]">
          <div className="rounded-[2rem] border border-white/10 bg-white/[0.025] p-6 sm:p-8">
            <div className="flex flex-col items-center justify-center gap-5 text-center">
              <div>
                <p className="text-xs uppercase tracking-[0.33em] text-white/45">Get started in minutes</p>
                <h2 className="mt-3 text-3xl font-semibold tracking-[-0.03em] sm:text-4xl">Your flow from wallet to insight</h2>
              </div>
              <div className="rounded-full border border-white/15 px-4 py-2 text-xs uppercase tracking-[0.28em] text-white/55">
                zero clutter interface
              </div>
            </div>

            <div className="mt-8 grid gap-4 md:grid-cols-3">
              {steps.map((step, index) => (
                <div
                  key={step.label}
                  className="reveal-up rounded-2xl border border-white/10 bg-black/35 p-5 text-center"
                  style={{ animationDelay: `${430 + index * 130}ms` }}
                >
                  <p className="text-[11px] uppercase tracking-[0.27em] text-white/45">{step.label}</p>
                  <h3 className="mt-3 text-xl font-semibold tracking-[-0.02em]">{step.title}</h3>
                  <p className="mt-3 text-sm leading-7 text-white/65">{step.text}</p>
                </div>
              ))}
            </div>
          </div>
        </section>
      </main>
    </div>
  );
}
