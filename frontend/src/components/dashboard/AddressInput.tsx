"use client";

import { memo } from "react";

interface AddressInputProps {
  value: string;
  onChange: (value: string) => void;
}

// Controlled input to plug in future WS subscription logic.
function AddressInputBase({ value, onChange }: AddressInputProps) {
  return (
    <section className="rounded-2xl border border-white/10 bg-slate-900/60 p-4 shadow-[0_0_35px_rgba(14,165,233,0.12)]">
      <label htmlFor="address" className="mb-2 block text-xs text-slate-300">
        Solana Wallet / Program Address
      </label>
      <div className="flex flex-col gap-3 sm:flex-row">
        <input
          id="address"
          value={value}
          onChange={(event) => onChange(event.target.value)}
          placeholder="Paste address and start monitoring..."
          className="w-full rounded-xl border border-cyan-300/30 bg-slate-950/70 px-4 py-3 text-sm text-slate-100 outline-none ring-cyan-200/40 transition placeholder:text-slate-400 focus:ring-2"
          autoComplete="off"
          spellCheck={false}
        />
        <button
          type="button"
          className="rounded-xl bg-gradient-to-r from-cyan-400 to-violet-500 px-5 py-3 text-sm font-semibold text-slate-950 transition-transform hover:scale-[1.02]"
        >
          Monitor
        </button>
      </div>
    </section>
  );
}

export const AddressInput = memo(AddressInputBase);
