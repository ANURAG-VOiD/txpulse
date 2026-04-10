"use client";

import { memo, useMemo } from "react";

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
    <section className="rounded-2xl border border-white/10 bg-slate-900/60 p-4">
      <p className="text-sm font-medium text-slate-200">Confirmation Latency Trend</p>
      <p className="mt-1 text-xs text-slate-400">Last 12 tx snapshots</p>
      <div className="mt-4 h-40 rounded-xl border border-cyan-300/20 bg-slate-950/80 p-3">
        <svg viewBox="0 0 100 100" preserveAspectRatio="none" className="h-full w-full">
          <defs>
            <linearGradient id="latencyGradient" x1="0%" y1="0%" x2="100%" y2="0%">
              <stop offset="0%" stopColor="#22d3ee" />
              <stop offset="100%" stopColor="#a78bfa" />
            </linearGradient>
          </defs>
          <polyline
            fill="none"
            stroke="url(#latencyGradient)"
            strokeWidth="2.6"
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
