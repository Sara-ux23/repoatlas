'use client';

import React, { useEffect, useState } from 'react';
import { motion } from 'framer-motion';
import { Search, Sparkles, Activity, Code2, Database, ShieldCheck } from 'lucide-react';
import { Navbar } from '../../../components/Navbar';
import { Footer } from '../../../components/Footer';
import type { CommitEntry, ContributorEntry, TraceResult } from '../../../lib/api';

/* ─────────────────────────────────────────────
   Animated commit timeline
───────────────────────────────────────────── */
function CommitTimeline({ commits }: { commits: { hash: string; message: string; author: string; time: string }[] }) {
  return (
    <div className="overflow-y-auto" style={{ maxHeight: '260px' }}>
      <div className="relative">
        <div className="absolute left-[7px] top-2 bottom-2 w-px bg-[#E5E5E7]" aria-hidden="true" />
        <ul className="space-y-0">
          {commits.map((commit, i) => (
            <motion.li
              key={commit.hash + i}
              initial={{ opacity: 0, x: -10 }}
              animate={{ opacity: 1, x: 0 }}
              transition={{ duration: 0.3, delay: i * 0.1, ease: [0.16, 1, 0.3, 1] }}
              className="relative flex gap-4 pb-5 last:pb-0"
            >
              <div className="relative z-10 mt-1 shrink-0 w-3.5 h-3.5 rounded-full bg-white border-2 border-[#2563EB]" />
              <div className="min-w-0 flex-1">
                <div className="flex items-baseline gap-2 flex-wrap">
                  <span className="font-mono text-[10px] text-[#2563EB] bg-[#2563EB]/8 px-1.5 py-0.5 rounded select-all">
                    {commit.hash}
                  </span>
                  <span className="font-mono text-[10px] text-[#9CA3AF]">{commit.time}</span>
                </div>
                <p className="mt-0.5 text-xs text-[#111114] font-medium leading-snug truncate" title={commit.message}>
                  {commit.message}
                </p>
                <span className="text-[10px] font-mono text-[#6B7280]">{commit.author}</span>
              </div>
            </motion.li>
          ))}
        </ul>
      </div>
    </div>
  );
}

/* ─────────────────────────────────────────────
   Robot Mascot Walker (unchanged)
───────────────────────────────────────────── */
function ExistingRobotMascotWalker() {
  return (
    <motion.div
      className="absolute flex flex-col items-center z-0 pointer-events-none filter drop-shadow-[0_8px_20px_rgba(37,99,235,0.25)]"
      style={{ top: '85px' }}
      animate={{
        x: ['0vw', '12vw', '28vw', '50vw', '76vw', '90vw', '76vw', '50vw', '28vw', '12vw', '0vw'],
        y: [35, 5, -5, 50, -5, 25, -5, 50, -5, 5, 35],
        rotate: [-6, -12, -4, 6, -8, 5, -8, 6, -4, -12, -6],
      }}
      transition={{ duration: 22, repeat: Infinity, ease: 'easeInOut' }}
    >
      <div className="w-16 h-20 relative flex items-center justify-center -mb-2">
        <img
          src="/mascot-robot.png"
          alt="RepoAtlas Robot Mascot"
          className="w-full h-full object-contain filter drop-shadow-[0_4px_12px_rgba(37,99,235,0.3)]"
        />
      </div>
      <motion.div
        className="w-12 h-14 bg-gradient-to-b from-[#2563EB]/40 via-[#2563EB]/15 to-transparent"
        style={{ clipPath: 'polygon(35% 0%, 65% 0%, 100% 100%, 0% 100%)' }}
        animate={{ opacity: [0.35, 0.75, 0.35], scaleX: [0.85, 1.2, 0.85] }}
        transition={{ duration: 1.5, repeat: Infinity, ease: 'easeInOut' }}
      />
    </motion.div>
  );
}

/* ─────────────────────────────────────────────
   Trace Background (unchanged)
───────────────────────────────────────────── */
function TraceBackground() {
  return (
    <div className="absolute inset-0 overflow-hidden pointer-events-none z-0 min-h-full w-full">
      <svg className="absolute inset-0 w-full h-full stroke-[#2563EB]/35" fill="none">
        <path d="M 0 150 Q 350 70 700 170 T 1400 110 T 2000 180" strokeWidth="3" strokeDasharray="8 8" />
        <path d="M 0 670 Q 450 790 900 650 T 1600 730 T 2200 630" strokeWidth="3" strokeDasharray="8 8" />
      </svg>
      <motion.div
        className="absolute w-48 h-1.5 bg-gradient-to-r from-transparent via-[#2563EB] to-transparent filter drop-shadow-[0_0_12px_#2563EB]"
        style={{ top: '150px' }}
        animate={{ x: ['-20vw', '110vw'] }}
        transition={{ duration: 6, repeat: Infinity, ease: 'linear' }}
      />
      <motion.div
        className="absolute w-48 h-1.5 bg-gradient-to-r from-transparent via-[#3B82F6] to-transparent filter drop-shadow-[0_0_12px_#3B82F6]"
        style={{ top: '670px' }}
        animate={{ x: ['110vw', '-20vw'] }}
        transition={{ duration: 7.5, repeat: Infinity, ease: 'linear' }}
      />
      {[
        { label: 'API GATEWAY', sub: 'POST /v1/auth', top: '18%', left: '4%', icon: Code2, color: '#2563EB' },
        { label: 'JWT VERIFIER', sub: 'Token Verified', top: '44%', left: '3%', icon: ShieldCheck, color: '#059669' },
        { label: 'SERVICE CORE', sub: 'DI Container', top: '75%', left: '5%', icon: Activity, color: '#D97706' },
        { label: 'DB REPOSITORY', sub: 'Pool Active', top: '22%', right: '4%', icon: Database, color: '#7C3AED' },
        { label: 'TRACE INDEXER', sub: 'Frames Indexed', top: '62%', right: '5%', icon: Sparkles, color: '#2563EB' },
      ].map((station, i) => (
        <motion.div
          key={i}
          className="absolute flex items-center gap-2.5 px-3.5 py-2 rounded-xl bg-white/95 backdrop-blur-md border border-[#E2E8F0] shadow-lg"
          style={{ top: station.top, left: station.left, right: station.right }}
          animate={{ y: [0, -6, 0] }}
          transition={{ duration: 3.8, repeat: Infinity, delay: i * 0.7, ease: 'easeInOut' }}
        >
          <div className="p-1.5 rounded-lg shadow-sm" style={{ backgroundColor: `${station.color}18`, color: station.color }}>
            <station.icon className="w-4 h-4" />
          </div>
          <div>
            <div className="text-[10px] font-mono font-bold tracking-wider" style={{ color: station.color }}>{station.label}</div>
            <div className="text-[9px] font-mono text-[#64748B]">{station.sub}</div>
          </div>
        </motion.div>
      ))}
      <ExistingRobotMascotWalker />
    </div>
  );
}

/* ─────────────────────────────────────────────
   Main page
───────────────────────────────────────────── */
export default function TraceAgentPage() {
  const [commits, setCommits] = useState<{ hash: string; message: string; author: string; time: string }[]>([]);
  const [summary, setSummary] = useState('');
  const [contributors, setContributors] = useState<ContributorEntry[]>([]);

  useEffect(() => {
    try {
      const raw = sessionStorage.getItem('repoatlas_result');
      if (!raw) return;
      const result = JSON.parse(raw);
      const trace: TraceResult | null = result.trace ?? null;
      if (!trace) return;

      setSummary(trace.summary ?? '');
      setContributors(trace.contributors ?? []);

      // Map CommitEntry → display format
      const mapped = (trace.commits ?? []).slice(0, 20).map((c: CommitEntry) => ({
        hash: c.short_hash ?? c.hash?.slice(0, 7) ?? '?',
        message: c.message ?? '',
        author: c.author ?? '',
        time: c.date ? new Date(c.date).toLocaleDateString('en-GB', { day: '2-digit', month: 'short', year: '2-digit' }) : '',
      }));
      setCommits(mapped);
    } catch { /* no session */ }
  }, []);

  return (
    <main className="min-h-screen bg-[#FAFAFA] text-[#111114] selection:bg-[#2563EB]/20 selection:text-[#2563EB] overflow-x-hidden flex flex-col relative">
      <Navbar />
      <TraceBackground />

      <div className="flex-1 flex items-center justify-center pt-32 pb-24 px-4 sm:px-6 lg:px-8 max-w-3xl mx-auto w-full relative z-10">
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.4 }}
          className="p-8 rounded-2xl bg-white border border-[#E5E5E7] shadow-lg space-y-6 relative overflow-hidden w-full"
        >
          <div className="absolute top-0 right-0 p-8 opacity-5 pointer-events-none">
            <Search className="w-48 h-48 text-[#2563EB]" />
          </div>

          <div className="flex items-center gap-3">
            <div className="p-3 rounded-xl bg-[#2563EB] text-white shadow-lg">
              <Search className="w-6 h-6" />
            </div>
            <div>
              <span className="text-xs font-mono text-[#2563EB] uppercase tracking-wider">Pipeline Stage 04</span>
              <h3 className="text-2xl font-bold text-[#111114]">Trace Agent</h3>
            </div>
          </div>

          <div className="space-y-3 font-sans">
            {/* AI summary */}
            {summary && (
              <div className="p-4 rounded-xl bg-[#F0F6FF] border border-[#2563EB]/20 text-sm text-[#374151] leading-relaxed">
                {summary}
              </div>
            )}

            {/* Commit Timeline */}
            <div className="p-4 rounded-xl bg-[#FAFAFA] border border-[#E5E5E7]">
              <div className="flex items-center justify-between mb-3">
                <span className="text-[#2563EB] font-bold font-mono text-xs">Commit History</span>
                <span className="text-[10px] font-mono text-[#9CA3AF]">most recent first</span>
              </div>
              {commits.length > 0 ? (
                <CommitTimeline commits={commits} />
              ) : (
                <p className="text-xs font-mono text-[#9CA3AF] py-4 text-center">
                  No commit data — analyze a repo from the home page first.
                </p>
              )}
            </div>

            {/* Contributors */}
            {contributors.length > 0 && (
              <div className="flex flex-wrap gap-2">
                {contributors.slice(0, 8).map((c, i) => (
                  <span key={i} className="px-2.5 py-1 rounded-full bg-[#FAFAFA] border border-[#E5E5E7] text-[10px] font-mono text-[#6B7280]">
                    {c.author} · {c.count} commits
                  </span>
                ))}
              </div>
            )}
          </div>

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
