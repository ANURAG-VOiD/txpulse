"use client";

import { memo } from "react";
import type { TxEvent } from "@/lib/types";

interface TransactionFeedProps {
  events: TxEvent[];
}

const statusClassMap: Record<TxEvent["status"], string> = {
  success: "bg-emerald-300/20 text-emerald-200 border border-emerald-300/30",
  failed: "bg-rose-300/20 text-rose-200 border border-rose-300/30",
  dropped: "bg-amber-300/20 text-amber-200 border border-amber-300/30",
  pending: "bg-sky-300/20 text-sky-200 border border-sky-300/30",
};

// Virtualization can replace this list once event velocity increases.
function TransactionFeedBase({ events }: TransactionFeedProps) {
  return (
    <section id="feed" className="rounded-2xl border border-white/10 bg-slate-900/60 p-4">
      <div className="mb-3 flex items-center justify-between">
        <p className="text-sm font-medium text-slate-200">Live Transaction Feed</p>
        <span className="text-xs text-slate-400">{events.length} events cached</span>
      </div>
      <div className="space-y-2">
        {events.map((event) => (
          <article
            key={event.signature}
            className="grid grid-cols-1 gap-3 rounded-xl border border-white/10 bg-slate-950/80 p-3 md:grid-cols-5 md:items-center"
          >
            <p className="truncate text-xs text-slate-300 md:col-span-2">{event.signature}</p>
            <span className={`w-fit rounded-full px-2 py-1 text-xs ${statusClassMap[event.status]}`}>
              {event.status}
            </span>
            <p className="text-xs text-slate-300">{event.confirmationLatencyMs} ms</p>
            <p className="text-xs text-slate-400">Fee {event.priorityFeeMicrolamports} µ-lamports</p>
          </article>
        ))}
      </div>
    </section>
  );
}

export const TransactionFeed = memo(TransactionFeedBase);
