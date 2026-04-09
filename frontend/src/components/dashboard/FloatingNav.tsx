"use client";

import { motion } from "framer-motion";

// Lightweight nav keeps branding and key entry points accessible.
export function FloatingNav() {
  return (
    <motion.nav
      initial={{ opacity: 0, y: -12 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.45, ease: "easeOut" }}
      className="sticky top-4 z-20 mx-auto flex w-full max-w-6xl items-center justify-between rounded-full border border-white/10 bg-slate-950/70 px-4 py-3 shadow-[0_0_45px_rgba(56,189,248,0.2)] backdrop-blur-xl"
    >
      <div className="flex items-center gap-2">
        <span className="h-2 w-2 rounded-full bg-cyan-300 shadow-[0_0_16px_rgba(103,232,249,0.95)]" />
        <p className="text-sm font-semibold tracking-wide text-slate-100">TxPulse</p>
      </div>
      <div className="flex items-center gap-3 text-xs text-slate-300 sm:text-sm">
        <a className="transition-colors hover:text-cyan-200" href="#dashboard">
          Dashboard
        </a>
        <a className="transition-colors hover:text-cyan-200" href="#feed">
          Live Feed
        </a>
        <a className="transition-colors hover:text-cyan-200" href="#docs">
          Docs
        </a>
      </div>
    </motion.nav>
  );
}
