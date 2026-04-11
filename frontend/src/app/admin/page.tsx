"use client";

import { useEffect, useMemo, useState } from "react";
import Link from "next/link";
import { useWallet } from "@solana/wallet-adapter-react";
import { WalletMultiButton } from "@solana/wallet-adapter-react-ui";

export default function AdminPage() {
  const [isMounted, setIsMounted] = useState(false);
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

  return (
    <div className="relative min-h-screen overflow-hidden bg-black text-white">
      <div className="pointer-events-none absolute inset-0 bg-[radial-gradient(circle_at_15%_10%,rgba(255,255,255,0.09),transparent_24%),linear-gradient(rgba(255,255,255,0.03)_1px,transparent_1px),linear-gradient(90deg,rgba(255,255,255,0.03)_1px,transparent_1px)] bg-[size:auto,56px_56px,56px_56px] opacity-35" />

      <main className="relative z-10 mx-auto flex min-h-screen w-full max-w-4xl items-center px-4 py-10 sm:px-6 lg:px-8">
        <section className="w-full rounded-[2rem] border border-white/10 bg-white/[0.03] p-7 shadow-[0_18px_60px_rgba(0,0,0,0.32)] sm:p-9">
          <div className="flex flex-wrap items-center justify-between gap-3">
            <p className="text-[11px] uppercase tracking-[0.3em] text-white/45">TxPulse Admin</p>
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
            <div className="mt-6 rounded-2xl border border-white/10 bg-black/70 p-5">
              <h1 className="text-2xl font-semibold tracking-tight text-white">Admin Console</h1>
              <p className="mt-2 text-sm text-white/65">
                Wallet-authenticated admin area. Add internal controls and monitoring operations here.
              </p>
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
