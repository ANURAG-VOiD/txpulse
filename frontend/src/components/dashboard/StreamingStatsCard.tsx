"use client";

import { useEffect, useRef, useState } from "react";

const rows = [
  { label: "Median Confirm", trend: "+7.2%", value: "402ms" },
  { label: "Success Rate", trend: "stable", value: "99.14%" },
  { label: "Slot Lag", trend: "recovering", value: "1.8 slots" },
];

const throughputSnapshots = [64, 71, 68, 79, 73, 84, 88, 82, 91, 95, 89, 97];

export function StreamingStatsCard() {
  const cardRef = useRef<HTMLDivElement | null>(null);
  const frameRef = useRef<number | null>(null);
  const [active, setActive] = useState(false);

  useEffect(() => {
    return () => {
      if (frameRef.current !== null) {
        window.cancelAnimationFrame(frameRef.current);
      }
    };
  }, []);

  const updatePointer = (clientX: number, clientY: number) => {
    const element = cardRef.current;
    if (!element) {
      return;
    }

    const rect = element.getBoundingClientRect();
    const x = (clientX - rect.left) / rect.width;
    const y = (clientY - rect.top) / rect.height;

    const rotateX = (0.5 - y) * 8;
    const rotateY = (x - 0.5) * 8;

    if (frameRef.current !== null) {
      window.cancelAnimationFrame(frameRef.current);
    }

    frameRef.current = window.requestAnimationFrame(() => {
      element.style.setProperty("--mx", `${Math.max(0, Math.min(100, x * 100)).toFixed(2)}%`);
      element.style.setProperty("--my", `${Math.max(0, Math.min(100, y * 100)).toFixed(2)}%`);
      element.style.setProperty("--rx", `${rotateX.toFixed(2)}deg`);
      element.style.setProperty("--ry", `${rotateY.toFixed(2)}deg`);
    });
  };

  return (
    <aside
      ref={cardRef}
      className="streaming-card reveal-up relative overflow-hidden rounded-3xl border border-white/10 bg-white/[0.03] p-5 [animation-delay:220ms]"
      onPointerMove={(event) => {
        setActive(true);
        updatePointer(event.clientX, event.clientY);
      }}
      onPointerLeave={() => {
        setActive(false);
        const element = cardRef.current;
        if (!element) {
          return;
        }

        element.style.setProperty("--rx", "0deg");
        element.style.setProperty("--ry", "0deg");
      }}
      onPointerDown={(event) => {
        setActive(true);
        updatePointer(event.clientX, event.clientY);
      }}
      onPointerUp={() => setActive(false)}
      onFocus={() => setActive(true)}
      onBlur={() => setActive(false)}
      tabIndex={0}
      aria-label="Live streaming summary card"
    >
      <div className="pointer-events-none absolute inset-0 bg-[radial-gradient(circle_at_var(--mx,50%)_var(--my,20%),rgba(255,255,255,0.20),transparent_36%)] transition-opacity duration-300" />
      <div className="pointer-events-none absolute inset-0 bg-[radial-gradient(circle_at_100%_0%,rgba(255,255,255,0.16),transparent_36%)]" />
      <div className="pointer-events-none absolute -right-14 -top-14 h-36 w-36 rounded-full border border-white/10 opacity-70" />

      <div className="relative">
        <div className="flex items-center justify-between gap-3">
          <p className="text-[11px] uppercase tracking-[0.3em] text-white/50">Now streaming</p>
          <span className="inline-flex items-center gap-1.5 rounded-full border border-white/15 bg-white/[0.03] px-2.5 py-1 text-[10px] uppercase tracking-[0.2em] text-white/70">
            <span className="h-1.5 w-1.5 rounded-full bg-white animate-pulse" />
            live
          </span>
        </div>

        <div className="mt-4 flex items-end justify-between gap-3 border-b border-white/10 pb-4">
          <div>
            <p className="text-4xl font-semibold tracking-[-0.04em] text-white sm:text-5xl">21,483</p>
            <p className="mt-1 text-xs uppercase tracking-[0.22em] text-white/55">transactions / hour</p>
          </div>
          <p className="text-right text-xs text-white/55">observed sample traffic</p>
        </div>

        <div className="mt-5 grid gap-2">
          {rows.map((row) => (
            <div key={row.label} className="grid grid-cols-[1fr_auto] items-center gap-2 border border-white/10 bg-black/35 px-3 py-2.5">
              <div>
                <p className="text-xs text-white/55">{row.label}</p>
                <p className="mt-0.5 text-lg font-medium tracking-[-0.02em] text-white">{row.value}</p>
              </div>
              <span className="rounded-full border border-white/15 px-2 py-1 text-[10px] uppercase tracking-[0.17em] text-white/70">{row.trend}</span>
            </div>
          ))}
        </div>

        <div className="mt-5 border-t border-white/10 pt-4">
          <div className="mb-2 flex items-center justify-between text-[10px] uppercase tracking-[0.2em] text-white/45">
            <span>Throughput trend</span>
            <span>12m window</span>
          </div>
          <div className="flex items-end gap-1.5">
            {throughputSnapshots.map((value, index) => (
              <div
                key={`${value}-${index}`}
                className="h-10 flex-1 rounded-sm bg-gradient-to-t from-white/12 to-white/55"
                style={{ height: `${Math.max(18, value * 0.45)}px`, opacity: 0.4 + (index / throughputSnapshots.length) * 0.55 }}
              />
            ))}
          </div>
        </div>
      </div>

      <div className={`pointer-events-none absolute inset-0 rounded-3xl ring-1 transition-opacity duration-300 ${active ? "opacity-100 ring-white/35" : "opacity-0 ring-transparent"}`} />
    </aside>
  );
}
