"use client";

import { useEffect, useRef, useState } from "react";

const rows = [
  { label: "Median Confirm", trend: "+7.2%", value: "402ms" },
  { label: "Success Rate", trend: "stable", value: "99.14%" },
  { label: "Slot Lag", trend: "recovering", value: "1.8 slots" },
];

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

      <div className="relative">
        <p className="text-[11px] uppercase tracking-[0.3em] text-white/50">Now streaming</p>
        <p className="mt-3 text-3xl font-semibold tracking-[-0.03em]">21,483 tx/hr</p>
        <p className="mt-1 text-sm text-white/60">observed sample traffic</p>

        <div className="mt-6 space-y-2.5">
          {rows.map((row) => (
            <div key={row.label} className="rounded-xl border border-white/10 bg-black/40 p-3">
              <div className="flex items-center justify-between text-xs text-white/50">
                <span>{row.label}</span>
                <span>{row.trend}</span>
              </div>
              <p className="mt-1 text-lg font-medium">{row.value}</p>
            </div>
          ))}
        </div>
      </div>

      <div className={`pointer-events-none absolute inset-0 rounded-3xl ring-1 transition-opacity duration-300 ${active ? "opacity-100 ring-white/35" : "opacity-0 ring-transparent"}`} />
    </aside>
  );
}
