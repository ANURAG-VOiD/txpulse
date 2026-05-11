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
      className="sticky top-3 z-30"
    >
      <div className="mx-auto flex w-full max-w-7xl justify-center px-1 sm:px-2">
        <motion.div
          whileHover={{ y: -1 }}
          transition={{ duration: 0.2, ease: "easeOut" }}
          className="relative inline-flex w-auto items-center justify-between gap-3 overflow-hidden rounded-[1.2rem] border border-white/15 bg-black/55 px-3 py-2 shadow-[0_12px_32px_rgba(0,0,0,0.36)] backdrop-blur-2xl sm:gap-4 sm:px-4"
        >
          <div className="pointer-events-none absolute inset-0 bg-[linear-gradient(to_bottom,rgba(255,255,255,0.16),rgba(255,255,255,0.02)_40%,transparent_72%)]" />
          <div className="pointer-events-none absolute inset-x-6 top-0 h-px bg-gradient-to-r from-transparent via-white/70 to-transparent" />

          <Link href="/" className="relative flex items-center gap-2 px-1.5 py-1 transition hover:opacity-90">
            <span className="overflow-hidden rounded-md">
              <Image
                src="/txpulse.png"
                alt="TxPulse logo"
                width={24}
                height={24}
                className="h-6 w-6 object-cover"
                priority
              />
            </span>
            <p className="text-[11px] font-semibold tracking-[0.18em] text-white uppercase">TxPulse</p>
          </Link>

          <div className="relative hidden items-center gap-1 sm:flex">
            <Link className="px-2.5 py-1.5 text-[12px] text-white/75 transition-colors hover:text-white" href="/docs">
              Docs
            </Link>
            <Link className="px-2.5 py-1.5 text-[12px] text-white/75 transition-colors hover:text-white" href="/explain">
              Decoder
            </Link>
            <Link className="px-2.5 py-1.5 text-[12px] text-white/75 transition-colors hover:text-white" href="/admin">
              Admin
            </Link>
          </div>

          <a
            href="https://github.com/TxPulse"
            target="_blank"
            rel="noreferrer"
            aria-label="Open TxPulse GitHub"
            className="relative inline-flex h-8 w-8 items-center justify-center text-white/80 transition hover:text-white"
          >
            <svg width="15" height="15" viewBox="0 0 24 24" fill="currentColor" aria-hidden="true">
              <path d="M12 .5a12 12 0 0 0-3.79 23.39c.6.11.82-.26.82-.58v-2.03c-3.34.73-4.04-1.42-4.04-1.42-.55-1.39-1.34-1.76-1.34-1.76-1.09-.75.08-.73.08-.73 1.2.09 1.84 1.24 1.84 1.24 1.08 1.84 2.84 1.31 3.53 1 .11-.78.42-1.31.76-1.62-2.67-.31-5.47-1.34-5.47-5.94 0-1.31.47-2.38 1.24-3.22-.12-.31-.54-1.56.12-3.25 0 0 1.01-.32 3.31 1.23a11.47 11.47 0 0 1 6.03 0c2.3-1.55 3.3-1.23 3.3-1.23.67 1.69.25 2.94.12 3.25.77.84 1.24 1.91 1.24 3.22 0 4.61-2.81 5.63-5.49 5.93.43.37.82 1.1.82 2.22v3.28c0 .32.22.69.83.58A12 12 0 0 0 12 .5Z" />
            </svg>
          </a>
        </motion.div>
      </div>
    </motion.nav>
  );
}
