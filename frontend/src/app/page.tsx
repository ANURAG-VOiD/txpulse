"use client";

import { useMemo, useState } from "react";
import Image from "next/image";
import { AddressInput } from "@/components/dashboard/AddressInput";
import { FloatingNav } from "@/components/dashboard/FloatingNav";
import { LatencyChart } from "@/components/dashboard/LatencyChart";
import { MetricsGrid } from "@/components/dashboard/MetricsGrid";
import { TransactionFeed } from "@/components/dashboard/TransactionFeed";
import { useTxPulseSocket } from "@/lib/useTxPulseSocket";

export default function Home() {
  const [address, setAddress] = useState("");
  const {
    metrics,
    events,
    status,
    lastError,
    activeAddress,
    latencySamples,
    startMonitoring,
  } = useTxPulseSocket(address);

  const statusText = useMemo(() => {
    if (lastError) {
      return `Error: ${lastError}`;
    }

    if (status === "connected" && activeAddress) {
      return `Connected to ${activeAddress}`;
    }

    if (status === "reconnecting") {
      return "Connection interrupted. Reconnecting with backoff...";
    }

    if (status === "connecting") {
      return "Connecting to backend monitor...";
    }

    return "Enter an address and start monitoring live events.";
  }, [activeAddress, lastError, status]);

  const heroStats = useMemo(
    () => [
      { label: "Events", value: `${events.length}` },
      { label: "Success", value: `${metrics.successRatePct.toFixed(1)}%` },
      { label: "Latency", value: `${Math.round(metrics.avgConfirmationMs)} ms` },
    ],
    [events.length, metrics.avgConfirmationMs, metrics.successRatePct],
  );

  return (
    <div className="relative min-h-screen overflow-hidden bg-black text-white">
      <div className="pointer-events-none absolute inset-0 bg-[radial-gradient(circle_at_12%_8%,rgba(255,255,255,0.09),transparent_24%),linear-gradient(rgba(255,255,255,0.03)_1px,transparent_1px),linear-gradient(90deg,rgba(255,255,255,0.03)_1px,transparent_1px)] bg-[size:auto,56px_56px,56px_56px] opacity-35" />

      <main className="relative z-10 mx-auto flex w-full max-w-6xl flex-col gap-6 px-4 py-5 sm:px-6 lg:px-8">
        <FloatingNav />

        <section id="overview" className="grid gap-6 lg:grid-cols-[1.05fr_0.95fr] lg:items-stretch">
          <div className="relative overflow-hidden rounded-[2rem] border border-white/10 bg-white/[0.03] p-6 shadow-[0_18px_60px_rgba(0,0,0,0.32)] sm:p-8">
            <div className="absolute inset-0 bg-[radial-gradient(circle_at_20%_10%,rgba(255,255,255,0.12),transparent_28%),radial-gradient(circle_at_80%_0%,rgba(255,255,255,0.06),transparent_22%)]" />
            <div className="relative">
              <div className="inline-flex items-center gap-2 rounded-full border border-white/10 bg-black/60 px-3 py-1.5">
                <Image
                  src="/txpulse.png"
                  alt="TxPulse logo"
                  width={18}
                  height={18}
                  className="h-[18px] w-[18px] rounded-full object-cover"
                  priority
                />
                <p className="text-[10px] uppercase tracking-[0.36em] text-white/45">Realtime Solana intelligence</p>
              </div>
              <h1 className="mt-4 max-w-3xl text-4xl font-semibold tracking-[-0.04em] text-white sm:text-6xl">
                Transaction monitoring that feels like a product, not a prototype.
              </h1>
              <p className="mt-5 max-w-2xl text-sm leading-6 text-white/65 sm:text-base">
                TxPulse listens to your Solana address, turns live websocket activity into a clean feed, and keeps the interface minimal enough for a grant demo without looking unfinished.
              </p>

              <div className="mt-8">
                <AddressInput
                  value={address}
                  onChange={setAddress}
                  onMonitor={startMonitoring}
                  statusText={statusText}
                />
              </div>

              <div className="mt-8 grid gap-3 sm:grid-cols-3">
                {heroStats.map((stat) => (
                  <div key={stat.label} className="rounded-[1.25rem] border border-white/10 bg-black/70 px-4 py-3">
                    <p className="text-[10px] uppercase tracking-[0.28em] text-white/40">{stat.label}</p>
                    <p className="mt-2 text-lg font-medium text-white">{stat.value}</p>
                  </div>
                ))}
              </div>
            </div>
          </div>

          <div className="flex h-full flex-col gap-4 rounded-[2rem] border border-white/10 bg-white/[0.03] p-5 shadow-[0_18px_60px_rgba(0,0,0,0.32)] sm:p-6">
            <div>
              <p className="text-[11px] uppercase tracking-[0.34em] text-white/45">Live summary</p>
              <p className="mt-3 text-2xl font-semibold tracking-tight text-white">
                Clean event stream, quiet UI, no unnecessary noise.
              </p>
            </div>

            <div className="grid grid-cols-2 gap-3">
              <div className="rounded-[1.25rem] border border-white/10 bg-black/70 p-4">
                <p className="text-[10px] uppercase tracking-[0.28em] text-white/40">Status</p>
                <p className="mt-2 text-sm text-white/85">{status}</p>
              </div>
              <div className="rounded-[1.25rem] border border-white/10 bg-black/70 p-4">
                <p className="text-[10px] uppercase tracking-[0.28em] text-white/40">Address</p>
                <p className="mt-2 truncate text-sm text-white/85">{activeAddress || "Waiting for input"}</p>
              </div>
              <div className="rounded-[1.25rem] border border-white/10 bg-black/70 p-4">
                <p className="text-[10px] uppercase tracking-[0.28em] text-white/40">Slot lag</p>
                <p className="mt-2 text-sm text-white/85">{metrics.currentSlotLag}</p>
              </div>
              <div className="rounded-[1.25rem] border border-white/10 bg-black/70 p-4">
                <p className="text-[10px] uppercase tracking-[0.28em] text-white/40">Throughput</p>
                <p className="mt-2 text-sm text-white/85">{metrics.txPerMinute} tx/min</p>
              </div>
            </div>

            <div className="flex-1 rounded-[1.5rem] border border-white/10 bg-black/75 p-4">
              <p className="text-[11px] uppercase tracking-[0.3em] text-white/45">Design notes</p>
              <ul className="mt-4 space-y-3 text-sm leading-6 text-white/60">
                <li>• Solana-inspired editorial spacing and oversized type.</li>
                <li>• Aceternity-style cards, beam surfaces, and layered depth.</li>
                <li>• Pure monochrome palette with restrained highlights.</li>
              </ul>
            </div>
          </div>
        </section>

        <MetricsGrid metrics={metrics} />

        <section className="grid grid-cols-1 gap-4 lg:grid-cols-[0.92fr_1.08fr]">
          <LatencyChart samples={latencySamples} />
          <TransactionFeed events={events} />
        </section>

        <footer id="docs" className="pb-8 text-center text-[11px] uppercase tracking-[0.28em] text-white/35">
          <div className="mx-auto mb-3 inline-flex items-center gap-2 rounded-full border border-white/10 bg-black/60 px-3 py-1.5">
            <Image
              src="/txpulse.png"
              alt="TxPulse logo"
              width={16}
              height={16}
              className="h-4 w-4 rounded-full object-cover"
            />
            <span>TxPulse</span>
          </div>
          <p>Built for Solana teams shipping a grant-ready POC.</p>
        </footer>
      </main>
    </div>
  );
}
