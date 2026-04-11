"use client";

import { useMemo, useState } from "react";
import { motion } from "framer-motion";
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

  return (
    <div className="relative min-h-screen overflow-hidden bg-slate-950 text-slate-100">
      <div className="pointer-events-none absolute inset-0 bg-[radial-gradient(circle_at_20%_20%,rgba(34,211,238,0.2),transparent_45%),radial-gradient(circle_at_80%_0%,rgba(139,92,246,0.22),transparent_45%)]" />
      <main className="relative z-10 mx-auto flex w-full max-w-6xl flex-col gap-6 px-4 py-5 sm:px-6 lg:px-8">
        <FloatingNav />

        <motion.section
          initial={{ opacity: 0, y: 8 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.4, ease: "easeOut" }}
          className="rounded-3xl border border-white/10 bg-slate-900/50 p-5 shadow-[0_0_50px_rgba(56,189,248,0.14)] sm:p-8"
        >
          <p className="text-xs uppercase tracking-[0.26em] text-cyan-200/80">Real-time Solana telemetry</p>
          <h1 className="mt-2 text-3xl font-semibold tracking-tight text-slate-100 sm:text-5xl">
            Monitor transaction health with live signal clarity.
          </h1>
          <p className="mt-3 max-w-3xl text-sm text-slate-300 sm:text-base">
            TxPulse streams status, confirmation latency, slot lag, and priority fee behavior per address in a single operational view.
          </p>
          <div className="mt-6">
            <AddressInput
              value={address}
              onChange={setAddress}
              onMonitor={startMonitoring}
              statusText={statusText}
            />
          </div>
        </motion.section>

        <MetricsGrid metrics={metrics} />

        <section className="grid grid-cols-1 gap-4 lg:grid-cols-[0.9fr_1.1fr]">
          <LatencyChart samples={latencySamples} />
          <TransactionFeed events={events} />
        </section>

        <footer id="docs" className="pb-8 text-center text-xs text-slate-400">
          Built for teams shipping on Solana. Planned next: resilient WebSocket reconnect with exponential backoff.
        </footer>
      </main>
    </div>
  );
}
