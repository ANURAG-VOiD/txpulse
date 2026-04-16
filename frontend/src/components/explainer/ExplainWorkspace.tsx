"use client";

import Link from "next/link";
import { useMemo, useState } from "react";
import {
  explainTransaction,
  isLikelySolanaSignature,
  type ExplainResponse,
  type SolanaNetwork,
} from "@/lib/explainer";
import { ExplainResultCard } from "@/components/explainer/ExplainResultCard";

interface ExplainWorkspaceProps {
  initialHash?: string;
  initialNetwork?: SolanaNetwork;
  heading?: string;
  subheading?: string;
  compact?: boolean;
}

const networkOptions: Array<{ value: SolanaNetwork; label: string }> = [
  { value: "mainnet-beta", label: "mainnet-beta" },
  { value: "devnet", label: "devnet" },
  { value: "testnet", label: "testnet" },
];

export function ExplainWorkspace({
  initialHash = "",
  initialNetwork = "mainnet-beta",
  heading = "Understand failed transactions in plain English.",
  subheading = "Paste a failed Solana transaction hash to see what failed, why it failed, and what to change next.",
  compact = false,
}: ExplainWorkspaceProps) {
  const [hash, setHash] = useState(initialHash);
  const [network, setNetwork] = useState<SolanaNetwork>(initialNetwork);
  const [result, setResult] = useState<ExplainResponse | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  const canExplain = useMemo(() => isLikelySolanaSignature(hash), [hash]);

  const runExplain = async () => {
    setError(null);
    setLoading(true);

    try {
      const response = await explainTransaction(hash, network);
      setResult(response);
    } catch (caught) {
      const message = caught instanceof Error ? caught.message : "Unable to decode this transaction.";
      setError(message);
      setResult(null);
    } finally {
      setLoading(false);
    }
  };

  return (
    <section className="rounded-[2rem] border border-white/10 bg-white/[0.03] p-5 shadow-[0_18px_60px_rgba(0,0,0,0.32)] sm:p-7">
      <p className="text-[11px] uppercase tracking-[0.32em] text-white/45">Decode mode</p>
      <h1 className="mt-3 text-3xl font-semibold tracking-[-0.04em] text-white sm:text-5xl">{heading}</h1>
      <p className="mt-4 max-w-3xl text-sm leading-7 text-white/70">{subheading}</p>

      <div className="mt-6 grid gap-3 md:grid-cols-[1fr_auto]">
        <input
          value={hash}
          onChange={(event) => setHash(event.target.value)}
          placeholder="Paste failed transaction signature"
          className="w-full rounded-2xl border border-white/10 bg-black/70 px-4 py-3 text-sm text-white outline-none transition placeholder:text-white/30 focus:border-white/30 focus:ring-1 focus:ring-white/30"
          autoComplete="off"
          spellCheck={false}
        />
        <button
          type="button"
          onClick={runExplain}
          disabled={!canExplain || loading}
          className="rounded-2xl border border-white bg-white px-5 py-3 text-sm font-semibold !text-black transition disabled:cursor-not-allowed disabled:border-white/20 disabled:bg-white/15 disabled:text-white/30"
        >
          {loading ? "Decoding..." : "Decode Tx"}
        </button>
      </div>

      <div className="mt-3 inline-flex w-full flex-wrap gap-2 rounded-xl border border-white/12 bg-black/50 p-1.5 sm:w-auto" role="tablist" aria-label="Select network">
        {networkOptions.map((option) => {
          const selected = network === option.value;
          return (
            <button
              key={option.value}
              type="button"
              role="tab"
              aria-selected={selected}
              onClick={() => setNetwork(option.value)}
              className={`rounded-lg px-3 py-1.5 text-xs font-medium tracking-[0.04em] transition ${selected ? "bg-white text-black" : "text-white/78 hover:bg-white/10"}`}
            >
              {option.label}
            </button>
          );
        })}
      </div>

      {!canExplain && hash.trim().length > 0 && (
        <p className="mt-3 text-xs text-white/55">Signature format looks invalid. Use a base58 Solana transaction signature.</p>
      )}

      {error && (
        <div className="mt-4 rounded-xl border border-white/15 bg-black/70 p-3 text-sm text-white/85">{error}</div>
      )}

      <div className="mt-6">
        {result ? (
          <ExplainResultCard result={result} compact={compact} />
        ) : (
          <div className="rounded-[1.5rem] border border-dashed border-white/15 bg-black/65 p-5 text-sm text-white/65">
            <p className="font-medium text-white/85">No explanation loaded yet.</p>
            <p className="mt-2">Paste a failed transaction hash and run decode to generate a plain-English diagnosis and fix suggestion.</p>
          </div>
        )}
      </div>

      <div className="mt-5 flex flex-wrap gap-2 text-xs text-white/60">
        <Link href="/app" className="rounded-full border border-white/15 px-3 py-1.5 transition hover:border-white/35 hover:bg-white/10">
          Back to watch mode
        </Link>
        <Link href="/docs" className="rounded-full border border-white/15 px-3 py-1.5 transition hover:border-white/35 hover:bg-white/10">
          Open docs
        </Link>
      </div>
    </section>
  );
}
