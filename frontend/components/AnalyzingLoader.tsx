/**
 * AnalyzingLoader
 *
 * Shows below the Hero search card while analysis is running.
 * Character: person lying prone, elbows on ground, typing on laptop,
 *            legs bent up and swinging — inline SVG + CSS keyframes.
 * Bar: green fill growing left→right, "LOADING N%" centered inside.
 * prefers-reduced-motion: legs freeze, bar still animates.
 * aria-live="polite" on percentage.
 */

import React, { useEffect, useRef, useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';

interface AnalyzingLoaderProps {
  visible: boolean;
  done: boolean;
}

/* ── Simulated progress ──────────────────────────────────────────── */
function useSimulatedProgress(visible: boolean, done: boolean) {
  const [pct, setPct] = useState(0);
  const rafRef   = useRef<number | null>(null);
  const startRef = useRef<number | null>(null);

  useEffect(() => {
    if (!visible) { setPct(0); startRef.current = null; return; }
    if (done)     { setPct(100); return; }

    const DURATION = 28_000;
    const CAP = 95;

    const tick = (now: number) => {
      if (!startRef.current) startRef.current = now;
      const t = Math.min((now - startRef.current) / DURATION, 1);
      const eased = 1 - Math.pow(1 - t, 3);
      const next = Math.min(Math.round(eased * CAP), CAP);
      setPct(next);
      if (next < CAP) rafRef.current = requestAnimationFrame(tick);
    };
    rafRef.current = requestAnimationFrame(tick);
    return () => { if (rafRef.current) cancelAnimationFrame(rafRef.current); };
  }, [visible, done]);

  return pct;
}

/* ── Character video ─────────────────────────────────────────────── */
function Character() {
  return (
    <video
      src="/animations/Screen%20Recording%202026-08-10%20010759.mp4"
      autoPlay
      loop
      muted
      playsInline
      aria-hidden="true"
      style={{ width: '420px', maxWidth: '100%', height: 'auto', display: 'block' }}
    />
  );
}

/* ── Main ────────────────────────────────────────────────────────── */
export const AnalyzingLoader: React.FC<AnalyzingLoaderProps> = ({ visible, done }) => {
  const pct = useSimulatedProgress(visible, done);

  return (
    <div className="max-w-4xl mx-auto mt-6">
      {/* Character video animation — shown under repo section */}
      <div className="flex justify-center mb-2">
        <Character />
      </div>

      {/* Progress bar — shown while analyzing */}
      <AnimatePresence>
        {visible && (
          <motion.div
            key="analyzing-loader"
            initial={{ opacity: 0, y: 14 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: 8 }}
            transition={{ duration: 0.35, ease: [0.16, 1, 0.3, 1] }}
            role="progressbar"
            aria-valuenow={pct}
            aria-valuemin={0}
            aria-valuemax={100}
            aria-label="Analysis progress"
            className="relative w-full h-14 rounded-2xl border border-[#C8E6C9] bg-white overflow-hidden shadow-sm"
          >
            {/* Green fill */}
            <motion.div
              className="absolute inset-y-0 left-0 rounded-2xl"
              style={{ backgroundColor: '#1B6B3A' }}
              animate={{ width: `${pct}%` }}
              transition={{ duration: 0.5, ease: 'easeOut' }}
            />

            {/* Label */}
            <div
              className="absolute inset-0 flex items-center justify-center"
              aria-live="polite"
              aria-atomic="true"
            >
              <span
                className="font-black text-xl select-none"
                style={{
                  letterSpacing: '0.1em',
                  mixBlendMode: 'difference',
                  color: 'white',
                }}
              >
                LOADING {pct}%
              </span>
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
};
