"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import Image from "next/image";
import { WalletMultiButton } from "@solana/wallet-adapter-react-ui";
import { useWallet } from "@solana/wallet-adapter-react";
import { AddressInput } from "@/components/dashboard/AddressInput";
import { FloatingNav } from "@/components/dashboard/FloatingNav";
import { LatencyChart } from "@/components/dashboard/LatencyChart";
import { MetricsGrid } from "@/components/dashboard/MetricsGrid";
import { TransactionFeed } from "@/components/dashboard/TransactionFeed";
import { useTxPulseSocket } from "@/lib/useTxPulseSocket";

export default function MonitorAppPage() {
  const [isMounted, setIsMounted] = useState(false);
  const { connected, publicKey } = useWallet();
  const [address, setAddress] = useState("");
  const autoStartedAddressRef = useRef<string | null>(null);

  const {
    metrics,
    events,
    status,
    lastError,
    activeAddress,
    latencySamples,
    startMonitoring,
  } = useTxPulseSocket(address);

  const walletAddress = publicKey?.toBase58() || "";

  useEffect(() => {
    setIsMounted(true);
  }, []);

  useEffect(() => {
    if (!connected || !walletAddress) {
      autoStartedAddressRef.current = null;
      return;
    }

    setAddress(walletAddress);

    if (autoStartedAddressRef.current === walletAddress) {
      return;
    }

    autoStartedAddressRef.current = walletAddress;
    startMonitoring(walletAddress);
  }, [connected, walletAddress, startMonitoring]);

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
                <div className="inline-flex items-center gap-2 rounded-full border border-white/10 bg-black/60 px-3 py-1.5">
                  <Image
                    src="/txpulse.png"
                    alt="TxPulse logo"
                    width={18}
                    height={18}
                    className="h-[18px] w-[18px] rounded-full object-cover"
                    priority
                  />
                  <p className="text-[10px] uppercase tracking-[0.32em] text-white/45">Wallet-auth monitor</p>
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

              <h1 className="mt-4 max-w-3xl text-4xl font-semibold tracking-[-0.04em] text-white sm:text-6xl">
                Monitor your connected Solana wallet in real time.
              </h1>
              <p className="mt-5 max-w-2xl text-sm leading-6 text-white/65 sm:text-base">
                TxPulse uses your connected wallet address as the default monitor target and starts streaming automatically once authenticated.
              </p>

              <div className="mt-8">
                <AddressInput
                  value={address}
                  onChange={setAddress}
                  onMonitor={() => startMonitoring(address)}
                  statusText={statusText}
                  disabled={!connected}
                />
              </div>

              <div className="mt-8 grid gap-3 sm:grid-cols-3">
                {heroStats.map((stat) => (
                  <div key={stat.label} className="rounded-[1.25rem] border border-white/10 bg-black/70 px-4 py-3">
                    <p className="text-[10px] uppercase tracking-[0.28em] text-white/40">{stat.label}</p>
                    <p className="mt-2 text-lg font-medium text-white">{stat.value}</p>
                  </div>
                ))}
              </div>
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
          </div>
        </section>

        <MetricsGrid metrics={metrics} />

        <section className="grid grid-cols-1 gap-4 lg:grid-cols-[0.92fr_1.08fr]">
          <LatencyChart samples={latencySamples} />
          <TransactionFeed events={events} />
        </section>
      </main>
    </div>
  );
}
