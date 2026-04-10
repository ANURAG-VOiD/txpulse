"use client";

import { useMemo, useState } from "react";
import { motion } from "framer-motion";
import { AddressInput } from "@/components/dashboard/AddressInput";
import { FloatingNav } from "@/components/dashboard/FloatingNav";
import { LatencyChart } from "@/components/dashboard/LatencyChart";
import { MetricsGrid } from "@/components/dashboard/MetricsGrid";
import { TransactionFeed } from "@/components/dashboard/TransactionFeed";
import type { MetricsUpdate, TxEvent } from "@/lib/types";

const mockMetrics: MetricsUpdate = {
  successRatePct: 98.7,
  avgConfirmationMs: 912,
  currentSlotLag: 2,
  txPerMinute: 241,
};

const mockEvents: TxEvent[] = [
  { signature: "4mQh...b9F1", status: "success", timestamp: "11:42:01", computeUnitsConsumed: 14120, priorityFeeMicrolamports: 5000, confirmationLatencyMs: 822, slot: 281001221 },
  { signature: "3xLt...fR9P", status: "failed", timestamp: "11:42:03", computeUnitsConsumed: 10014, priorityFeeMicrolamports: 2500, confirmationLatencyMs: 1320, slot: 281001224 },
  { signature: "8pvA...cD12", status: "success", timestamp: "11:42:04", computeUnitsConsumed: 16270, priorityFeeMicrolamports: 6000, confirmationLatencyMs: 751, slot: 281001226 },
  { signature: "7kPJ...oo91", status: "pending", timestamp: "11:42:07", computeUnitsConsumed: 12090, priorityFeeMicrolamports: 3000, confirmationLatencyMs: 0, slot: 281001232 },
  { signature: "2vbC...a77Q", status: "dropped", timestamp: "11:42:10", computeUnitsConsumed: 0, priorityFeeMicrolamports: 2000, confirmationLatencyMs: 2120, slot: 281001241 },
];

export default function Home() {
  const [address, setAddress] = useState("");

  // Derived trend data is memoized for stable chart rendering.
  const latencySamples = useMemo(
    () => [920, 870, 1040, 790, 740, 800, 980, 910, 890, 760, 740, 810],
    [],
  );

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
            <AddressInput value={address} onChange={setAddress} />
          </div>
        </motion.section>

        <MetricsGrid metrics={mockMetrics} />

        <section className="grid grid-cols-1 gap-4 lg:grid-cols-[0.9fr_1.1fr]">
          <LatencyChart samples={latencySamples} />
          <TransactionFeed events={mockEvents} />
        </section>

        <footer id="docs" className="pb-8 text-center text-xs text-slate-400">
          Built for teams shipping on Solana. Planned next: resilient WebSocket reconnect with exponential backoff.
        </footer>
      </main>
    </div>
  );
}
