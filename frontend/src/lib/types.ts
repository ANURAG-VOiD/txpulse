// Shared contracts keep event and metric payloads strictly typed.
export type TxStatus = "success" | "failed" | "dropped" | "pending";

export interface TxEvent {
  signature: string;
  status: TxStatus;
  timestamp: string;
  computeUnitsConsumed: number;
  priorityFeeMicrolamports: number;
  confirmationLatencyMs: number;
  slot: number;
}

export interface MetricsUpdate {
  successRatePct: number;
  avgConfirmationMs: number;
  currentSlotLag: number;
  txPerMinute: number;
}

export interface ExplainResponse {
  hash: string;
  network: string;
  errorCode: string | null;
  plainEnglish: string;
  fixSuggestion: string;
  riskLevel: string;
  economicContext: string;
  viewedCount: number;
  createdAt: string;
  shareUrl: string;
}
