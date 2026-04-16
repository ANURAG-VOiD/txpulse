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
  heading = "Decode failed txs, minus the detective hat.",
  subheading = "Paste a hash. We’ll tell you what broke and what to fix.",
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
      <div className="flex flex-wrap items-center justify-between gap-3 text-center sm:text-left">
        <div className="max-w-2xl">
          <p className="text-[11px] uppercase tracking-[0.32em] text-white/45">Decode mode</p>
          <h1 className="mt-3 text-3xl font-semibold tracking-[-0.04em] text-white sm:text-5xl">{heading}</h1>
          <p className="mx-auto mt-4 max-w-3xl text-sm leading-7 text-white/70 sm:mx-0">{subheading}</p>
        </div>
        <span className="rounded-full border border-white/15 bg-black/45 px-3 py-1 text-[10px] uppercase tracking-[0.22em] text-white/65">
          one-page diagnosis
        </span>
      </div>

      <div className="mt-7 grid gap-5 xl:grid-cols-[1fr_1.05fr]">
        <div className="space-y-5">
          <section className="border border-white/10 bg-black/35 p-4 sm:p-5">
            <div className="flex flex-wrap items-start justify-between gap-2">
              <div>
                <p className="text-[10px] uppercase tracking-[0.26em] text-white/42">Input</p>
                <h2 className="mt-1 text-lg font-medium text-white">Paste the failed signature</h2>
              </div>
              <span className="rounded-full border border-white/10 bg-white/[0.03] px-3 py-1 text-[10px] uppercase tracking-[0.18em] text-white/55">
                fast lane
              </span>
            </div>

            <div className="mt-4 grid gap-3">
              <input
                value={hash}
                onChange={(event) => setHash(event.target.value)}
                placeholder="Paste failed transaction signature"
                className="w-full rounded-2xl border border-white/10 bg-black/70 px-4 py-3 text-sm text-white outline-none transition placeholder:text-white/30 focus:border-white/30 focus:ring-1 focus:ring-white/30"
                autoComplete="off"
                spellCheck={false}
              />
              <div className="grid gap-3 md:grid-cols-[190px_auto]">
                <label className="relative block" aria-label="Select network">
                  <select
                    value={network}
                    onChange={(event) => setNetwork(event.target.value as SolanaNetwork)}
                    className="w-full rounded-2xl border border-white/10 bg-black/70 px-4 py-3 pr-10 text-sm text-white outline-none transition focus:border-white/30 focus:ring-1 focus:ring-white/30"
                  >
                    {networkOptions.map((option) => (
                      <option key={option.value} value={option.value}>{option.label}</option>
                    ))}
                  </select>
                  <span className="pointer-events-none absolute inset-y-0 right-3 flex items-center text-white/55" aria-hidden="true">
                    <svg width="12" height="12" viewBox="0 0 12 12" fill="none" xmlns="http://www.w3.org/2000/svg">
                      <path d="M2.5 4.5L6 8L9.5 4.5" stroke="currentColor" strokeWidth="1.4" strokeLinecap="round" strokeLinejoin="round" />
                    </svg>
                  </span>
                </label>

                <button
                  type="button"
                  onClick={runExplain}
                  disabled={!canExplain || loading}
                  className="tx-btn-primary px-5"
                >
                  {loading ? "Decoding..." : "Decode"}
                </button>
              </div>
            </div>

            <div className="mt-3 text-xs text-white/55">
              Solana signatures are base58 • Mainnet, devnet, testnet • Plain-English summary
            </div>

            {!canExplain && hash.trim().length > 0 && (
              <p className="mt-3 text-xs text-white/55">Signature looks off. Paste the full Solana hash, not the lunch receipt.</p>
            )}

            {error && (
              <div className="mt-4 border border-white/15 bg-black/70 p-3 text-sm text-white/85">{error}</div>
            )}
          </section>

          <section className="border border-white/10 bg-black/30 p-4 sm:p-5">
            <p className="text-[10px] uppercase tracking-[0.26em] text-white/42">How it works</p>
            <div className="mt-4 grid gap-3 sm:grid-cols-3">
              {[
                ["1", "Paste hash", "Drop in the failed tx signature."],
                ["2", "Decode", "We parse the failure and reason."],
                ["3", "Fix next", "Ship the smallest useful change."],
              ].map(([step, title, body]) => (
                <div key={step} className="border border-white/10 bg-white/[0.02] p-3">
                  <p className="text-[10px] uppercase tracking-[0.22em] text-white/40">Step {step}</p>
                  <p className="mt-2 text-sm font-medium text-white">{title}</p>
                  <p className="mt-1 text-xs leading-5 text-white/58">{body}</p>
                </div>
              ))}
            </div>
          </section>
        </div>

        <div className="space-y-4">
          <section className="border border-white/10 bg-black/35 p-4 sm:p-5">
            <div className="flex flex-wrap items-center justify-between gap-2">
              <div>
                <p className="text-[10px] uppercase tracking-[0.26em] text-white/42">Result</p>
                <h2 className="mt-1 text-lg font-medium text-white">Diagnosis panel</h2>
              </div>
              {result && (
                <span className="rounded-full border border-white/15 px-3 py-1 text-[10px] uppercase tracking-[0.18em] text-white/65">
                  {result.source === "api" ? "live" : "fallback"}
                </span>
              )}
            </div>

            <div className="mt-4">
              {result ? (
                <ExplainResultCard result={result} compact={compact} />
              ) : (
                <div className="rounded-[1.5rem] border border-dashed border-white/15 bg-black/65 p-5 text-sm text-white/65">
                  <p className="font-medium text-white/85">No explanation yet.</p>
                  <p className="mt-2">Paste a failed transaction hash and hit decode. We’ll keep it blunt and useful.</p>
                </div>
              )}
            </div>
          </section>

          <div className="flex flex-wrap justify-center gap-2 text-xs text-white/60 sm:justify-start">
            <Link href="/app" className="tx-btn-ghost px-3 py-1.5 text-xs">
              Back to watch mode
            </Link>
            <Link href="/docs" className="tx-btn-ghost px-3 py-1.5 text-xs">
              Open docs
            </Link>
          </div>
        </div>
      </div>
    </section>
  );
}
