"use client";

import { memo, useMemo } from "react";
import { cn } from "@/lib/utils";

interface LatencyChartProps {
  samples: number[];
}

// SVG mini-chart avoids pulling heavy charting libraries for MVP.
function LatencyChartBase({ samples }: LatencyChartProps) {
  const points = useMemo(() => {
    if (samples.length === 0) {
      return "";
    }

    const max = Math.max(...samples);
    const step = samples.length > 1 ? 100 / (samples.length - 1) : 100;

    return samples
      .map((sample, index) => {
        const x = index * step;
        const y = 100 - (sample / Math.max(max, 1)) * 100;
        return `${x},${y}`;
      })
      .join(" ");
  }, [samples]);

  return (
    <section className="rounded-[1.75rem] border border-white/10 bg-white/[0.03] p-4 shadow-[0_20px_60px_rgba(0,0,0,0.28)] sm:p-5">
      <p className="text-[11px] uppercase tracking-[0.3em] text-white/45">Confirmation Latency Trend</p>
      <p className="mt-3 max-w-sm text-sm text-white/60">Rolling confirmation timing from the latest websocket events.</p>
      <div className={cn("mt-5 h-44 rounded-[1.4rem] border border-white/10 bg-black/80 p-4")}>
        <svg viewBox="0 0 100 100" preserveAspectRatio="none" className="h-full w-full">
          <defs>
            <linearGradient id="latencyGradient" x1="0%" y1="0%" x2="100%" y2="0%">
              <stop offset="0%" stopColor="#ffffff" />
              <stop offset="100%" stopColor="#b8b8b8" />
            </linearGradient>
          </defs>
          <polyline
            fill="none"
            stroke="url(#latencyGradient)"
            strokeWidth="2.4"
            strokeLinejoin="round"
            strokeLinecap="round"
            points={points}
          />
        </svg>
      </div>
    </section>
  );
}

export const LatencyChart = memo(LatencyChartBase);
