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
    <section className="border-t border-white/12 pt-4 sm:pt-5">
      <div className="mb-2 flex items-center justify-between gap-2">
        <label htmlFor="address" className="block text-[11px] uppercase tracking-[0.28em] text-white/50">
          Solana Wallet / Program Address
        </label>
        <span className="text-[10px] text-white/45">watch target</span>
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
          className="rounded-lg border border-white bg-white px-5 py-3 text-sm font-semibold !text-black transition hover:opacity-90 disabled:cursor-not-allowed disabled:border-white/15 disabled:bg-white/10 disabled:text-white/30"
        >
          Monitor
        </button>
        <button
          type="button"
          onClick={onStop}
          disabled={disabled || stopDisabled || !onStop}
          className="rounded-lg border border-white/20 bg-black/70 px-5 py-3 text-sm font-semibold text-white transition hover:border-white/35 hover:bg-white/10 disabled:cursor-not-allowed disabled:border-white/10 disabled:bg-black/40 disabled:text-white/35"
        >
          Stop
        </button>
      </div>
      <p className="mt-2 text-xs text-white/55">{statusText}</p>
    </section>
  );
}

export const AddressInput = memo(AddressInputBase);
