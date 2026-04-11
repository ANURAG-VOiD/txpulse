"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
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

interface MetricsSnapshot {
  ts: number;
  activeClients: number;
  totalEventsStreamed: number;
  successRatePct: number;
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
  const [metricsHistory, setMetricsHistory] = useState<MetricsSnapshot[]>([]);
  const [autoRefresh, setAutoRefresh] = useState(true);
  const [pollSeconds, setPollSeconds] = useState(5);
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
  const backendBase = useMemo(() => getBackendHttpBase(), []);

  const fetchMetrics = useCallback(async (signal?: AbortSignal) => {
    setIsLoadingMetrics(true);

    try {
      const response = await fetch(`${backendBase}/admin/metrics`, {
        cache: "no-store",
        signal,
      });

      if (!response.ok) {
        throw new Error(`Backend returned ${response.status}`);
      }

      const payload = (await response.json()) as AdminMetricsResponse;
      const now = Date.now();

      setMetrics(payload);
      setMetricsError(null);
      setRefreshedAt(now);
      setMetricsHistory((current) => {
        const next = [
          ...current,
          {
            ts: now,
            activeClients: payload.activeClients,
            totalEventsStreamed: payload.totalEventsStreamed,
            successRatePct: payload.successRatePct,
          },
        ];

        return next.slice(-24);
      });
    } catch (error) {
      if (signal?.aborted) {
        return;
      }

      const message = error instanceof Error ? error.message : "Failed to load admin metrics";
      setMetricsError(message);
    } finally {
      if (!signal?.aborted) {
        setIsLoadingMetrics(false);
      }
    }
  }, [backendBase]);

  useEffect(() => {
    if (!connected || !isAllowed) {
      return;
    }

    const controller = new AbortController();
    fetchMetrics(controller.signal);

    if (!autoRefresh) {
      return () => {
        controller.abort();
      };
    }

    const interval = window.setInterval(() => {
      fetchMetrics(controller.signal);
    }, pollSeconds * 1000);

    return () => {
      controller.abort();
      window.clearInterval(interval);
    };
  }, [autoRefresh, connected, fetchMetrics, isAllowed, pollSeconds]);

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

  const errorRatePct = useMemo(() => {
    if (!metrics || metrics.totalEventsStreamed === 0) {
      return 0;
    }

    return (metrics.failedEventsStreamed / metrics.totalEventsStreamed) * 100;
  }, [metrics]);

  const activeUsersDelta = useMemo(() => {
    if (metricsHistory.length < 2) {
      return 0;
    }

    const previous = metricsHistory[metricsHistory.length - 2];
    const latest = metricsHistory[metricsHistory.length - 1];
    return latest.activeClients - previous.activeClients;
  }, [metricsHistory]);

  const eventsVelocityPerMinute = useMemo(() => {
    if (metricsHistory.length < 2) {
      return 0;
    }

    const first = metricsHistory[0];
    const last = metricsHistory[metricsHistory.length - 1];
    const deltaEvents = last.totalEventsStreamed - first.totalEventsStreamed;
    const deltaMs = last.ts - first.ts;
    if (deltaMs <= 0) {
      return 0;
    }

    return Math.max(0, Math.round((deltaEvents / deltaMs) * 60_000));
  }, [metricsHistory]);

  const backendHealth = useMemo(() => {
    if (metricsError) {
      return "degraded";
    }
    if (!metrics) {
      return "warming";
    }
    if (metrics.successRatePct < 95 || errorRatePct > 5) {
      return "degraded";
    }
    return "healthy";
  }, [errorRatePct, metrics, metricsError]);

  const alertItems = useMemo(() => {
    const items: string[] = [];

    if (metricsError) {
      items.push(`Admin metrics endpoint unreachable: ${metricsError}`);
    }

    if (metrics) {
      if (metrics.successRatePct < 95) {
        items.push(`Success rate dropped to ${metrics.successRatePct.toFixed(1)}%`);
      }

      if (errorRatePct > 3) {
        items.push(`Error rate elevated at ${errorRatePct.toFixed(1)}%`);
      }

      if (metrics.activeClients > 0 && metrics.lastEventUnix > 0) {
        const staleSeconds = Math.floor(Date.now() / 1000) - metrics.lastEventUnix;
        if (staleSeconds > 180) {
          items.push("No fresh events for over 3 minutes while active clients are connected");
        }
      }
    }

    return items;
  }, [errorRatePct, metrics, metricsError]);

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
                  <div className="flex items-center gap-2">
                    <button
                      type="button"
                      onClick={() => {
                        void fetchMetrics();
                      }}
                      className="rounded-lg border border-white/20 px-3 py-1.5 text-xs text-white/85 transition hover:bg-white/10"
                    >
                      Refresh now
                    </button>
                    <label className="flex items-center gap-2 rounded-lg border border-white/10 px-2 py-1 text-xs text-white/70">
                      <input
                        type="checkbox"
                        checked={autoRefresh}
                        onChange={(event) => setAutoRefresh(event.target.checked)}
                        className="h-3.5 w-3.5"
                      />
                      Auto refresh
                    </label>
                    <select
                      value={pollSeconds}
                      onChange={(event) => setPollSeconds(Number(event.target.value))}
                      className="rounded-lg border border-white/10 bg-black px-2 py-1 text-xs text-white/80"
                    >
                      <option value={5}>5s</option>
                      <option value={10}>10s</option>
                      <option value={15}>15s</option>
                      <option value={30}>30s</option>
                    </select>
                  </div>
                </div>

                <div className="mt-3 flex flex-wrap items-center justify-between gap-3 text-xs text-white/50">
                  <p>
                    {refreshedAt ? `Updated ${new Date(refreshedAt).toLocaleTimeString()}` : "Waiting for first refresh..."}
                  </p>
                  <p className="uppercase tracking-[0.2em] text-white/60">
                    Backend health: {backendHealth}
                  </p>
                </div>

                {metricsError && (
                  <p className="mt-3 rounded-xl border border-rose-300/20 bg-rose-300/10 px-3 py-2 text-sm text-rose-100">
                    Metrics fetch error: {metricsError}
                  </p>
                )}
              </div>

              <div className="grid gap-4 sm:grid-cols-3">
                <article className="rounded-2xl border border-white/10 bg-black/55 p-4">
                  <p className="text-[10px] uppercase tracking-[0.28em] text-white/40">Live user trend</p>
                  <p className="mt-2 text-3xl font-semibold">{metrics?.activeClients ?? 0}</p>
                  <p className="mt-2 text-sm text-white/65">
                    {activeUsersDelta >= 0 ? `+${activeUsersDelta}` : activeUsersDelta} since last sample
                  </p>
                </article>
                <article className="rounded-2xl border border-white/10 bg-black/55 p-4">
                  <p className="text-[10px] uppercase tracking-[0.28em] text-white/40">Event velocity</p>
                  <p className="mt-2 text-3xl font-semibold">{eventsVelocityPerMinute}</p>
                  <p className="mt-2 text-sm text-white/65">events/min from recent history</p>
                </article>
                <article className="rounded-2xl border border-white/10 bg-black/55 p-4">
                  <p className="text-[10px] uppercase tracking-[0.28em] text-white/40">Error rate</p>
                  <p className="mt-2 text-3xl font-semibold">{errorRatePct.toFixed(1)}%</p>
                  <p className="mt-2 text-sm text-white/65">failed + dropped event share</p>
                </article>
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
                <p className="text-[11px] uppercase tracking-[0.26em] text-white/45">Alert Center</p>
                {alertItems.length === 0 ? (
                  <p className="mt-4 rounded-xl border border-emerald-300/25 bg-emerald-300/10 px-3 py-2 text-sm text-emerald-100">
                    No active incidents detected from current telemetry.
                  </p>
                ) : (
                  <div className="mt-4 space-y-2">
                    {alertItems.map((item) => (
                      <p key={item} className="rounded-xl border border-amber-300/20 bg-amber-300/10 px-3 py-2 text-sm text-amber-100">
                        {item}
                      </p>
                    ))}
                  </div>
                )}
              </section>

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
                    <p className="mt-1 truncate text-white">{backendBase}</p>
                  </div>
                  <div className="rounded-xl border border-white/10 bg-black/50 px-3 py-2">
                    <p className="text-white/55">Auth state</p>
                    <p className="mt-1 text-white">Wallet allowlisted</p>
                  </div>
                </div>
              </section>

              <section className="rounded-2xl border border-white/10 bg-black/55 p-5">
                <p className="text-[11px] uppercase tracking-[0.26em] text-white/45">Operator Actions</p>
                <div className="mt-4 grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
                  <Link href="/app" className="rounded-xl border border-white/10 bg-black/50 px-3 py-3 text-sm text-white/85 transition hover:border-white/30">
                    Open live monitor
                  </Link>
                  <a
                    href={`${backendBase}/health`}
                    target="_blank"
                    rel="noreferrer"
                    className="rounded-xl border border-white/10 bg-black/50 px-3 py-3 text-sm text-white/85 transition hover:border-white/30"
                  >
                    Open /health
                  </a>
                  <a
                    href={`${backendBase}/admin/metrics`}
                    target="_blank"
                    rel="noreferrer"
                    className="rounded-xl border border-white/10 bg-black/50 px-3 py-3 text-sm text-white/85 transition hover:border-white/30"
                  >
                    Open raw metrics JSON
                  </a>
                  <button
                    type="button"
                    onClick={() => {
                      setMetricsHistory([]);
                    }}
                    className="rounded-xl border border-white/10 bg-black/50 px-3 py-3 text-left text-sm text-white/85 transition hover:border-white/30"
                  >
                    Reset local trend history
                  </button>
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
