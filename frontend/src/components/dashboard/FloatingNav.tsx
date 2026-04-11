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
      className="sticky top-4 z-30"
    >
      <div className="mx-auto flex w-full max-w-6xl justify-center px-3 sm:px-4">
        <motion.div
          whileHover={{ y: -1 }}
          transition={{ duration: 0.2, ease: "easeOut" }}
          className="relative inline-flex w-auto items-center justify-center gap-5 overflow-hidden rounded-full border border-white/20 bg-black/45 px-6 py-3 shadow-[0_10px_30px_rgba(0,0,0,0.38)] backdrop-blur-xl sm:gap-6 sm:px-7"
        >
          <div className="pointer-events-none absolute inset-0 bg-[linear-gradient(to_bottom,rgba(255,255,255,0.18),rgba(255,255,255,0.03)_35%,transparent_70%)]" />
          <div className="pointer-events-none absolute inset-x-10 top-0 h-px bg-gradient-to-r from-transparent via-white/80 to-transparent" />

          <Link href="/" className="relative flex items-center gap-2.5 rounded-full border border-transparent px-1 py-0.5 transition hover:border-white/20">
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
            <p className="text-[11px] font-semibold tracking-[0.24em] text-white uppercase">TxPulse</p>
          </Link>

          <div className="relative hidden items-center gap-5 sm:flex">
            <a className="text-[12px] text-white/72 transition-colors hover:text-white" href="#overview">
              Overview
            </a>
            <a className="text-[12px] text-white/72 transition-colors hover:text-white" href="#dashboard">
              Dashboard
            </a>
            <a className="text-[12px] text-white/72 transition-colors hover:text-white" href="#feed">
              Live Feed
            </a>
            <Link className="text-[12px] text-white/72 transition-colors hover:text-white" href="/docs">
              Docs
            </Link>
          </div>

        </motion.div>
      </div>
    </motion.nav>
  );
}
