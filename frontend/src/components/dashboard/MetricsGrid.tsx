"use client";

import { memo, useMemo } from "react";
import type { MetricsUpdate } from "@/lib/types";
import { cn } from "@/lib/utils";

interface MetricsGridProps {
  metrics: MetricsUpdate;
}

// Memoized cards avoid unnecessary rerenders once socket updates are frequent.
function MetricsGridBase({ metrics }: MetricsGridProps) {
  const cards = useMemo(
    () => [
      { label: "Success Rate", value: `${metrics.successRatePct.toFixed(1)}%`, detail: "Healthy confirmations" },
      { label: "Avg Confirmation", value: `${Math.round(metrics.avgConfirmationMs)} ms`, detail: "Observed latency" },
      { label: "Slot Lag", value: `${metrics.currentSlotLag}`, detail: "Current drift" },
      { label: "Throughput", value: `${metrics.txPerMinute} tx/min`, detail: "Live feed pace" },
    ],
    [metrics],
  );

  return (
    <section
      id="dashboard"
      className="grid grid-cols-1 gap-4 sm:grid-cols-2 xl:grid-cols-4"
      aria-label="Transaction health metrics"
    >
      {cards.map((card) => (
        <article
          key={card.label}
          className={cn(
            "group relative overflow-hidden rounded-[1.75rem] border border-white/10 bg-white/[0.03] p-[1px] shadow-[0_20px_60px_rgba(0,0,0,0.28)] transition-transform duration-300 hover:-translate-y-1",
          )}
        >
          <div className="absolute inset-x-0 top-0 h-px bg-gradient-to-r from-transparent via-white/40 to-transparent opacity-60" />
          <div className="rounded-[1.7rem] bg-black/80 p-4 sm:p-5">
            <p className="text-[11px] uppercase tracking-[0.3em] text-white/45">{card.label}</p>
            <p className="mt-3 text-3xl font-semibold tracking-tight text-white">{card.value}</p>
            <p className="mt-4 text-sm text-white/55">{card.detail}</p>
          </div>
        </article>
      ))}
    </section>
  );
}

export const MetricsGrid = memo(MetricsGridBase);
