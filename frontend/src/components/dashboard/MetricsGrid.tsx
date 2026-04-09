"use client";

import { memo, useMemo } from "react";
import type { MetricsUpdate } from "@/lib/types";

interface MetricsGridProps {
  metrics: MetricsUpdate;
}

// Memoized cards avoid unnecessary rerenders once socket updates are frequent.
function MetricsGridBase({ metrics }: MetricsGridProps) {
  const cards = useMemo(
    () => [
      { label: "Success Rate", value: `${metrics.successRatePct.toFixed(1)}%`, glow: "from-emerald-300/40 to-emerald-500/10" },
      { label: "Avg Confirmation", value: `${Math.round(metrics.avgConfirmationMs)} ms`, glow: "from-cyan-300/40 to-cyan-500/10" },
      { label: "Slot Lag", value: `${metrics.currentSlotLag}`, glow: "from-violet-300/40 to-violet-500/10" },
      { label: "Throughput", value: `${metrics.txPerMinute} tx/min`, glow: "from-fuchsia-300/40 to-fuchsia-500/10" },
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
          className={`rounded-2xl border border-white/10 bg-gradient-to-br ${card.glow} p-[1px]`}
        >
          <div className="rounded-2xl bg-slate-950/85 p-4">
            <p className="text-xs uppercase tracking-wider text-slate-400">{card.label}</p>
            <p className="mt-2 text-2xl font-semibold text-slate-100">{card.value}</p>
          </div>
        </article>
      ))}
    </section>
  );
}

export const MetricsGrid = memo(MetricsGridBase);
