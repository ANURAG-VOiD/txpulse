"use client";

import { memo } from "react";
import { cn } from "@/lib/utils";

interface AddressInputProps {
  value: string;
  onChange: (value: string) => void;
  onMonitor: () => void;
  onStop?: () => void;
  statusText: string;
  disabled?: boolean;
  stopDisabled?: boolean;
}

// Controlled input to plug in future WS subscription logic.
function AddressInputBase({
  value,
  onChange,
  onMonitor,
  onStop,
  statusText,
  disabled = false,
  stopDisabled = false,
}: AddressInputProps) {
  return (
    <section className="border border-white/10 bg-white/[0.02] p-4 sm:p-5">
      <div className="mb-3 flex flex-wrap items-center justify-between gap-2">
        <div>
          <label htmlFor="address" className="block text-[11px] uppercase tracking-[0.28em] text-white/50">
            Solana Wallet / Program Address
          </label>
          <p className="mt-1 text-xs text-white/50">Set a target to begin live monitoring.</p>
        </div>
        <span className="rounded-full border border-white/12 bg-black/40 px-3 py-1 text-[10px] uppercase tracking-[0.18em] text-white/60">
          watch target
        </span>
      </div>

      <div className="grid gap-2 md:grid-cols-[1fr_auto_auto] md:items-center">
        <input
          id="address"
          value={value}
          onChange={(event) => onChange(event.target.value)}
          placeholder="Paste address and start monitoring..."
          className={cn(
            "w-full rounded-lg border border-white/12 bg-black/65 px-4 py-3 text-sm text-white outline-none transition placeholder:text-white/30 focus:border-white/35 focus:ring-1 focus:ring-white/30",
            disabled && "cursor-not-allowed opacity-70",
          )}
          autoComplete="off"
          spellCheck={false}
          disabled={disabled}
        />
        <button
          type="button"
          onClick={onMonitor}
          disabled={disabled || value.trim().length === 0}
          className="tx-btn h-12 px-5 text-sm"
        >
          Monitor
        </button>
        <button
          type="button"
          onClick={onStop}
          disabled={disabled || stopDisabled || !onStop}
          className="tx-btn-ghost h-12 px-5 text-sm"
        >
          Stop
        </button>
      </div>
      <p className="mt-3 rounded-lg border border-white/8 bg-black/35 px-3 py-2 text-xs leading-5 text-white/60">
        {statusText}
      </p>
    </section>
  );
}

export const AddressInput = memo(AddressInputBase);
