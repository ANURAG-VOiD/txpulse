"use client";

import { memo } from "react";
import type { TxEvent } from "@/lib/types";
import { cn } from "@/lib/utils";

interface TransactionFeedProps {
  events: TxEvent[];
}

const statusClassMap: Record<TxEvent["status"], string> = {
  success: "border-white/15 bg-white text-black",
  failed: "border-white/15 bg-white/10 text-white",
  dropped: "border-white/15 bg-white/10 text-white/70",
  pending: "border-white/15 bg-white/10 text-white/85",
};

// Virtualization can replace this list once event velocity increases.
function TransactionFeedBase({ events }: TransactionFeedProps) {
  return (
    <section id="feed" className="rounded-[1.75rem] border border-white/10 bg-white/[0.03] p-4 shadow-[0_20px_60px_rgba(0,0,0,0.28)] sm:p-5">
      <div className="mb-4 flex items-center justify-between">
        <p className="text-[11px] uppercase tracking-[0.3em] text-white/45">Live Transaction Feed</p>
        <span className="text-xs text-white/45">{events.length} events cached</span>
      </div>
      <div className="space-y-3">
        {events.map((event) => (
          <article
            key={event.signature}
            className={cn(
              "grid grid-cols-1 gap-3 rounded-[1.3rem] border border-white/10 bg-black/75 p-4 md:grid-cols-[1.4fr_0.5fr_0.4fr_0.6fr] md:items-center",
            )}
          >
            <div>
              <p className="truncate text-sm text-white">{event.signature}</p>
              <p className="mt-1 text-xs text-white/40">Slot {event.slot.toLocaleString()}</p>
            </div>
            <span className={`w-fit rounded-full border px-2.5 py-1 text-[11px] uppercase tracking-[0.2em] ${statusClassMap[event.status]}`}>
              {event.status}
            </span>
            <p className="text-sm text-white/80">{event.confirmationLatencyMs} ms</p>
            <p className="text-sm text-white/45">Fee {event.priorityFeeMicrolamports} µ-lamports</p>
          </article>
        ))}
      </div>
    </section>
  );
}

export const TransactionFeed = memo(TransactionFeedBase);
