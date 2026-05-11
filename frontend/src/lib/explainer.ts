export type SolanaNetwork = "mainnet-beta" | "devnet" | "testnet";

export interface ExplainResponse {
  hash: string;
  network: string;
  error_code: string | null;
  plain_english: string;
  fix_suggestion: string;
  share_url: string;
  viewed_count?: number;
  created_at?: string;
  source: "api" | "fallback";
}

function getApiBase(): string {
  const explicit = process.env.NEXT_PUBLIC_API_BASE_URL?.trim();
  if (explicit) {
    return explicit.replace(/\/$/, "");
  }

  const wsBase = process.env.NEXT_PUBLIC_WS_URL?.trim();
  if (wsBase) {
    try {
      const parsed = new URL(wsBase);
      const protocol = parsed.protocol === "wss:" ? "https:" : "http:";
      return `${protocol}//${parsed.host}`;
    } catch {
      return "http://127.0.0.1:3000";
    }
  }

  return "http://127.0.0.1:3000";
}

export function isLikelySolanaSignature(value: string): boolean {
  const trimmed = value.trim();
  return /^[1-9A-HJ-NP-Za-km-z]{32,120}$/.test(trimmed);
}

function normalizeHash(value: string): string {
  return value.trim();
}

function fallbackFor(hash: string, network: SolanaNetwork): ExplainResponse {
  return {
    hash,
    network,
    error_code: "DecodePending::BackendIntegration",
    plain_english:
      "TxPulse could not fetch a decoded explanation from the backend right now. This usually means the explainer API is not available in your local environment yet.",
    fix_suggestion:
      "Verify NEXT_PUBLIC_API_BASE_URL, ensure backend explainer route GET /explain/:tx_hash is running, then retry this hash.",
    share_url: `/s/${hash}`,
    source: "fallback",
  };
}

export async function explainTransaction(hashInput: string, network: SolanaNetwork): Promise<ExplainResponse> {
  const hash = normalizeHash(hashInput);
  if (!isLikelySolanaSignature(hash)) {
    throw new Error("Enter a valid Solana transaction signature before explaining.");
  }

  const endpoint = `${getApiBase()}/explain/${encodeURIComponent(hash)}?network=${encodeURIComponent(network)}`;

  try {
    const response = await fetch(endpoint, {
      method: "GET",
      headers: {
        Accept: "application/json",
      },
      cache: "no-store",
    });

    if (!response.ok) {
      throw new Error(`Explainer endpoint returned ${response.status}`);
    }

    const payload = (await response.json()) as Partial<ExplainResponse>;
    if (!payload.hash || !payload.plain_english || !payload.fix_suggestion) {
      throw new Error("Explainer payload is missing required fields");
    }

    return {
      hash: payload.hash,
      network: payload.network || network,
      error_code: payload.error_code ?? null,
      plain_english: payload.plain_english,
      fix_suggestion: payload.fix_suggestion,
      share_url: payload.share_url || `/s/${payload.hash}`,
      viewed_count: payload.viewed_count,
      created_at: payload.created_at,
      source: "api",
    };
  } catch {
    return fallbackFor(hash, network);
  }
}

export function toShareHref(result: Pick<ExplainResponse, "hash" | "share_url">): string {
  if (result.share_url?.startsWith("http://") || result.share_url?.startsWith("https://")) {
    return result.share_url;
  }

  if (result.share_url?.startsWith("/")) {
    return result.share_url;
  }

  return `/s/${result.hash}`;
}
