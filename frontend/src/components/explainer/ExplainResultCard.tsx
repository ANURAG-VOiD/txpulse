"use client";

import Link from "next/link";
import { useMemo, useState } from "react";
import type { ExplainResponse } from "@/lib/explainer";
import { toShareHref } from "@/lib/explainer";

interface ExplainResultCardProps {
  result: ExplainResponse;
  compact?: boolean;
}

function formatDate(value?: string): string {
  if (!value) {
    return "now";
  }

  const timestamp = Date.parse(value);
  if (Number.isNaN(timestamp)) {
    return value;
  }

  return new Date(timestamp).toLocaleString();
}

export function ExplainResultCard({ result, compact = false }: ExplainResultCardProps) {
  const [copied, setCopied] = useState(false);

  const shareHref = useMemo(() => toShareHref(result), [result]);

  const copyShareLink = async () => {
    try {
      const absoluteHref = shareHref.startsWith("http") ? shareHref : `${window.location.origin}${shareHref}`;
      await navigator.clipboard.writeText(absoluteHref);
      setCopied(true);
      window.setTimeout(() => setCopied(false), 1500);
    } catch {
      setCopied(false);
    }
  };

  return (
    <article className="border-t border-white/12 pt-4 sm:pt-5">
      <div className="flex flex-wrap items-center justify-between gap-2">
        <p className="text-[10px] uppercase tracking-[0.28em] text-white/45">Decoder Output</p>
        <span className="rounded-full border border-white/15 px-3 py-1 text-[10px] uppercase tracking-[0.2em] text-white/70">
          {result.source === "api" ? "live" : "fallback"}
        </span>
      </div>

      <div className="mt-3 border-b border-white/10 pb-3">
        <p className="text-[10px] uppercase tracking-[0.24em] text-white/40">Signature</p>
        <p className="mt-1 break-all font-mono text-xs text-white/85">{result.hash}</p>
      </div>

      <div className="mt-3 grid gap-3 md:grid-cols-2">
        <div className="border-b border-white/10 pb-3">
          <p className="text-[10px] uppercase tracking-[0.24em] text-white/40">Error Code</p>
          <p className="mt-1 text-sm text-white/90">{result.error_code || "Unavailable"}</p>
        </div>
        <div className="border-b border-white/10 pb-3">
          <p className="text-[10px] uppercase tracking-[0.24em] text-white/40">Network</p>
          <p className="mt-1 text-sm text-white/90">{result.network}</p>
        </div>
      </div>

      <div className="mt-3 border-b border-white/10 pb-3">
        <p className="text-[10px] uppercase tracking-[0.24em] text-white/40">What Failed</p>
        <p className="mt-1 text-sm leading-6 text-white/82">{result.plain_english}</p>
      </div>

      <div className="mt-3 border-b border-white/10 pb-3">
        <p className="text-[10px] uppercase tracking-[0.24em] text-white/40">What To Change Next</p>
        <p className="mt-1 text-sm leading-6 text-white/82">{result.fix_suggestion}</p>
      </div>

      <div className="mt-3 flex flex-wrap items-center gap-2">
        <Link
          href={shareHref}
          className="rounded-full border border-white bg-white px-4 py-2 text-xs font-semibold !text-black transition hover:opacity-90"
        >
          Open Share Page
        </Link>
        <button
          type="button"
          onClick={copyShareLink}
          className="rounded-full border border-white/20 bg-black/70 px-4 py-2 text-xs font-semibold text-white transition hover:border-white/35 hover:bg-white/10"
        >
          {copied ? "Copied" : "Copy Share URL"}
        </button>
      </div>

      {!compact && (
        <p className="mt-3 text-xs text-white/45">
          Created {formatDate(result.created_at)}{typeof result.viewed_count === "number" ? ` • ${result.viewed_count} views` : ""}
        </p>
      )}
    </article>
  );
}
