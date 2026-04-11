"use client";

import { memo } from "react";
import { cn } from "@/lib/utils";

interface AddressInputProps {
  value: string;
  onChange: (value: string) => void;
  onMonitor: () => void;
  statusText: string;
  disabled?: boolean;
}

// Controlled input to plug in future WS subscription logic.
function AddressInputBase({
  value,
  onChange,
  onMonitor,
  statusText,
  disabled = false,
}: AddressInputProps) {
  return (
    <section className="rounded-[1.75rem] border border-white/10 bg-white/[0.03] p-4 shadow-[0_20px_80px_rgba(0,0,0,0.35)] backdrop-blur-xl sm:p-5">
      <label htmlFor="address" className="mb-2 block text-[11px] uppercase tracking-[0.28em] text-white/50">
        Solana Wallet / Program Address
      </label>
      <div className="flex flex-col gap-3 sm:flex-row">
        <input
          id="address"
          value={value}
          onChange={(event) => onChange(event.target.value)}
          placeholder="Paste address and start monitoring..."
          className={cn(
            "w-full rounded-2xl border border-white/10 bg-black/70 px-4 py-3 text-sm text-white outline-none transition placeholder:text-white/30 focus:border-white/30 focus:ring-1 focus:ring-white/30",
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
          className="rounded-2xl border border-white bg-white px-5 py-3 text-sm font-semibold text-black transition-transform hover:scale-[1.01] disabled:cursor-not-allowed disabled:border-white/15 disabled:bg-white/10 disabled:text-white/30"
        >
          Monitor
        </button>
      </div>
      <p className="mt-3 text-xs text-white/55">{statusText}</p>
    </section>
  );
}

export const AddressInput = memo(AddressInputBase);
