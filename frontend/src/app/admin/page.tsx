"use client";

import { useEffect, useMemo, useState } from "react";
import Link from "next/link";
import { useWallet } from "@solana/wallet-adapter-react";
import { WalletMultiButton } from "@solana/wallet-adapter-react-ui";

interface AdminMetricsResponse {
  status: string;
  service: string;
  activeClients: number;
  totalWsConnections: number;
  totalEventsStreamed: number;
  failedEventsStreamed: number;
  successRatePct: number;
  uptimeSeconds: number;
  lastEventUnix: number;
}

function getBackendHttpBase(): string {
  const wsBase = process.env.NEXT_PUBLIC_WS_URL?.trim() || "ws://127.0.0.1:3000/monitor";

  try {
    const parsed = new URL(wsBase);
    const protocol = parsed.protocol === "wss:" ? "https:" : "http:";
    return `${protocol}//${parsed.host}`;
  } catch {
    return "http://127.0.0.1:3000";
  }
}

function formatUptime(seconds: number): string {
  const days = Math.floor(seconds / 86400);
  const hours = Math.floor((seconds % 86400) / 3600);
  const minutes = Math.floor((seconds % 3600) / 60);
  const secs = seconds % 60;

  if (days > 0) {
    return `${days}d ${hours}h ${minutes}m`;
  }
  if (hours > 0) {
    return `${hours}h ${minutes}m ${secs}s`;
  }
  return `${minutes}m ${secs}s`;
}

function formatLastEvent(unix: number): string {
  if (!unix) {
    return "No events yet";
  }

  return new Date(unix * 1000).toLocaleString();
}

export default function AdminPage() {
  const [isMounted, setIsMounted] = useState(false);
  const [metrics, setMetrics] = useState<AdminMetricsResponse | null>(null);
  const [metricsError, setMetricsError] = useState<string | null>(null);
  const [isLoadingMetrics, setIsLoadingMetrics] = useState(false);
  const [refreshedAt, setRefreshedAt] = useState<number>(0);
  const { connected, publicKey } = useWallet();
  const walletAddress = publicKey?.toBase58() || "";

  useEffect(() => {
    setIsMounted(true);
  }, []);

  const adminWallets = useMemo(
    () => (process.env.NEXT_PUBLIC_ADMIN_WALLETS || "")
      .split(",")
      .map((value) => value.trim())
      .filter(Boolean),
    [],
  );

  const hasAllowlist = adminWallets.length > 0;
  const isAllowed = hasAllowlist && walletAddress.length > 0 && adminWallets.includes(walletAddress);

  useEffect(() => {
    if (!connected || !isAllowed) {
      return;
    }

    const controller = new AbortController();
    const backendBase = getBackendHttpBase();

    const fetchMetrics = async () => {
      setIsLoadingMetrics(true);

      try {
        const response = await fetch(`${backendBase}/admin/metrics`, {
          cache: "no-store",
          signal: controller.signal,
        });

        if (!response.ok) {
          throw new Error(`Backend returned ${response.status}`);
        }

        const payload = (await response.json()) as AdminMetricsResponse;
        setMetrics(payload);
        setMetricsError(null);
        setRefreshedAt(Date.now());
      } catch (error) {
        if (controller.signal.aborted) {
          return;
        }

        const message = error instanceof Error ? error.message : "Failed to load admin metrics";
        setMetricsError(message);
      } finally {
        if (!controller.signal.aborted) {
          setIsLoadingMetrics(false);
        }
      }
    };

    fetchMetrics();
    const interval = window.setInterval(fetchMetrics, 5000);

    return () => {
      controller.abort();
      window.clearInterval(interval);
    };
  }, [connected, isAllowed]);

  const throughputPerHour = useMemo(() => {
    if (!metrics || metrics.uptimeSeconds <= 0) {
      return 0;
    }

    return Math.round((metrics.totalEventsStreamed / metrics.uptimeSeconds) * 3600);
  }, [metrics]);

  const avgEventsPerSession = useMemo(() => {
    if (!metrics || metrics.totalWsConnections === 0) {
      return 0;
    }

    return Math.round(metrics.totalEventsStreamed / metrics.totalWsConnections);
  }, [metrics]);

  return (
    <div className="relative min-h-screen overflow-hidden bg-black text-white">
      <div className="pointer-events-none absolute inset-0 bg-[radial-gradient(circle_at_15%_10%,rgba(255,255,255,0.09),transparent_24%),linear-gradient(rgba(255,255,255,0.03)_1px,transparent_1px),linear-gradient(90deg,rgba(255,255,255,0.03)_1px,transparent_1px)] bg-[size:auto,56px_56px,56px_56px] opacity-35" />

      <main className="relative z-10 mx-auto flex min-h-screen w-full max-w-6xl items-start px-4 py-10 sm:px-6 lg:px-8">
        <section className="w-full rounded-[2rem] border border-white/10 bg-white/[0.03] p-7 shadow-[0_18px_60px_rgba(0,0,0,0.32)] sm:p-9">
          <div className="flex flex-wrap items-center justify-between gap-3">
            <div>
              <p className="text-[11px] uppercase tracking-[0.3em] text-white/45">TxPulse Admin</p>
              <h1 className="mt-2 text-2xl font-semibold tracking-tight text-white sm:text-3xl">Operations Console</h1>
            </div>
            {isMounted ? (
              <WalletMultiButton className="!h-10 !rounded-full !border !border-white/20 !bg-black/70 !px-4 !text-sm !text-white !shadow-none hover:!bg-white/10" />
            ) : (
              <button
                type="button"
                disabled
                className="h-10 rounded-full border border-white/20 bg-black/70 px-4 text-sm text-white/70"
              >
                Connect Wallet
              </button>
            )}
          </div>

          {!connected && (
            <div className="mt-6 rounded-2xl border border-white/10 bg-black/70 p-5 text-white/80">
              Connect a Solana wallet to continue.
            </div>
          )}

          {connected && !hasAllowlist && (
            <div className="mt-6 rounded-2xl border border-amber-300/20 bg-amber-300/10 p-5 text-amber-100">
              Admin allowlist is empty. Set NEXT_PUBLIC_ADMIN_WALLETS in environment to enable access control.
            </div>
          )}

          {connected && hasAllowlist && !isAllowed && (
            <div className="mt-6 rounded-2xl border border-rose-300/20 bg-rose-300/10 p-5 text-rose-100">
              Access denied for wallet: {walletAddress}
            </div>
          )}

          {connected && isAllowed && (
            <div className="mt-6 space-y-6">
              <div className="rounded-2xl border border-white/10 bg-black/65 p-5">
                <div className="flex flex-wrap items-center justify-between gap-3">
                  <p className="text-sm text-white/75">Live backend telemetry for app health, usage, and stream quality.</p>
                  <p className="text-xs text-white/50">
                    {refreshedAt ? `Updated ${new Date(refreshedAt).toLocaleTimeString()}` : "Waiting for first refresh..."}
                  </p>
                </div>
                {metricsError && (
                  <p className="mt-3 rounded-xl border border-rose-300/20 bg-rose-300/10 px-3 py-2 text-sm text-rose-100">
                    Metrics fetch error: {metricsError}
                  </p>
                )}
              </div>

              <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
                <article className="rounded-2xl border border-white/10 bg-black/55 p-4">
                  <p className="text-[10px] uppercase tracking-[0.28em] text-white/40">Active Monitor Users</p>
                  <p className="mt-2 text-3xl font-semibold">{metrics?.activeClients ?? 0}</p>
                </article>
                <article className="rounded-2xl border border-white/10 bg-black/55 p-4">
                  <p className="text-[10px] uppercase tracking-[0.28em] text-white/40">Total WS Sessions</p>
                  <p className="mt-2 text-3xl font-semibold">{metrics?.totalWsConnections ?? 0}</p>
                </article>
                <article className="rounded-2xl border border-white/10 bg-black/55 p-4">
                  <p className="text-[10px] uppercase tracking-[0.28em] text-white/40">Events Streamed</p>
                  <p className="mt-2 text-3xl font-semibold">{metrics?.totalEventsStreamed ?? 0}</p>
                </article>
                <article className="rounded-2xl border border-white/10 bg-black/55 p-4">
                  <p className="text-[10px] uppercase tracking-[0.28em] text-white/40">Success Rate</p>
                  <p className="mt-2 text-3xl font-semibold">{(metrics?.successRatePct ?? 0).toFixed(1)}%</p>
                </article>
              </div>

              <div className="grid gap-4 lg:grid-cols-2">
                <section className="rounded-2xl border border-white/10 bg-black/55 p-5">
                  <p className="text-[11px] uppercase tracking-[0.26em] text-white/45">Service Health</p>
                  <div className="mt-4 space-y-3 text-sm text-white/80">
                    <div className="flex items-center justify-between rounded-xl border border-white/10 bg-black/50 px-3 py-2">
                      <span>Backend status</span>
                      <span className="font-medium text-white">{metrics?.status ?? "unknown"}</span>
                    </div>
                    <div className="flex items-center justify-between rounded-xl border border-white/10 bg-black/50 px-3 py-2">
                      <span>Backend service</span>
                      <span className="font-medium text-white">{metrics?.service ?? "txpulse-backend"}</span>
                    </div>
                    <div className="flex items-center justify-between rounded-xl border border-white/10 bg-black/50 px-3 py-2">
                      <span>Uptime</span>
                      <span className="font-medium text-white">{formatUptime(metrics?.uptimeSeconds ?? 0)}</span>
                    </div>
                    <div className="flex items-center justify-between rounded-xl border border-white/10 bg-black/50 px-3 py-2">
                      <span>Last event time</span>
                      <span className="font-medium text-white">{formatLastEvent(metrics?.lastEventUnix ?? 0)}</span>
                    </div>
                  </div>
                </section>

                <section className="rounded-2xl border border-white/10 bg-black/55 p-5">
                  <p className="text-[11px] uppercase tracking-[0.26em] text-white/45">Usage & Reliability</p>
                  <div className="mt-4 space-y-3 text-sm text-white/80">
                    <div className="flex items-center justify-between rounded-xl border border-white/10 bg-black/50 px-3 py-2">
                      <span>Failed / dropped events</span>
                      <span className="font-medium text-white">{metrics?.failedEventsStreamed ?? 0}</span>
                    </div>
                    <div className="flex items-center justify-between rounded-xl border border-white/10 bg-black/50 px-3 py-2">
                      <span>Events per session (avg)</span>
                      <span className="font-medium text-white">{avgEventsPerSession}</span>
                    </div>
                    <div className="flex items-center justify-between rounded-xl border border-white/10 bg-black/50 px-3 py-2">
                      <span>Events per hour (est.)</span>
                      <span className="font-medium text-white">{throughputPerHour}</span>
                    </div>
                    <div className="flex items-center justify-between rounded-xl border border-white/10 bg-black/50 px-3 py-2">
                      <span>Data freshness</span>
                      <span className="font-medium text-white">{isLoadingMetrics ? "Refreshing..." : "Live polling (5s)"}</span>
                    </div>
                  </div>
                </section>
              </div>

              <section className="rounded-2xl border border-white/10 bg-black/55 p-5">
                <p className="text-[11px] uppercase tracking-[0.26em] text-white/45">Access & Config Snapshot</p>
                <div className="mt-4 grid gap-3 sm:grid-cols-2 lg:grid-cols-4 text-sm text-white/80">
                  <div className="rounded-xl border border-white/10 bg-black/50 px-3 py-2">
                    <p className="text-white/55">Current admin wallet</p>
                    <p className="mt-1 truncate text-white">{walletAddress}</p>
                  </div>
                  <div className="rounded-xl border border-white/10 bg-black/50 px-3 py-2">
                    <p className="text-white/55">Allowlist size</p>
                    <p className="mt-1 text-white">{adminWallets.length}</p>
                  </div>
                  <div className="rounded-xl border border-white/10 bg-black/50 px-3 py-2">
                    <p className="text-white/55">Backend base URL</p>
                    <p className="mt-1 truncate text-white">{getBackendHttpBase()}</p>
                  </div>
                  <div className="rounded-xl border border-white/10 bg-black/50 px-3 py-2">
                    <p className="text-white/55">Auth state</p>
                    <p className="mt-1 text-white">Wallet allowlisted</p>
                  </div>
                </div>
              </section>
            </div>
          )}

          <div className="mt-6">
            <Link href="/" className="text-sm text-white/70 transition hover:text-white">
              Back to landing
            </Link>
          </div>
        </section>
      </main>
    </div>
  );
}
