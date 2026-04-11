"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import Image from "next/image";
import Link from "next/link";
import { WalletMultiButton } from "@solana/wallet-adapter-react-ui";
import { useWallet } from "@solana/wallet-adapter-react";
import { AddressInput } from "@/components/dashboard/AddressInput";
import { FloatingNav } from "@/components/dashboard/FloatingNav";
import { MetricsGrid } from "@/components/dashboard/MetricsGrid";
import { TransactionFeed } from "@/components/dashboard/TransactionFeed";
import { useTxPulseSocket } from "@/lib/useTxPulseSocket";

export default function MonitorAppPage() {
  const [isMounted, setIsMounted] = useState(false);
  const { connected, publicKey } = useWallet();
  const [address, setAddress] = useState("");
  const initializedForWalletRef = useRef<string | null>(null);

  const {
    metrics,
    events,
    status,
    lastError,
    activeAddress,
    latencySamples,
    startMonitoring,
    disconnect,
  } = useTxPulseSocket(address);

  const walletAddress = publicKey?.toBase58() || "";

  useEffect(() => {
    setIsMounted(true);
  }, []);

  useEffect(() => {
    if (!connected || !walletAddress) {
      initializedForWalletRef.current = null;
      return;
    }

    if (initializedForWalletRef.current === walletAddress) {
      return;
    }

    initializedForWalletRef.current = walletAddress;

    // Initialize once per connected wallet, but keep manual input fully editable afterwards.
    if (address.trim().length === 0) {
      setAddress(walletAddress);
    }

    startMonitoring(walletAddress);
  }, [address, connected, walletAddress, startMonitoring]);

  const statusText = useMemo(() => {
    if (!connected) {
      return "Connect your Solana wallet to start wallet-based monitoring.";
    }

    if (lastError) {
      return `Error: ${lastError}`;
    }

    if (status === "connected" && activeAddress) {
      return `Connected to ${activeAddress}`;
    }

    if (status === "reconnecting") {
      return "Connection interrupted. Reconnecting with backoff...";
    }

    if (status === "connecting") {
      return "Connecting to backend monitor...";
    }

    return "Wallet address loaded. Click monitor to resync manually.";
  }, [activeAddress, connected, lastError, status]);

  const heroStats = useMemo(
    () => [
      { label: "Events", value: `${events.length}` },
      { label: "Success", value: `${metrics.successRatePct.toFixed(1)}%` },
      { label: "Latency", value: `${Math.round(metrics.avgConfirmationMs)} ms` },
    ],
    [events.length, metrics.avgConfirmationMs, metrics.successRatePct],
  );

  const latestEventLabel = useMemo(() => {
    if (events.length === 0) {
      return "No events yet";
    }

    const latest = events[0];
    return `${latest.status.toUpperCase()} • slot ${latest.slot.toLocaleString()}`;
  }, [events]);

  const latencySeries = useMemo(() => {
    const recent = latencySamples.slice(-10);
    if (recent.length === 0) {
      return Array.from({ length: 10 }, () => 0);
    }

    return recent;
  }, [latencySamples]);

  const latencyPeak = useMemo(() => Math.max(...latencySeries, 1), [latencySeries]);
  const latencyHasLiveData = useMemo(() => latencySeries.some((value) => value > 0), [latencySeries]);
  const latencyAvg = useMemo(
    () =>
      latencyHasLiveData
        ? Math.round(latencySeries.reduce((sum, value) => sum + value, 0) / latencySeries.length)
        : 0,
    [latencyHasLiveData, latencySeries],
  );
  const latencyDelta = useMemo(() => {
    if (!latencyHasLiveData || latencySeries.length < 2) {
      return 0;
    }

    return latencySeries[latencySeries.length - 1] - latencySeries[latencySeries.length - 2];
  }, [latencyHasLiveData, latencySeries]);

  const latencyDirection = useMemo(() => {
    if (!latencyHasLiveData) {
      return "flat";
    }

    if (latencyDelta > 0) {
      return "rising";
    }

    if (latencyDelta < 0) {
      return "falling";
    }

    return "flat";
  }, [latencyDelta, latencyHasLiveData]);

  const latencyChart = useMemo(() => {
    const width = 420;
    const height = 170;
    const topPad = 12;
    const bottomPad = 20;
    const leftPad = 10;
    const rightPad = 10;

    const stepX = (width - leftPad - rightPad) / Math.max(latencySeries.length - 1, 1);
    const maxY = Math.max(...latencySeries, 1);

    const points = latencySeries.map((sample, index) => {
      const x = leftPad + index * stepX;
      const normalized = sample / maxY;
      const y = topPad + (1 - normalized) * (height - topPad - bottomPad);
      return { x, y, sample };
    });

    const linePath = points
      .map((point, index) => `${index === 0 ? "M" : "L"}${point.x.toFixed(2)} ${point.y.toFixed(2)}`)
      .join(" ");

    const firstPoint = points[0];
    const lastPoint = points[points.length - 1];
    const areaPath = `${linePath} L${lastPoint.x.toFixed(2)} ${(height - 4).toFixed(2)} L${firstPoint.x.toFixed(2)} ${(height - 4).toFixed(2)} Z`;

    return {
      width,
      height,
      topPad,
      bottomPad,
      linePath,
      areaPath,
      points,
      latest: lastPoint,
    };
  }, [latencySeries]);

  const suggestedAction = useMemo(() => {
    if (!connected) {
      return "Connect wallet to start monitor session.";
    }

    if (status === "connecting" || status === "reconnecting") {
      return "Keep this tab open while stream reconnects.";
    }

    if (events.length === 0) {
      return "No fresh events yet. Trigger a wallet transaction to validate stream health.";
    }

    if (metrics.successRatePct < 95) {
      return "Success rate is dipping. Review fee strategy and retry behavior.";
    }

    return "Stream looks healthy. Continue monitoring for slot lag spikes.";
  }, [connected, events.length, metrics.successRatePct, status]);

  return (
    <div className="relative min-h-screen overflow-hidden bg-black text-white">
      <div className="pointer-events-none absolute inset-0 bg-[radial-gradient(circle_at_12%_8%,rgba(255,255,255,0.09),transparent_24%),linear-gradient(rgba(255,255,255,0.03)_1px,transparent_1px),linear-gradient(90deg,rgba(255,255,255,0.03)_1px,transparent_1px)] bg-[size:auto,56px_56px,56px_56px] opacity-35" />

      <main className="relative z-10 mx-auto flex w-full max-w-6xl flex-col gap-6 px-4 py-5 sm:px-6 lg:px-8">
        <FloatingNav />

        <section id="overview" className="grid gap-6 lg:grid-cols-[1.05fr_0.95fr] lg:items-stretch">
          <div className="relative overflow-hidden rounded-[2rem] border border-white/10 bg-white/[0.03] p-6 shadow-[0_18px_60px_rgba(0,0,0,0.32)] sm:p-8">
            <div className="absolute inset-0 bg-[radial-gradient(circle_at_20%_10%,rgba(255,255,255,0.12),transparent_28%),radial-gradient(circle_at_80%_0%,rgba(255,255,255,0.06),transparent_22%)]" />
            <div className="relative">
              <div className="flex flex-wrap items-center justify-between gap-3">
                <Link href="/" className="inline-flex items-center gap-2 rounded-full border border-white/10 bg-black/60 px-3 py-1.5 transition hover:border-white/30 hover:bg-white/10">
                  <Image
                    src="/txpulse.png"
                    alt="TxPulse logo"
                    width={18}
                    height={18}
                    className="h-[18px] w-[18px] rounded-full object-cover"
                    priority
                  />
                  <p className="text-[10px] uppercase tracking-[0.32em] text-white/45">Wallet-auth monitor</p>
                </Link>
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

              <h1 className="mt-4 max-w-3xl text-4xl font-semibold tracking-[-0.04em] text-white sm:text-6xl">
                Monitor your connected Solana wallet in real time.
              </h1>
              <p className="mt-5 max-w-2xl text-sm leading-6 text-white/65 sm:text-base">
                TxPulse uses your connected wallet address as the default monitor target and starts streaming automatically once authenticated.
              </p>

              <div className="mt-4 inline-flex items-center gap-2 rounded-full border border-white/10 bg-black/65 px-3 py-1.5 text-xs text-white/70">
                <span className="h-2 w-2 rounded-full bg-white/80" />
                {statusText}
              </div>

              <div className="mt-8">
                <AddressInput
                  value={address}
                  onChange={setAddress}
                  onMonitor={() => startMonitoring(address)}
                  onStop={disconnect}
                  statusText={statusText}
                  disabled={!connected}
                  stopDisabled={status === "idle"}
                />
                {connected && walletAddress && (
                  <div className="mt-3 flex flex-wrap items-center gap-2 text-xs text-white/65">
                    <span>Phantom is used for login. Monitor target can be any wallet/program address.</span>
                    <button
                      type="button"
                      onClick={() => {
                        setAddress(walletAddress);
                        startMonitoring(walletAddress);
                      }}
                      className="rounded-full border border-white/15 px-3 py-1 transition hover:border-white/30 hover:bg-white/10"
                    >
                      Use Connected Wallet
                    </button>
                  </div>
                )}
              </div>

              <div className="mt-8 grid gap-3 sm:grid-cols-3">
                {heroStats.map((stat) => (
                  <div key={stat.label} className="rounded-[1.25rem] border border-white/10 bg-black/70 px-4 py-3">
                    <p className="text-[10px] uppercase tracking-[0.28em] text-white/40">{stat.label}</p>
                    <p className="mt-2 text-lg font-medium text-white">{stat.value}</p>
                  </div>
                ))}
              </div>

              <p className="mt-3 text-xs text-white/55">Latest event: {latestEventLabel}</p>
            </div>
          </div>

          <div className="flex h-full flex-col gap-4 rounded-[2rem] border border-white/10 bg-white/[0.03] p-5 shadow-[0_18px_60px_rgba(0,0,0,0.32)] sm:p-6">
            <div>
              <p className="text-[11px] uppercase tracking-[0.34em] text-white/45">Runtime summary</p>
              <p className="mt-3 text-2xl font-semibold tracking-tight text-white">
                Wallet-native access. No email login. No password flow.
              </p>
            </div>

            <div className="grid grid-cols-2 gap-3">
              <div className="rounded-[1.25rem] border border-white/10 bg-black/70 p-4">
                <p className="text-[10px] uppercase tracking-[0.28em] text-white/40">Status</p>
                <p className="mt-2 text-sm text-white/85">{status}</p>
              </div>
              <div className="rounded-[1.25rem] border border-white/10 bg-black/70 p-4">
                <p className="text-[10px] uppercase tracking-[0.28em] text-white/40">Wallet</p>
                <p className="mt-2 truncate text-sm text-white/85">{walletAddress || "Not connected"}</p>
              </div>
              <div className="rounded-[1.25rem] border border-white/10 bg-black/70 p-4">
                <p className="text-[10px] uppercase tracking-[0.28em] text-white/40">Slot lag</p>
                <p className="mt-2 text-sm text-white/85">{metrics.currentSlotLag}</p>
              </div>
              <div className="rounded-[1.25rem] border border-white/10 bg-black/70 p-4">
                <p className="text-[10px] uppercase tracking-[0.28em] text-white/40">Throughput</p>
                <p className="mt-2 text-sm text-white/85">{metrics.txPerMinute} tx/min</p>
              </div>
            </div>

            <div className="rounded-[1.25rem] border border-white/10 bg-black/70 p-4">
              <p className="text-[11px] uppercase tracking-[0.3em] text-white/45">Confirmation Latency Trend</p>
              <p className="mt-2 text-xs text-white/55">Rolling confirmation timing from the latest websocket events.</p>

              <div className="mt-4 rounded-xl border border-white/10 bg-black/55 p-3">
                <div className="relative overflow-hidden rounded-lg bg-black/75">
                  <svg
                    viewBox={`0 0 ${latencyChart.width} ${latencyChart.height}`}
                    className="h-40 w-full"
                    preserveAspectRatio="none"
                    role="img"
                    aria-label="Confirmation latency mini chart"
                  >
                    <defs>
                      <linearGradient id="latencyAreaFill" x1="0" y1="0" x2="0" y2="1">
                        <stop offset="0%" stopColor="rgba(255,255,255,0.36)" />
                        <stop offset="100%" stopColor="rgba(255,255,255,0.02)" />
                      </linearGradient>
                    </defs>

                    {[0.33, 0.66].map((ratio) => {
                      const y = latencyChart.topPad + ratio * (latencyChart.height - latencyChart.topPad - latencyChart.bottomPad);
                      return (
                        <line
                          key={`grid-${ratio}`}
                          x1="0"
                          x2={latencyChart.width}
                          y1={y}
                          y2={y}
                          stroke="rgba(255,255,255,0.1)"
                          strokeWidth="1"
                          strokeDasharray="4 4"
                        />
                      );
                    })}

                    <path d={latencyChart.areaPath} fill="url(#latencyAreaFill)" />
                    <path
                      d={latencyChart.linePath}
                      fill="none"
                      stroke={latencyHasLiveData ? "rgba(255,255,255,0.92)" : "rgba(255,255,255,0.35)"}
                      strokeWidth="2.2"
                      strokeLinejoin="round"
                      strokeLinecap="round"
                    />

                    <circle
                      cx={latencyChart.latest.x}
                      cy={latencyChart.latest.y}
                      r="3"
                      fill="rgba(255,255,255,0.95)"
                    />
                  </svg>
                </div>

                <div className="mt-3 flex flex-wrap items-center gap-x-4 gap-y-1 text-[10px] uppercase tracking-[0.2em] text-white/45">
                  <p>Latest {latencyHasLiveData ? `${latencyChart.latest.sample} ms` : "-"}</p>
                  <p>Avg {latencyHasLiveData ? `${latencyAvg} ms` : "-"}</p>
                  <p>Peak {latencyHasLiveData ? `${latencyPeak} ms` : "Waiting"}</p>
                  <p>Trend {latencyDirection}</p>
                </div>
              </div>
            </div>

            <div className="relative overflow-hidden rounded-[1.25rem] border border-white/10 bg-black/70 p-4">
              <div className="pointer-events-none absolute inset-x-0 top-0 h-px bg-gradient-to-r from-transparent via-white/40 to-transparent" />
              <p className="text-[10px] uppercase tracking-[0.32em] text-white/40">Live Signal Ribbon</p>

              <div className="mt-3 flex flex-wrap items-center gap-x-3 gap-y-2 font-mono text-[11px] text-white/80">
                <span className="text-white/95">LAT</span>
                <span>{latencyHasLiveData ? `${latencyChart.latest.sample}ms` : "--"}</span>
                <span className="h-1 w-1 rounded-full bg-white/35" />
                <span>AVG {latencyHasLiveData ? `${latencyAvg}ms` : "--"}</span>
                <span className="h-1 w-1 rounded-full bg-white/35" />
                <span>PEAK {latencyHasLiveData ? `${latencyPeak}ms` : "--"}</span>
                <span className="h-1 w-1 rounded-full bg-white/35" />
                <span>WIN {events.length}</span>
                <span className="h-1 w-1 rounded-full bg-white/35" />
                <span>SUCCESS {metrics.successRatePct.toFixed(1)}%</span>
                <span className="h-1 w-1 rounded-full bg-white/35" />
                <span>TREND {latencyDirection}</span>
              </div>

              <div className="mt-4 h-1.5 w-full overflow-hidden rounded-full bg-white/10">
                <div
                  className="h-full rounded-full bg-gradient-to-r from-white/45 via-white/90 to-white/45 transition-all duration-500"
                  style={{ width: `${Math.max(8, Math.min(100, metrics.successRatePct))}%` }}
                />
              </div>

              <p className="mt-3 text-xs leading-5 text-white/70">{suggestedAction}</p>
            </div>
          </div>
        </section>

        <MetricsGrid metrics={metrics} />

        <section>
          <TransactionFeed events={events} />
        </section>
      </main>
    </div>
  );
}
