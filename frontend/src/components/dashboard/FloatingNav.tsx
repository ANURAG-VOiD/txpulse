"use client";

import { motion } from "framer-motion";
import Image from "next/image";
import Link from "next/link";

// Lightweight nav keeps branding and key entry points accessible.
export function FloatingNav() {
  return (
    <motion.nav
      initial={{ opacity: 0, y: -12 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.45, ease: "easeOut" }}
      className="sticky top-2 z-30"
    >
      <div className="mx-auto flex w-full max-w-7xl px-1 sm:px-2">
        <motion.div
          whileHover={{ y: -1 }}
          transition={{ duration: 0.2, ease: "easeOut" }}
          className="relative flex w-full items-center justify-between gap-4 overflow-hidden rounded-xl border border-white/15 bg-black/60 px-3 py-2.5 shadow-[0_8px_24px_rgba(0,0,0,0.28)] backdrop-blur-xl sm:px-4"
        >
          <div className="pointer-events-none absolute inset-0 bg-[linear-gradient(to_bottom,rgba(255,255,255,0.12),rgba(255,255,255,0.02)_35%,transparent_70%)]" />

          <Link href="/" className="relative flex items-center gap-2.5 rounded-lg border border-transparent px-1.5 py-1 transition hover:border-white/20 hover:bg-white/[0.04]">
            <span className="overflow-hidden rounded-md border border-white/20 bg-white/5">
              <Image
                src="/txpulse.png"
                alt="TxPulse logo"
                width={26}
                height={26}
                className="h-6 w-6 object-cover"
                priority
              />
            </span>
            <div>
              <p className="text-[11px] font-semibold tracking-[0.18em] text-white uppercase">TxPulse</p>
              <p className="text-[10px] text-white/55">Reliability Console</p>
            </div>
          </Link>

          <div className="relative hidden items-center gap-1 md:flex">
            <a className="rounded-md px-2.5 py-1.5 text-[12px] text-white/72 transition-colors hover:bg-white/[0.06] hover:text-white" href="#overview">
              Overview
            </a>
            <a className="rounded-md px-2.5 py-1.5 text-[12px] text-white/72 transition-colors hover:bg-white/[0.06] hover:text-white" href="#dashboard">
              Dashboard
            </a>
            <a className="rounded-md px-2.5 py-1.5 text-[12px] text-white/72 transition-colors hover:bg-white/[0.06] hover:text-white" href="#feed">
              Live Feed
            </a>
            <a className="rounded-md px-2.5 py-1.5 text-[12px] text-white/72 transition-colors hover:bg-white/[0.06] hover:text-white" href="#understand">
              Understand
            </a>
            <Link className="rounded-md px-2.5 py-1.5 text-[12px] text-white/72 transition-colors hover:bg-white/[0.06] hover:text-white" href="/explain">
              Decoder
            </Link>
            <Link className="rounded-md px-2.5 py-1.5 text-[12px] text-white/72 transition-colors hover:bg-white/[0.06] hover:text-white" href="/docs">
              Docs
            </Link>
          </div>

          <div className="text-[11px] text-white/55 md:hidden">Sections</div>
        </motion.div>
      </div>
    </motion.nav>
  );
}
