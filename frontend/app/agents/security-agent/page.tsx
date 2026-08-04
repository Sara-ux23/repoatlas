'use client';

import React, { useState, useRef } from 'react';
import { motion, useInView } from 'framer-motion';
import { Brain } from 'lucide-react';
import { Navbar } from '../../../components/Navbar';
import { Footer } from '../../../components/Footer';

/* ─────────────────────────────────────────────
   Chart segment data
───────────────────────────────────────────── */
const SEGMENTS = [
  { label: 'Secure',                  pct: 52, color: '#22C55E' },
  { label: 'Vulnerable Dependencies', pct: 18, color: '#EF4444' },
  { label: 'Auth / Permission Risks', pct: 13, color: '#F97316' },
  { label: 'Insecure Patterns',       pct: 10, color: '#EAB308' },
  { label: 'Exposed Secrets',         pct:  7, color: '#8B5CF6' },
];

/* ─────────────────────────────────────────────
   Threat list data
───────────────────────────────────────────── */
const THREATS = [
  { title: 'Hardcoded JWT Secret',               severity: 'Critical', file: 'src/lib/auth/jwt.ts:14',              desc: 'SECRET_KEY assigned from plain string literal — must move to env var.',                              segIdx: 4 },
  { title: 'Prototype Pollution via lodash',      severity: 'Critical', file: 'package.json',                        desc: 'Lodash 4.17.15 contains CVE-2019-10744; upgrade to ≥ 4.17.21.',                                    segIdx: 1 },
  { title: 'Missing RBAC on /admin routes',       severity: 'High',     file: 'src/controllers/admin_controller.ts', desc: 'Admin endpoints lack role-guard middleware — any authenticated user can call.',                    segIdx: 2 },
  { title: 'SQL Injection (raw template literal)', severity: 'High',    file: 'src/repositories/UserRepository.ts:87', desc: 'User input interpolated directly into query string without parameterisation.',                  segIdx: 3 },
  { title: 'Outdated axios with SSRF vector',     severity: 'Medium',   file: 'package.json',                        desc: 'CVE-2023-45857 — upgrade axios to ≥ 1.6.0 to patch header exposure.',                            segIdx: 1 },
  { title: 'eval() in Templating Layer',          severity: 'Medium',   file: 'src/lib/template_renderer.ts:33',     desc: 'Dynamic code evaluation from user-supplied template opens XSS window.',                           segIdx: 3 },
  { title: 'Session Cookie Missing SameSite',     severity: 'Low',      file: 'src/auth/session_store.ts:52',        desc: 'Cookie config omits SameSite=Strict; susceptible to CSRF on older clients.',                      segIdx: 2 },
];

const SEVERITY_STYLES: Record<string, string> = {
  Critical: 'bg-red-50    text-red-600    border border-red-200',
  High:     'bg-orange-50 text-orange-600 border border-orange-200',
  Medium:   'bg-yellow-50 text-yellow-600 border border-yellow-200',
  Low:      'bg-green-50  text-green-600  border border-green-200',
};

/* ─────────────────────────────────────────────
   SVG donut helpers
───────────────────────────────────────────── */
const CX = 70; const CY = 70; const R = 54; const RI = 34; const GAP_DEG = 2;

function polarXY(angleDeg: number, r: number) {
  const rad = ((angleDeg - 90) * Math.PI) / 180;
  return { x: CX + r * Math.cos(rad), y: CY + r * Math.sin(rad) };
}

function arcPath(startDeg: number, spanDeg: number) {
  if (spanDeg >= 360) spanDeg = 359.99;
  const end = startDeg + spanDeg;
  const so = polarXY(startDeg, R);  const eo = polarXY(end, R);
  const si = polarXY(startDeg, RI); const ei = polarXY(end, RI);
  const large = spanDeg > 180 ? 1 : 0;
  return `M${so.x} ${so.y} A${R} ${R} 0 ${large} 1 ${eo.x} ${eo.y} L${ei.x} ${ei.y} A${RI} ${RI} 0 ${large} 0 ${si.x} ${si.y}Z`;
}

function buildArcs() {
  let cursor = 0;
  return SEGMENTS.map((s) => {
    const span = (s.pct / 100) * 360 - GAP_DEG;
    const start = cursor;
    cursor += (s.pct / 100) * 360;
    return { ...s, start, span };
  });
}

/* ─────────────────────────────────────────────
   Donut chart component (Stable non-shaking paths)
───────────────────────────────────────────── */
function DonutChart({ activeIdx, onHover }: { activeIdx: number | null; onHover: (i: number | null) => void }) {
  const ref = useRef<SVGSVGElement>(null);
  const inView = useInView(ref, { once: true, margin: '-40px' });
  const arcs = buildArcs();
  const center = activeIdx !== null ? SEGMENTS[activeIdx] : SEGMENTS[0];

  return (
    <div className="flex flex-col items-center gap-4">
      <svg ref={ref} width="140" height="140" viewBox="0 0 140 140" className="select-none">
        {arcs.map((arc, i) => {
          const isSelected = activeIdx === i;
          const isDimmed = activeIdx !== null && activeIdx !== i;

          return (
            <path
              key={arc.label}
              d={arcPath(arc.start, arc.span)}
              fill={arc.color}
              className="transition-all duration-200 ease-out cursor-pointer"
              style={{
                opacity: isDimmed ? 0.25 : 1,
                transform: isSelected ? 'scale(1.04)' : 'scale(1)',
                transformOrigin: `${CX}px ${CY}px`,
              }}
              onMouseEnter={() => onHover(i)}
              onMouseLeave={() => onHover(null)}
              onClick={() => onHover(activeIdx === i ? null : i)}
            />
          );
        })}
        <text x={CX} y={CY - 5} textAnchor="middle" style={{ fontSize: 15, fill: '#111114', fontWeight: 700, fontFamily: 'sans-serif' }}>
          {center.pct}%
        </text>
        <text x={CX} y={CY + 11} textAnchor="middle" style={{ fontSize: 8, fill: '#9CA3AF', fontFamily: 'monospace' }}>
          {center.label.split(' ')[0]}
        </text>
      </svg>

      {/* Legend */}
      <div className="flex flex-wrap justify-center gap-x-4 gap-y-1.5">
        {SEGMENTS.map((s, i) => (
          <button
            key={s.label}
            className="flex items-center gap-1.5 cursor-pointer transition-opacity duration-150 hover:opacity-80"
            onMouseEnter={() => onHover(i)}
            onMouseLeave={() => onHover(null)}
            onClick={() => onHover(activeIdx === i ? null : i)}
          >
            <span className="w-2 h-2 rounded-full shrink-0" style={{ backgroundColor: s.color }} />
            <span className="text-[10px] font-mono text-[#6B7280]">{s.label}</span>
            <span className="text-[10px] font-mono text-[#111114] font-semibold">{s.pct}%</span>
          </button>
        ))}
      </div>
    </div>
  );
}

/* ─────────────────────────────────────────────
   Threat list component (Fixed height, no layout jitter)
───────────────────────────────────────────── */
function ThreatList({ activeIdx }: { activeIdx: number | null }) {
  const filtered = activeIdx !== null ? THREATS.filter((t) => t.segIdx === activeIdx) : THREATS;
  return (
    <div className="h-[220px] overflow-y-auto pr-1">
      <div className="space-y-2">
        {filtered.length === 0 && (
          <p className="text-center text-xs font-mono text-[#9CA3AF] py-12">No threats in this category.</p>
        )}
        {filtered.map((t) => (
          <div
            key={t.title}
            className="flex gap-3 p-3 rounded-lg bg-[#FAFAFA] border border-[#E5E5E7] transition-all duration-150"
          >
            <div className="shrink-0 mt-1.5 w-2 h-2 rounded-full" style={{ backgroundColor: SEGMENTS[t.segIdx].color }} />
            <div className="min-w-0 flex-1 space-y-0.5">
              <div className="flex items-center gap-2 flex-wrap">
                <span className="text-xs font-semibold text-[#111114] font-sans">{t.title}</span>
                <span className={`text-[9px] font-mono font-bold px-1.5 py-0.5 rounded ${SEVERITY_STYLES[t.severity]}`}>
                  {t.severity}
                </span>
              </div>
              <p className="text-[10px] font-mono text-[#6B7280] truncate" title={t.file}>{t.file}</p>
              <p className="text-[11px] text-[#374151] leading-snug font-sans">{t.desc}</p>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}

/* ─────────────────────────────────────────────
   Radar Background (Hardware-Accelerated 60fps)
───────────────────────────────────────────── */
function RadarBackground() {
  return (
    <div className="absolute inset-0 overflow-hidden pointer-events-none z-0 min-h-full w-full transform-gpu">
      {/* 1. Concentric Radar Target Rings & Crosshair Axis Lines */}
      <div className="absolute top-[45%] left-1/2 -translate-x-1/2 -translate-y-1/2 w-[950px] h-[950px] rounded-full border border-[#E2E8F0] flex items-center justify-center pointer-events-none">
        {/* Soft Crosshair Axis Lines */}
        <div className="absolute inset-0 flex items-center justify-center">
          <div className="w-full h-[1px] bg-gradient-to-r from-transparent via-[#2563EB]/15 to-transparent" />
          <div className="h-full w-[1px] bg-gradient-to-b from-transparent via-[#2563EB]/15 to-transparent" />
        </div>

        <div className="w-[740px] h-[740px] rounded-full border border-[#E2E8F0]/70 flex items-center justify-center">
          <div className="w-[520px] h-[520px] rounded-full border border-[#E2E8F0]/50 flex items-center justify-center">
            <div className="w-[320px] h-[320px] rounded-full border border-[#E2E8F0]/30" />
          </div>
        </div>
      </div>

      {/* 2. Sonar Ping Pulse (GPU Accelerated CSS Animation) */}
      <div className="absolute top-[45%] left-1/2 -translate-x-1/2 -translate-y-1/2 w-[360px] h-[360px] rounded-full border border-[#2563EB]/25 bg-[#2563EB]/5 animate-ping opacity-25 pointer-events-none" />

      {/* 3. Radar 360° Continuous Radial Sweep (Pure GPU CSS Keyframe Rotation) */}
      <div
        className="absolute top-[45%] left-1/2 -translate-x-1/2 -translate-y-1/2 w-[950px] h-[950px] rounded-full animate-spin pointer-events-none transform-gpu will-change-transform"
        style={{
          animationDuration: '14s',
          background: 'conic-gradient(from 0deg, transparent 0deg, transparent 260deg, rgba(37, 99, 235, 0.06) 320deg, rgba(37, 99, 235, 0.18) 360deg)',
        }}
      />

      {/* 4. Ambient Detection Node Markers (Hardware Accelerated CSS) */}
      {[
        { top: '22%', left: '3%', color: '#EF4444', label: 'CRITICAL' },
        { top: '38%', right: '3%', color: '#F97316', label: 'HIGH' },
        { top: '64%', left: '3%', color: '#EAB308', label: 'MEDIUM' },
        { top: '76%', right: '4%', color: '#22C55E', label: 'SECURE' },
        { top: '18%', right: '10%', color: '#8B5CF6', label: 'SECRET' },
      ].map((node, i) => (
        <div
          key={i}
          className="absolute flex items-center gap-1.5 pointer-events-none"
          style={{ top: node.top, left: node.left, right: node.right }}
        >
          <div
            className="w-2.5 h-2.5 rounded-full relative animate-pulse"
            style={{
              backgroundColor: node.color,
              boxShadow: `0 0 8px ${node.color}`,
            }}
          >
            <div
              className="absolute inset-0 rounded-full animate-ping opacity-75"
              style={{ border: `1.5px solid ${node.color}` }}
            />
          </div>
          <span className="text-[9px] font-mono font-bold tracking-wider text-[#64748B] bg-white/95 px-1.5 py-0.5 rounded border border-[#E2E8F0]">
            {node.label}
          </span>
        </div>
      ))}
    </div>
  );
}

/* ─────────────────────────────────────────────
   Main page
───────────────────────────────────────────── */
export default function SecurityAgentPage() {
  const [activeIdx, setActiveIdx] = useState<number | null>(null);

  return (
    <main className="min-h-screen bg-[#FAFAFA] text-[#111114] selection:bg-[#2563EB]/20 selection:text-[#2563EB] overflow-x-hidden flex flex-col relative">
      <Navbar />

      {/* Full-width Ambient Radar Background */}
      <RadarBackground />

      <div className="flex-1 flex items-center justify-center pt-32 pb-24 px-4 sm:px-6 lg:px-8 max-w-3xl mx-auto w-full relative z-10">
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.4 }}
          className="p-8 rounded-2xl bg-white border border-[#E5E5E7] shadow-lg space-y-6 relative overflow-hidden w-full"
        >
          {/* Watermark */}
          <div className="absolute top-0 right-0 p-8 opacity-5 pointer-events-none">
            <Brain className="w-48 h-48 text-[#2563EB]" />
          </div>

          {/* ── Card Header (untouched) ── */}
          <div className="flex items-center gap-3">
            <div className="p-3 rounded-xl bg-[#2563EB] text-white shadow-lg">
              <Brain className="w-6 h-6" />
            </div>
            <div>
              <span className="text-xs font-mono text-[#2563EB] uppercase tracking-wider">
                Pipeline Stage 05
              </span>
              <h3 className="text-2xl font-bold text-[#111114]">Security Agent</h3>
              <span className="text-xs font-mono text-[#9CA3AF] block font-semibold mt-0.5">Code Explainer</span>
            </div>
          </div>

          {/* ── Security Posture (replaces old Execution Trace box) ── */}
          <div className="space-y-4">
            <div className="flex items-center justify-between">
              <span className="text-xs font-mono font-bold text-[#2563EB]">Security Posture</span>
              <span className="text-[10px] font-mono text-[#9CA3AF]">hover segment to filter</span>
            </div>

            <DonutChart activeIdx={activeIdx} onHover={setActiveIdx} />

            <div className="border-t border-[#E5E5E7]" />

            <div className="flex items-center justify-between">
              <span className="text-xs font-mono font-bold text-[#2563EB]">
                {activeIdx !== null ? `${SEGMENTS[activeIdx].label} — Threats` : 'All Threats'}
              </span>
              <span className="text-[10px] font-mono text-[#9CA3AF]">
                {(activeIdx !== null ? THREATS.filter(t => t.segIdx === activeIdx) : THREATS).length} finding(s)
              </span>
            </div>

            <ThreatList activeIdx={activeIdx} />
          </div>

          {/* ── Footer (untouched) ── */}
          <div className="flex items-center justify-between pt-4 border-t border-[#E5E5E7] text-xs font-mono text-[#9CA3AF]">
            <span>Status: <span className="text-green-600">Active Stream</span></span>
            <span>Latency: <span className="text-[#2563EB]">&lt; 14ms</span></span>
          </div>
        </motion.div>
      </div>

      <Footer />
    </main>
  );
}

