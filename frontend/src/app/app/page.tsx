"use client";

import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import Image from "next/image";
import Link from "next/link";
import { WalletMultiButton } from "@solana/wallet-adapter-react-ui";
import { useWallet } from "@solana/wallet-adapter-react";
import { AddressInput } from "@/components/dashboard/AddressInput";
import { FloatingNav } from "@/components/dashboard/FloatingNav";
import { TransactionFeed } from "@/components/dashboard/TransactionFeed";
import { ExplainResultCard } from "@/components/explainer/ExplainResultCard";
import { explainTransaction, isLikelySolanaSignature, type ExplainResponse, type SolanaNetwork } from "@/lib/explainer";
import { useTxPulseSocket } from "@/lib/useTxPulseSocket";

const networkOptions: Array<{ value: SolanaNetwork; label: string }> = [
  { value: "mainnet-beta", label: "mainnet-beta" },
  { value: "devnet", label: "devnet" },
  { value: "testnet", label: "testnet" },
];

function shortenAddress(address: string): string {
  if (address.length < 14) {
    return address;
  }

  return `${address.slice(0, 6)}...${address.slice(-6)}`;
}

export default function MonitorAppPage() {
  const [isMounted, setIsMounted] = useState(false);
  const { connected, publicKey } = useWallet();
  const [address, setAddress] = useState("");
  const [selectedFailureHash, setSelectedFailureHash] = useState("");
  const [explainNetwork, setExplainNetwork] = useState<SolanaNetwork>("mainnet-beta");
  const [explainResult, setExplainResult] = useState<ExplainResponse | null>(null);
  const [explainError, setExplainError] = useState<string | null>(null);
  const [explaining, setExplaining] = useState(false);
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

  const statusTone = useMemo(() => {
    if (lastError) {
      return "bg-white/8 border-white/30 text-white";
    }
    if (status === "connected") {
      return "bg-white text-black border-white";
    }
    if (status === "reconnecting" || status === "connecting") {
      return "bg-white/10 border-white/20 text-white";
    }
    return "bg-white/[0.04] border-white/15 text-white/80";
  }, [lastError, status]);

  const latencySeries = useMemo(() => {
    const recent = latencySamples.slice(-12);
    if (recent.length === 0) {
      return Array.from({ length: 12 }, () => 0);
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
    const width = 480;
    const height = 176;
    const topPad = 12;
    const bottomPad = 22;
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

  const failedEventsCount = useMemo(
    () => events.filter((event) => event.status === "failed").length,
    [events],
  );

  const latestFailedSignature = useMemo(
    () => events.find((event) => event.status === "failed")?.signature || "",
    [events],
  );

  const kpiCards = useMemo(
    () => [
      { label: "Success Rate", value: `${metrics.successRatePct.toFixed(1)}%` },
      { label: "Avg Confirmation", value: `${Math.round(metrics.avgConfirmationMs)} ms` },
      { label: "Slot Lag", value: `${metrics.currentSlotLag}` },
      { label: "Throughput", value: `${metrics.txPerMinute} tx/min` },
      { label: "Cached Events", value: `${events.length}` },
    ],
    [events.length, metrics.avgConfirmationMs, metrics.currentSlotLag, metrics.successRatePct, metrics.txPerMinute],
  );

  const connectionDotTone = useMemo(() => {
    if (lastError || status === "error") {
      return "bg-white/55";
    }

    if (status === "connected") {
      return "bg-white";
    }

    return "bg-white/35";
  }, [lastError, status]);

  const runExplain = useCallback(async (hash: string) => {
    setExplainError(null);
    setExplaining(true);

    try {
      const response = await explainTransaction(hash, explainNetwork);
      setExplainResult(response);
    } catch (error) {
      const message = error instanceof Error ? error.message : "Unable to decode this transaction.";
      setExplainError(message);
      setExplainResult(null);
    } finally {
      setExplaining(false);
    }
  }, [explainNetwork]);

  const handleSelectFailed = useCallback((signature: string) => {
    setSelectedFailureHash(signature);
    void runExplain(signature);
  }, [runExplain]);

  return (
    <div className="relative min-h-screen overflow-hidden bg-black text-white">
      <div className="pointer-events-none absolute inset-0 bg-[radial-gradient(circle_at_12%_8%,rgba(255,255,255,0.09),transparent_24%),linear-gradient(rgba(255,255,255,0.03)_1px,transparent_1px),linear-gradient(90deg,rgba(255,255,255,0.03)_1px,transparent_1px)] bg-[size:auto,56px_56px,56px_56px] opacity-35" />

      <main className="relative z-10 mx-auto flex w-full max-w-7xl flex-col gap-6 px-4 py-5 sm:px-6 lg:px-8">
        <FloatingNav />

        <section id="overview" className="relative overflow-hidden border-b border-white/12 pb-6 sm:pb-7">
          <div className="pointer-events-none absolute inset-0 bg-[radial-gradient(circle_at_18%_0%,rgba(255,255,255,0.12),transparent_26%),radial-gradient(circle_at_82%_0%,rgba(255,255,255,0.08),transparent_28%)]" />
          <div className="relative">
            <div className="flex flex-wrap items-center justify-between gap-3">
              <Link
                href="/"
                className="inline-flex items-center gap-2 rounded-full border border-white/10 bg-black/60 px-3 py-1.5 transition hover:border-white/30 hover:bg-white/10"
              >
                <Image
                  src="/txpulse.png"
                  alt="TxPulse logo"
                  width={18}
                  height={18}
                  className="h-[18px] w-[18px] rounded-full object-cover"
                  priority
                />
                <p className="text-[10px] uppercase tracking-[0.3em] text-white/45">Watch mode</p>
              </Link>

              <div className="flex flex-wrap items-center gap-2">
                <Link
                  href="/explain"
                  className="rounded-full border border-white/20 bg-black/70 px-4 py-2 text-xs font-semibold text-white transition hover:border-white/35 hover:bg-white/10"
                >
                  Open Tx Decoder
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
            </div>

            <h1 className="mt-4 text-3xl font-semibold tracking-[-0.04em] text-white sm:text-5xl">
              Solana reliability command center
            </h1>
            <p className="mt-3 max-w-3xl text-sm leading-6 text-white/68 sm:text-base">
              Monitor live transaction health and move straight into failed transaction diagnosis without leaving this page.
            </p>

            <div className="mt-4 flex flex-wrap items-center gap-2" aria-live="polite">
              <span className={`rounded-full border px-3 py-1.5 text-xs ${statusTone}`}>
                {status}
              </span>
              <span className="rounded-full border border-white/15 bg-white/[0.03] px-3 py-1.5 text-xs text-white/70">
                <span className={`mr-2 inline-block h-1.5 w-1.5 rounded-full ${connectionDotTone}`} />
                {statusText}
              </span>
              <span className="rounded-full border border-white/15 bg-white/[0.03] px-3 py-1.5 text-xs text-white/70">
                Target {activeAddress ? shortenAddress(activeAddress) : "none"}
              </span>
              {walletAddress && (
                <span className="rounded-full border border-white/15 bg-white/[0.03] px-3 py-1.5 text-xs text-white/70">
                  Wallet {shortenAddress(walletAddress)}
                </span>
              )}
            </div>

            <div className="mt-6">
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
                  <span>Phantom authenticates this session. You can still monitor any wallet or program address.</span>
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

            <div className="mt-6 flex flex-wrap items-center gap-x-5 gap-y-3 border-y border-white/10 py-4">
              {kpiCards.map((card) => (
                <div key={card.label} className="min-w-[140px] border-l border-white/15 pl-3 first:border-l-0 first:pl-0">
                  <p className="text-[10px] uppercase tracking-[0.24em] text-white/45">{card.label}</p>
                  <p className="mt-1 text-lg font-medium text-white">{card.value}</p>
                </div>
              ))}
            </div>

            <p className="mt-4 border-l-2 border-white/25 pl-3 text-xs text-white/72">
              Operator note: {suggestedAction}
            </p>
          </div>
        </section>

        <section className="grid gap-6 xl:grid-cols-2">
          <section
            id="dashboard"
            className="border-t border-white/12 pt-4 sm:pt-5"
          >
            <div className="flex flex-wrap items-center justify-between gap-2">
              <p className="text-[11px] uppercase tracking-[0.3em] text-white/45">Latency Trend</p>
              <span className="text-xs text-white/55">Direction {latencyDirection}</span>
            </div>

            <div className="mt-3 border border-white/10 bg-black/50 p-2 sm:p-3">
              <svg
                viewBox={`0 0 ${latencyChart.width} ${latencyChart.height}`}
                className="h-44 w-full"
                preserveAspectRatio="none"
                role="img"
                aria-label="Confirmation latency chart"
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

            <div className="mt-3 flex flex-wrap items-center gap-2 text-[11px] text-white/75">
              <span className="rounded-full border border-white/15 bg-white/[0.03] px-2.5 py-1">
                Latest {latencyHasLiveData ? `${latencyChart.latest.sample} ms` : "-"}
              </span>
              <span className="rounded-full border border-white/15 bg-white/[0.03] px-2.5 py-1">
                Avg {latencyHasLiveData ? `${latencyAvg} ms` : "-"}
              </span>
              <span className="rounded-full border border-white/15 bg-white/[0.03] px-2.5 py-1">
                Peak {latencyHasLiveData ? `${latencyPeak} ms` : "-"}
              </span>
              <span className="rounded-full border border-white/15 bg-white/[0.03] px-2.5 py-1">
                Failed {failedEventsCount}
              </span>
            </div>
          </section>

          <aside
            id="understand"
            className="h-fit border-t border-white/12 pt-4 sm:pt-5 xl:sticky xl:top-24 xl:border-l xl:border-t-0 xl:pl-5"
          >
            <div className="flex flex-wrap items-center justify-between gap-2">
              <p className="text-[11px] uppercase tracking-[0.3em] text-white/45">Understand Mode</p>
              <span className="rounded-full border border-white/15 bg-white/[0.03] px-3 py-1 text-[10px] uppercase tracking-[0.18em] text-white/70">
                Feed linked
              </span>
            </div>

            <h2 className="mt-3 text-2xl font-semibold tracking-[-0.03em] text-white">
              Click failed rows to debug instantly
            </h2>
            <p className="mt-2 text-sm leading-6 text-white/68">
              Keep this panel open while monitoring. It updates in place so your team stays in one workflow.
            </p>

            <div className="mt-4 grid gap-2">
              <input
                value={selectedFailureHash}
                onChange={(event) => setSelectedFailureHash(event.target.value)}
                placeholder="Failed transaction signature"
                className="w-full rounded-xl border border-white/10 bg-black/70 px-3 py-2.5 text-xs text-white outline-none transition placeholder:text-white/30 focus:border-white/30 focus:ring-1 focus:ring-white/30"
              />
              <div className="inline-flex w-full flex-wrap gap-2 rounded-xl border border-white/12 bg-black/50 p-1.5" role="tablist" aria-label="Select decode network">
                {networkOptions.map((option) => {
                  const selected = explainNetwork === option.value;
                  return (
                    <button
                      key={option.value}
                      type="button"
                      role="tab"
                      aria-selected={selected}
                      onClick={() => setExplainNetwork(option.value)}
                      className={`rounded-lg px-3 py-2 text-xs font-medium tracking-[0.04em] transition ${selected ? "bg-white text-black" : "text-white/78 hover:bg-white/10"}`}
                    >
                      {option.label}
                    </button>
                  );
                })}
              </div>
              <div className="grid grid-cols-1 gap-2 sm:grid-cols-2">
                <button
                  type="button"
                  onClick={() => void runExplain(selectedFailureHash)}
                  disabled={!isLikelySolanaSignature(selectedFailureHash) || explaining}
                  className="rounded-xl border border-white bg-white px-3 py-2.5 text-xs font-semibold !text-black transition disabled:cursor-not-allowed disabled:border-white/15 disabled:bg-white/15 disabled:text-white/30"
                >
                  {explaining ? "Running" : "Decode"}
                </button>
                <button
                  type="button"
                  onClick={() => {
                    if (latestFailedSignature) {
                      setSelectedFailureHash(latestFailedSignature);
                      void runExplain(latestFailedSignature);
                    }
                  }}
                  disabled={!latestFailedSignature}
                  className="rounded-xl border border-white/20 bg-black/70 px-3 py-2.5 text-xs font-semibold text-white transition hover:border-white/35 hover:bg-white/10 disabled:cursor-not-allowed disabled:border-white/10 disabled:bg-black/40 disabled:text-white/35"
                >
                  Use latest failed
                </button>
              </div>
            </div>

            {explainError && (
              <div className="mt-3 rounded-xl border border-white/15 bg-black/70 p-3 text-xs text-white/85">
                {explainError}
              </div>
            )}

            <div className="mt-4">
              {explaining && (
                <div className="border border-white/10 bg-black/45 p-4 text-sm text-white/70">
                  <p className="font-medium text-white/90">Generating decode...</p>
                  <div className="mt-3 h-2 w-full overflow-hidden rounded-full bg-white/10">
                    <div className="h-full w-1/2 animate-pulse rounded-full bg-white/50" />
                  </div>
                </div>
              )}
              {!explaining && explainResult ? (
                <ExplainResultCard result={explainResult} compact />
              ) : (
                !explaining && (
                <div className="border border-dashed border-white/15 bg-black/45 p-4 text-sm text-white/65">
                  <p className="font-medium text-white/85">No failed tx selected yet.</p>
                  <p className="mt-2">Select a failed row from the feed to populate this panel.</p>
                </div>
                )
              )}
            </div>
          </aside>

          <div className="xl:col-span-2">
            <TransactionFeed
              events={events}
              onSelectFailed={handleSelectFailed}
              selectedSignature={selectedFailureHash || null}
            />
          </div>
        </section>
      </main>
    </div>
  );
}
