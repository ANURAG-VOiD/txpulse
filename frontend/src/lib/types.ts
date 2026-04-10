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
