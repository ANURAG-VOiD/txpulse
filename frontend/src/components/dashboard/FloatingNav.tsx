"use client";

import { motion } from "framer-motion";
import Image from "next/image";
import { cn } from "@/lib/utils";

// Lightweight nav keeps branding and key entry points accessible.
export function FloatingNav() {
  return (
    <motion.nav
      initial={{ opacity: 0, y: -12 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.45, ease: "easeOut" }}
      className={cn(
        "sticky top-4 z-20 mx-auto flex w-full max-w-6xl items-center justify-between rounded-full border border-white/10 bg-black/80 px-4 py-3 shadow-[0_20px_60px_rgba(0,0,0,0.45)] backdrop-blur-2xl",
      )}
    >
      <div className="flex items-center gap-2.5">
        <span className="overflow-hidden rounded-full border border-white/20 bg-white/5">
          <Image
            src="/txpulse.png"
            alt="TxPulse logo"
            width={26}
            height={26}
            className="h-6 w-6 object-cover"
            priority
          />
        </span>
        <p className="text-sm font-semibold tracking-[0.28em] text-white uppercase">TxPulse</p>
      </div>
      <div className="flex items-center gap-3 text-xs text-white/70 sm:text-sm">
        <a className="transition-colors hover:text-white" href="#overview">
          Overview
        </a>
        <a className="transition-colors hover:text-white" href="#dashboard">
          Dashboard
        </a>
        <a className="transition-colors hover:text-white" href="#feed">
          Live Feed
        </a>
        <a className="transition-colors hover:text-white" href="#docs">
          Docs
        </a>
      </div>
    </motion.nav>
  );
}
