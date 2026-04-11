"use client";

import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import type { MetricsUpdate, TxEvent } from "@/lib/types";

type ConnectionStatus = "idle" | "connecting" | "connected" | "reconnecting" | "error";

type NewTransactionEnvelope = {
  type: "NEW_TRANSACTION";
  data: TxEvent;
};

type MetricsEnvelope = {
  type: "METRICS_UPDATE";
  data: MetricsUpdate;
};

type ServerEnvelope = NewTransactionEnvelope | MetricsEnvelope;

const MAX_EVENTS = 50;
const MAX_LATENCY_SAMPLES = 12;

function initialMetrics(): MetricsUpdate {
  return {
    successRatePct: 0,
    avgConfirmationMs: 0,
    currentSlotLag: 0,
    txPerMinute: 0,
  };
}

function parsePayload(raw: string): ServerEnvelope | null {
  try {
    const payload = JSON.parse(raw) as Partial<ServerEnvelope>;
    if (payload.type !== "NEW_TRANSACTION" && payload.type !== "METRICS_UPDATE") {
      return null;
    }

    if (!payload.data || typeof payload.data !== "object") {
      return null;
    }

    return payload as ServerEnvelope;
  } catch {
    return null;
  }
}

export function useTxPulseSocket(address: string) {
  const [events, setEvents] = useState<TxEvent[]>([]);
  const [metrics, setMetrics] = useState<MetricsUpdate>(initialMetrics);
  const [status, setStatus] = useState<ConnectionStatus>("idle");
  const [lastError, setLastError] = useState<string | null>(null);
  const [activeAddress, setActiveAddress] = useState<string | null>(null);

  const socketRef = useRef<WebSocket | null>(null);
  const reconnectTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const reconnectAttemptRef = useRef(0);
  const manualCloseRef = useRef(false);
  const connectRef = useRef<(nextAddress: string) => void>(() => {});

  const baseWsUrl = useMemo(() => {
    const fromEnv = process.env.NEXT_PUBLIC_WS_URL;
    if (fromEnv && fromEnv.trim().length > 0) {
      return fromEnv.trim().replace(/\/$/, "");
    }
    return "ws://127.0.0.1:3000/monitor";
  }, []);

  const clearReconnectTimer = useCallback(() => {
    if (reconnectTimerRef.current) {
      clearTimeout(reconnectTimerRef.current);
      reconnectTimerRef.current = null;
    }
  }, []);

  const disconnect = useCallback(() => {
    manualCloseRef.current = true;
    clearReconnectTimer();

    if (socketRef.current) {
      socketRef.current.close();
      socketRef.current = null;
    }

    setStatus("idle");
    setActiveAddress(null);
  }, [clearReconnectTimer]);

  const connect = useCallback((nextAddress: string) => {
    const sanitizedAddress = nextAddress.trim();
    if (!sanitizedAddress) {
      return;
    }

    manualCloseRef.current = false;
    clearReconnectTimer();

    if (socketRef.current) {
      socketRef.current.close();
      socketRef.current = null;
    }

    setLastError(null);
    setStatus("connecting");
    setActiveAddress(sanitizedAddress);

    const reconnectWithBackoff = () => {
      reconnectAttemptRef.current += 1;
      const delayMs = Math.min(1000 * 2 ** reconnectAttemptRef.current, 10000);
      setStatus("reconnecting");

      clearReconnectTimer();
      reconnectTimerRef.current = setTimeout(() => {
        manualCloseRef.current = false;
        connectRef.current(sanitizedAddress);
      }, delayMs);
    };

    const wsUrl = `${baseWsUrl}/${sanitizedAddress}`;
    const socket = new WebSocket(wsUrl);
    socketRef.current = socket;

    socket.onopen = () => {
      reconnectAttemptRef.current = 0;
      setStatus("connected");
    };

    socket.onmessage = (event) => {
      const payload = parsePayload(event.data);
      if (!payload) {
        return;
      }

      if (payload.type === "NEW_TRANSACTION") {
        setEvents((current) => [payload.data, ...current].slice(0, MAX_EVENTS));
      }

      if (payload.type === "METRICS_UPDATE") {
        setMetrics(payload.data);
      }
    };

    socket.onerror = () => {
      setStatus("error");
      setLastError("WebSocket error while connecting to backend");
    };

    socket.onclose = (event) => {
      socketRef.current = null;

      if (manualCloseRef.current) {
        return;
      }

      if (event.code === 1008) {
        setStatus("error");
        setLastError("Invalid Solana address for monitor route");
        return;
      }

      reconnectWithBackoff();
    };
  }, [baseWsUrl, clearReconnectTimer]);

  const startMonitoring = useCallback(() => {
    setEvents([]);
    setMetrics(initialMetrics());
    connect(address);
  }, [address, connect]);

  useEffect(() => {
    connectRef.current = connect;
  }, [connect]);

  const latencySamples = useMemo(() => {
    const samples = events
      .map((item) => item.confirmationLatencyMs)
      .filter((latency) => latency > 0)
      .slice(0, MAX_LATENCY_SAMPLES)
      .reverse();

    return samples;
  }, [events]);

  useEffect(() => {
    return () => {
      manualCloseRef.current = true;
      clearReconnectTimer();
      if (socketRef.current) {
        socketRef.current.close();
      }
    };
  }, [clearReconnectTimer]);

  return {
    events,
    metrics,
    status,
    lastError,
    activeAddress,
    latencySamples,
    startMonitoring,
    disconnect,
  };
}
