"use client";

import { memo } from "react";
import type { TxEvent } from "@/lib/types";
import { cn } from "@/lib/utils";

interface TransactionFeedProps {
  events: TxEvent[];
  onSelectFailed?: (signature: string) => void;
  selectedSignature?: string | null;
}

const statusClassMap: Record<TxEvent["status"], string> = {
  success: "border-white/15 bg-white text-black",
  failed: "border-white/15 bg-white/10 text-white",
  dropped: "border-white/15 bg-white/10 text-white/70",
  pending: "border-white/15 bg-white/10 text-white/85",
};

// Virtualization can replace this list once event velocity increases.
function TransactionFeedBase({ events, onSelectFailed, selectedSignature }: TransactionFeedProps) {
  return (
    <section id="feed" className="border-t border-white/12 pt-4 sm:pt-5">
      <div className="mb-4 flex items-center justify-between">
        <p className="text-[11px] uppercase tracking-[0.3em] text-white/45">Live Transaction Feed</p>
        <span className="rounded-full border border-white/12 px-2.5 py-1 text-xs text-white/55">{events.length} cached</span>
      </div>

      <div className="mb-2 hidden grid-cols-[1.4fr_0.55fr_0.45fr_0.6fr] gap-3 border-b border-white/10 px-1 pb-2 text-[10px] uppercase tracking-[0.2em] text-white/45 md:grid">
        <p>Signature</p>
        <p>Status</p>
        <p>Latency</p>
        <p>Priority Fee</p>
      </div>

      <div className="space-y-1">
        {events.length === 0 && (
          <div className="border border-dashed border-white/15 bg-black/45 p-6 text-sm text-white/65">
            <p className="font-medium text-white/85">No transactions yet.</p>
            <p className="mt-2">Keep this page open. New events will appear as soon as the monitored wallet or program produces activity.</p>
          </div>
        )}
        {events.map((event, index) => (
          <article
            key={`${event.signature}-${event.slot}-${event.timestamp}-${index}`}
            className={cn(
              "grid grid-cols-1 gap-2 border-b border-white/10 py-3.5 md:grid-cols-[1.4fr_0.55fr_0.45fr_0.6fr] md:items-center",
              event.status === "failed" ? "cursor-pointer transition hover:bg-white/[0.04]" : "",
              selectedSignature === event.signature && "bg-white/[0.06]",
            )}
            onClick={() => {
              if (event.status === "failed") {
                onSelectFailed?.(event.signature);
              }
            }}
            role={event.status === "failed" ? "button" : undefined}
            tabIndex={event.status === "failed" ? 0 : -1}
            onKeyDown={(keyboardEvent) => {
              if (event.status !== "failed") {
                return;
              }

              if (keyboardEvent.key === "Enter" || keyboardEvent.key === " ") {
                keyboardEvent.preventDefault();
                onSelectFailed?.(event.signature);
              }
            }}
          >
            <div>
              <p className="truncate font-mono text-xs text-white/90 md:pr-2">{event.signature}</p>
              <p className="mt-1 text-xs text-white/40">Slot {event.slot.toLocaleString()}</p>
            </div>
            <span className={`w-fit rounded-full border px-2.5 py-1 text-[11px] uppercase tracking-[0.2em] ${statusClassMap[event.status]}`}>
              {event.status}
            </span>
            <p className="text-sm text-white/80">{event.confirmationLatencyMs} ms</p>
            <p className="text-sm text-white/55">{event.priorityFeeMicrolamports} µ-lamports</p>

            <div className="mt-1 flex flex-wrap items-center gap-2 md:hidden">
              <span className="rounded-full border border-white/12 px-2 py-0.5 text-[10px] text-white/65">lat {event.confirmationLatencyMs}ms</span>
              <span className="rounded-full border border-white/12 px-2 py-0.5 text-[10px] text-white/65">fee {event.priorityFeeMicrolamports}</span>
            </div>
          </article>
        ))}
      </div>

      <p className="mt-3 text-xs text-white/45">Tip: click a failed row to populate Understand mode instantly.</p>
    </section>
  );
}

export const TransactionFeed = memo(TransactionFeedBase);
