'use client';

import React, { useEffect, useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import {
  GitCommit, GitBranch, Users, Calendar, Clock,
  Search, Activity, Code2, Database, ShieldCheck, Sparkles,
  ChevronDown, ChevronUp,
} from 'lucide-react';
import { Navbar } from '../../../components/Navbar';

import type { CommitEntry, ContributorEntry, TraceResult, CompareResponse } from '../../../lib/api';
import { compareRepos } from '../../../lib/api';
import { useRepo } from '../../../lib/repoContext';

/* ── Types ──────────────────────────────────────────────────── */
interface DisplayCommit {
  hash: string;
  fullHash: string;
  message: string;
  author: string;
  time: string;
  date: Date | null;
}

/* ── Helpers ─────────────────────────────────────────────────── */
function avatar(name: string) {
  return name.split(' ').map((w) => w[0]).join('').toUpperCase().slice(0, 2);
}

function avatarColor(name: string) {
  const colors = [
    'bg-blue-500', 'bg-purple-500', 'bg-emerald-500',
    'bg-orange-500', 'bg-rose-500', 'bg-indigo-500',
  ];
  let h = 0;
  for (const c of name) h = (h * 31 + c.charCodeAt(0)) & 0xffff;
  return colors[h % colors.length];
}

function relativeTime(d: Date | null) {
  if (!d) return '';
  const diff = Date.now() - d.getTime();
  const days = Math.floor(diff / 86400000);
  if (days === 0) return 'today';
  if (days === 1) return 'yesterday';
  if (days < 30) return `${days}d ago`;
  const months = Math.floor(days / 30);
  if (months < 12) return `${months}mo ago`;
  return `${Math.floor(months / 12)}y ago`;
}

/* ── Stat Card ───────────────────────────────────────────────── */
function StatCard({ icon: Icon, label, value, color }: {
  icon: React.ElementType; label: string; value: string | number; color: string;
}) {
  return (
    <motion.div
      initial={{ opacity: 0, y: 12 }}
      animate={{ opacity: 1, y: 0 }}
      className="flex items-center gap-3 p-4 rounded-2xl bg-white border border-[#E5E5E7] shadow-sm"
    >
      <div className={`w-10 h-10 rounded-xl flex items-center justify-center shrink-0 ${color}`}>
        <Icon className="w-5 h-5 text-white" />
      </div>
      <div className="min-w-0">
        <p className="text-xs text-[#9CA3AF] font-mono truncate">{label}</p>
        <p className="text-xl font-bold text-[#111114] leading-tight">{value}</p>
      </div>
    </motion.div>
  );
}

/* ── Commit Node — the vertical timeline entry ───────────────── */
function CommitNode({
  commit, index, isLast, expanded, onToggle,
}: {
  commit: DisplayCommit;
  index: number;
  isLast: boolean;
  expanded: boolean;
  onToggle: () => void;
}) {
  return (
    <motion.div
      initial={{ opacity: 0, x: -16 }}
      animate={{ opacity: 1, x: 0 }}
      transition={{ duration: 0.3, delay: Math.min(index * 0.04, 0.5) }}
      className="relative flex gap-4"
    >
      {/* Vertical rail */}
      {!isLast && (
        <div className="absolute left-[17px] top-8 bottom-0 w-0.5 bg-gradient-to-b from-[#BFDBFE] to-[#E5E5E7]" />
      )}

      {/* Node dot */}
      <div className="shrink-0 relative z-10 mt-1">
        <div className="w-9 h-9 rounded-full bg-white border-2 border-[#2563EB] flex items-center justify-center shadow-sm">
          <GitCommit className="w-4 h-4 text-[#2563EB]" />
        </div>
      </div>

      {/* Card */}
      <div className="flex-1 min-w-0 pb-5">
        <div
          onClick={onToggle}
          className="group cursor-pointer rounded-xl border border-[#E5E5E7] bg-white hover:border-[#2563EB]/40 hover:shadow-md transition-all p-4"
        >
          {/* Top row */}
          <div className="flex items-start justify-between gap-3">
            <div className="flex-1 min-w-0">
              <p className="text-sm font-semibold text-[#111114] leading-snug line-clamp-2 group-hover:text-[#2563EB] transition-colors">
                {commit.message}
              </p>
            </div>
            <div className="shrink-0 flex items-center gap-2">
              <span className="font-mono text-[10px] bg-[#EFF6FF] text-[#2563EB] border border-[#BFDBFE] px-2 py-0.5 rounded-full select-all">
                {commit.hash}
              </span>
              {expanded
                ? <ChevronUp className="w-3.5 h-3.5 text-[#9CA3AF]" />
                : <ChevronDown className="w-3.5 h-3.5 text-[#9CA3AF]" />}
            </div>
          </div>

          {/* Meta row */}
          <div className="flex items-center gap-3 mt-2 flex-wrap">
            <div className="flex items-center gap-1.5">
              <div className={`w-5 h-5 rounded-full ${avatarColor(commit.author)} flex items-center justify-center text-white text-[9px] font-bold`}>
                {avatar(commit.author)}
              </div>
              <span className="text-xs text-[#6B7280] font-mono">{commit.author}</span>
            </div>
            <span className="text-[#D1D5DB]">·</span>
            <div className="flex items-center gap-1 text-xs text-[#9CA3AF] font-mono">
              <Clock className="w-3 h-3" />
              <span>{commit.time}</span>
            </div>
            {commit.date && (
              <span className="text-[10px] text-[#9CA3AF] font-mono">
                ({relativeTime(commit.date)})
              </span>
            )}
          </div>

          {/* Expanded detail */}
          <AnimatePresence>
            {expanded && (
              <motion.div
                initial={{ height: 0, opacity: 0 }}
                animate={{ height: 'auto', opacity: 1 }}
                exit={{ height: 0, opacity: 0 }}
                transition={{ duration: 0.2 }}
                className="overflow-hidden"
              >
                <div className="mt-3 pt-3 border-t border-[#E5E5E7] space-y-1">
                  <div className="flex items-center gap-2">
                    <span className="text-[10px] font-mono text-[#9CA3AF] w-16">Full hash</span>
                    <code className="text-[10px] font-mono text-[#374151] bg-[#F3F4F6] px-2 py-0.5 rounded select-all break-all">
                      {commit.fullHash}
                    </code>
                  </div>
                </div>
              </motion.div>
            )}
          </AnimatePresence>
        </div>
      </div>
    </motion.div>
  );
}

/* ── Contributor Bar Chart ────────────────────────────────────── */
function ContributorBars({ contributors }: { contributors: ContributorEntry[] }) {
  const max = Math.max(...contributors.map((c) => c.count), 1);
  return (
    <div className="space-y-3">
      {contributors.slice(0, 8).map((c, i) => (
        <motion.div
          key={i}
          initial={{ opacity: 0, x: -12 }}
          animate={{ opacity: 1, x: 0 }}
          transition={{ delay: i * 0.06 }}
          className="flex items-center gap-3"
        >
          <div className={`shrink-0 w-7 h-7 rounded-full ${avatarColor(c.author)} flex items-center justify-center text-white text-[9px] font-bold`}>
            {avatar(c.author)}
          </div>
          <div className="flex-1 min-w-0">
            <div className="flex items-center justify-between mb-1">
              <span className="text-xs font-mono text-[#374151] truncate">{c.author}</span>
              <span className="text-xs font-mono text-[#2563EB] ml-2 shrink-0">{c.count} commit{c.count !== 1 ? 's' : ''}</span>
            </div>
            <div className="h-2 rounded-full bg-[#EFF6FF] overflow-hidden">
              <motion.div
                initial={{ width: 0 }}
                animate={{ width: `${(c.count / max) * 100}%` }}
                transition={{ duration: 0.7, delay: i * 0.08, ease: 'easeOut' }}
                className="h-full rounded-full bg-gradient-to-r from-[#2563EB] to-[#60A5FA]"
              />
            </div>
          </div>
        </motion.div>
      ))}
    </div>
  );
}

/* ── Formatted Summary ────────────────────────────────────────── */
function cleanTextValue(val: string): string {
  if (!val) return '';
  let cleaned = val.trim();
  cleaned = cleaned.replace(/^[:\-\s]+/, '').trim();
  cleaned = cleaned.replace(/\{'count':\s*(\d+),\s*'author':\s*'([^'<]+?)(?:\s*<[^>]+>)?'\}/g, '$2 ($1 commit)');
  cleaned = cleaned.replace(/\{"count":\s*(\d+),\s*"author":\s*"([^"<]+?)(?:\s*<[^>]+>)?"\}/g, '$2 ($1 commit)');
  cleaned = cleaned.replace(/^[:\-\s]+/, '').trim();
  return cleaned || val;
}

function FormattedSummary({ summary }: { summary: string }) {
  if (!summary) return null;

  const lines = summary.split(/\n+/).map((l) => l.trim()).filter((l) => l.length > 0 && !l.includes('Git History Analysis'));

  const kvMap: Record<string, string> = {};
  const extraInsights: string[] = [];

  for (const line of lines) {
    const match = line.match(/^\*{2,3}(.*?)\*{2,3}:?\s*(.*)/s);
    if (match) {
      const key = match[1].replace(/\*/g, '').trim().toLowerCase();
      const val = cleanTextValue(match[2].replace(/\*/g, ''));
      if (val && val !== 'None') {
        kvMap[key] = val;
      }
    } else {
      const clean = cleanTextValue(line.replace(/\*/g, ''));
      if (clean && clean !== 'None' && !clean.startsWith(':')) {
        if (!extraInsights.includes(clean)) {
          extraInsights.push(clean);
        }
      }
    }
  }

  const latestCommit = kvMap['latest commit'] || kvMap['latest'] || '';
  const contributors = kvMap['contributors'] || kvMap['author'] || '';
  const branches = kvMap['branches'] || kvMap['current: main'] || kvMap['branch'] || 'main';

  return (
    <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
      {/* Latest Commit Card */}
      <div className="p-3.5 rounded-xl bg-white border border-[#BFDBFE] shadow-2xs space-y-1.5">
        <p className="text-[10px] font-mono font-bold text-[#2563EB] uppercase tracking-wider flex items-center gap-1.5">
          <GitCommit className="w-3.5 h-3.5" />
          Latest Commit
        </p>
        {latestCommit ? (
          <p className="text-xs font-sans text-[#1E293B] font-medium leading-relaxed">
            {latestCommit}
          </p>
        ) : (
          <p className="text-xs text-[#94A3B8] italic font-sans">Initial commit timeline</p>
        )}
      </div>

      {/* Contributors & Branches Card */}
      <div className="p-3.5 rounded-xl bg-white border border-[#BFDBFE] shadow-2xs space-y-1.5">
        <p className="text-[10px] font-mono font-bold text-[#2563EB] uppercase tracking-wider flex items-center gap-1.5">
          <Users className="w-3.5 h-3.5" />
          Contributors & Branch
        </p>
        <div className="text-xs font-sans text-[#1E293B] font-medium space-y-1">
          {contributors && <p><span className="text-[#64748B] font-mono text-[11px]">Author: </span>{contributors}</p>}
          <p><span className="text-[#64748B] font-mono text-[11px]">Branch: </span>{branches.replace(/All:.*$/, '').trim()}</p>
        </div>
      </div>

      {/* Git Insights Card */}
      <div className="p-3.5 rounded-xl bg-white border border-[#BFDBFE] shadow-2xs space-y-1.5">
        <p className="text-[10px] font-mono font-bold text-[#2563EB] uppercase tracking-wider flex items-center gap-1.5">
          <Sparkles className="w-3.5 h-3.5" />
          Timeline Overview
        </p>
        <p className="text-xs font-sans text-[#334155] leading-relaxed font-medium">
          {extraInsights.length > 0
            ? extraInsights.slice(0, 2).join(' ')
            : 'Git timeline analyzed with commit history, author activity, and active branch state.'}
        </p>
      </div>
    </div>
  );
}

/* ── Main page ───────────────────────────────────────────────── */
function isRepoMatch(resultPath: string | undefined, targetRepo: string | null): boolean {
  if (!resultPath || !targetRepo) return false;
  const p1 = resultPath.toLowerCase().replace(/^https?:\/\/github\.com\//, '').replace(/\.git$/, '').replace(/\/$/, '').trim();
  const p2 = targetRepo.toLowerCase().replace(/^https?:\/\/github\.com\//, '').replace(/\.git$/, '').replace(/\/$/, '').trim();
  return p1 === p2 || p1.includes(p2) || p2.includes(p1);
}

function isTraceValid(t: any): boolean {
  if (!t || typeof t !== 'object') return false;
  return Boolean((Array.isArray(t.commits) && t.commits.length > 0) || t.summary || (Array.isArray(t.contributors) && t.contributors.length > 0));
}

export default function TraceAgentPage() {
  const { repoPath, analysisResult, setAnalysisResult } = useRepo();
  const [commits, setCommits] = useState<DisplayCommit[]>([]);
  const [summary, setSummary] = useState('');
  const [contributors, setContributors] = useState<ContributorEntry[]>([]);
  const [branches, setBranches] = useState<{ current: string; all: string[] }>({ current: '', all: [] });
  const [expandedIdx, setExpandedIdx] = useState<number | null>(null);
  const [showAll, setShowAll] = useState(false);
  const [compareOpen, setCompareOpen] = useState(false);

  const activeRepo = repoPath || (() => {
    try { return sessionStorage.getItem('repoatlas_url') || localStorage.getItem('repoatlas_url'); }
    catch { return null; }
  })();

  useEffect(() => {
    async function loadData() {
      try {
        let result: any = null;

        if (activeRepo) {
          const historyRaw = localStorage.getItem('repoatlas_history');
          if (historyRaw) {
            const history = JSON.parse(historyRaw);
            if (Array.isArray(history) && history.length > 0) {
              const found = history.find((h: any) => isRepoMatch(h.repo_path || h.repo_url, activeRepo));
              if (found) result = found;
            }
          }
        }

        if (!result && analysisResult) {
          if (!activeRepo || isRepoMatch(analysisResult.repo_path || analysisResult.repo_url, activeRepo)) {
            result = analysisResult;
          }
        }

        if (!result) {
          const raw = localStorage.getItem('repoatlas_result') || sessionStorage.getItem('repoatlas_result');
          if (raw) {
            const parsed = JSON.parse(raw);
            if (!activeRepo || isRepoMatch(parsed.repo_path || parsed.repo_url, activeRepo)) {
              result = parsed;
            }
          }
        }

        let traceData: TraceResult | null = result ? ((result.trace || (result as any).trace_result) as TraceResult | null) : null;

        if (!isTraceValid(traceData) && activeRepo) {
          const { analyzeRepo, saveLocalAnalysis } = await import('../../../lib/api');
          const data = await analyzeRepo({ repo_path: activeRepo, query: 'full analysis' });
          if (data) {
            saveLocalAnalysis(activeRepo, data);
            traceData = (data.trace || data.trace_result) as TraceResult;
            setAnalysisResult(data);
          }
        }

        if (traceData) {
          setSummary(traceData.summary ?? '');
          setContributors(traceData.contributors ?? []);
          setBranches(traceData.branches ?? { current: '', all: [] });

          const mapped: DisplayCommit[] = (traceData.commits ?? []).slice(0, 50).map((c: CommitEntry) => {
            const d = c.date ? new Date(c.date) : null;
            return {
              hash: c.short_hash ?? c.hash?.slice(0, 7) ?? '?',
              fullHash: c.hash ?? '',
              message: c.message ?? '',
              author: c.author ?? '',
              time: d ? d.toLocaleDateString('en-GB', { day: '2-digit', month: 'short', year: 'numeric' }) : '',
              date: d,
            };
          });
          setCommits(mapped);
        }
      } catch (err) {
        console.error('Trace load error:', err);
      }
    }
    loadData();
  }, [analysisResult, activeRepo, setAnalysisResult]);

  const totalCommits = commits.length;
  const uniqueAuthors = [...new Set(commits.map((c) => c.author))].length;
  const visibleCommits = showAll ? commits : commits.slice(0, 8);

  return (
    <main className="min-h-screen bg-[#F8FAFC] text-[#111114] selection:bg-[#2563EB]/20 overflow-x-hidden flex flex-col relative">
      <Navbar />

      <div className="relative z-10 flex-1 w-full max-w-6xl mx-auto px-3 sm:px-4 sm:px-6 lg:px-8 pt-20 sm:pt-28 pb-20">

        {/* ── Page header ── */}
        <motion.div
          initial={{ opacity: 0, y: -10 }}
          animate={{ opacity: 1, y: 0 }}
          className="flex flex-wrap items-center gap-3 mb-4"
        >
          <div className="p-2.5 sm:p-3 rounded-2xl bg-[#2563EB] text-white shadow-lg shadow-[#2563EB]/20 shrink-0">
            <Search className="w-5 h-5 sm:w-6 sm:h-6" />
          </div>
          <div className="min-w-0">
            <h1 className="text-xl sm:text-2xl font-extrabold text-[#111114] leading-tight">Trace Agent</h1>
          </div>

          {/* Status badge */}
          <div className="ml-auto flex items-center gap-2 px-3 py-1.5 rounded-full border border-[#E5E5E7] bg-white shadow-sm">
            <span className="w-2 h-2 rounded-full bg-[#4ADE80] animate-pulse" />
            <span className="text-[10px] font-mono text-[#6B7280]">Active Stream</span>
          </div>
        </motion.div>

        {/* ── Stats row ── */}
        {totalCommits > 0 && (
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 mb-8">
            <StatCard icon={GitCommit} label="Total Commits" value={totalCommits} color="bg-[#2563EB]" />
            <StatCard icon={Users} label="Contributors" value={uniqueAuthors} color="bg-purple-500" />
            <StatCard icon={GitBranch} label="Branches" value={branches.all.length || 1} color="bg-emerald-500" />
            <StatCard icon={Calendar} label="Latest" value={commits[0]?.time || '—'} color="bg-orange-500" />
          </div>
        )}

        {/* ── AI Summary ── */}
        {summary && (
          <motion.div
            initial={{ opacity: 0, y: 8 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.1 }}
            className="mb-8 p-5 rounded-2xl bg-gradient-to-br from-[#EFF6FF] to-[#F0F9FF] border border-[#BFDBFE] shadow-sm space-y-3"
          >
            <div className="flex items-center gap-2">
              <Activity className="w-4 h-4 text-[#2563EB]" />
              <span className="text-xs font-bold font-mono text-[#2563EB] uppercase tracking-wider">Git History Analysis</span>
            </div>
            <FormattedSummary summary={summary} />
          </motion.div>
        )}

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">

          {/* ── Commit Timeline (2/3 width) ── */}
          <div className="lg:col-span-2">
            <div className="bg-white rounded-2xl border border-[#E5E5E7] shadow-sm overflow-hidden">
              {/* Header */}
              <div className="flex items-center justify-between px-5 py-4 border-b border-[#E5E5E7] bg-gradient-to-r from-[#F8FAFC] to-white">
                <div className="flex items-center gap-2.5">
                  <GitCommit className="w-4.5 h-4.5 text-[#2563EB]" />
                  <span className="text-sm font-bold text-[#111114]">Commit History</span>
                  {totalCommits > 0 && (
                    <span className="px-2 py-0.5 rounded-full bg-[#EFF6FF] text-[#2563EB] text-[10px] font-mono font-bold border border-[#BFDBFE]">
                      {totalCommits}
                    </span>
                  )}
                </div>
                <span className="text-[10px] font-mono text-[#9CA3AF]">newest → oldest</span>
              </div>

              {/* Branch pills */}
              {branches.all.length > 0 && (
                <div className="px-5 py-3 border-b border-[#E5E5E7] flex items-center gap-2 flex-wrap bg-[#FAFAFA]">
                  <GitBranch className="w-3.5 h-3.5 text-[#9CA3AF]" />
                  {branches.all.slice(0, 6).map((b, i) => (
                    <span key={i} className={`px-2.5 py-0.5 rounded-full text-[10px] font-mono border ${
                      b === branches.current
                        ? 'bg-[#2563EB] text-white border-[#2563EB]'
                        : 'bg-white text-[#6B7280] border-[#E5E5E7]'
                    }`}>
                      {b}
                    </span>
                  ))}
                </div>
              )}

              {/* Timeline */}
              <div className="p-5">
                {commits.length === 0 ? (
                  <div className="py-16 text-center">
                    <GitCommit className="w-12 h-12 mx-auto text-[#E5E5E7] mb-3" />
                    <p className="text-sm font-mono text-[#9CA3AF]">No commit data available.</p>
                    <p className="text-xs text-[#C0C4CC] mt-1">Analyze a repository first.</p>
                  </div>
                ) : (
                  <>
                    <div className="space-y-0">
                      {visibleCommits.map((commit, i) => (
                        <CommitNode
                          key={commit.fullHash || i}
                          commit={commit}
                          index={i}
                          isLast={i === visibleCommits.length - 1 && (showAll || commits.length <= 8)}
                          expanded={expandedIdx === i}
                          onToggle={() => setExpandedIdx(expandedIdx === i ? null : i)}
                        />
                      ))}
                    </div>

                    {commits.length > 8 && (
                      <button
                        onClick={() => setShowAll((s) => !s)}
                        className="mt-2 w-full flex items-center justify-center gap-2 py-2.5 rounded-xl border border-dashed border-[#BFDBFE] text-[#2563EB] text-xs font-semibold hover:bg-[#EFF6FF] transition-colors"
                      >
                        {showAll
                          ? <><ChevronUp className="w-3.5 h-3.5" /> Show less</>
                          : <><ChevronDown className="w-3.5 h-3.5" /> Show {commits.length - 8} more commits</>
                        }
                      </button>
                    )}
                  </>
                )}
              </div>
            </div>
          </div>

          {/* ── Right column ── */}
          <div className="space-y-5">

            {/* Contributors */}
            <div className="bg-white rounded-2xl border border-[#E5E5E7] shadow-sm overflow-hidden">
              <div className="flex items-center gap-2.5 px-5 py-4 border-b border-[#E5E5E7] bg-gradient-to-r from-[#F8FAFC] to-white">
                <Users className="w-4 h-4 text-[#7C3AED]" />
                <span className="text-sm font-bold text-[#111114]">Contributors</span>
              </div>
              <div className="p-5">
                {contributors.length === 0 ? (
                  <p className="text-xs font-mono text-[#9CA3AF] text-center py-4">No contributor data</p>
                ) : (
                  <ContributorBars contributors={contributors} />
                )}
              </div>
            </div>

            {/* Branch map */}
            {branches.all.length > 0 && (
              <div className="bg-white rounded-2xl border border-[#E5E5E7] shadow-sm overflow-hidden">
                <div className="flex items-center gap-2.5 px-5 py-4 border-b border-[#E5E5E7] bg-gradient-to-r from-[#F8FAFC] to-white">
                  <GitBranch className="w-4 h-4 text-[#059669]" />
                  <span className="text-sm font-bold text-[#111114]">Branches</span>
                  <span className="ml-auto text-[10px] font-mono text-[#9CA3AF]">{branches.all.length} total</span>
                </div>
                <div className="p-4 space-y-2">
                  {branches.all.map((b, i) => (
                    <motion.div
                      key={i}
                      initial={{ opacity: 0, x: 8 }}
                      animate={{ opacity: 1, x: 0 }}
                      transition={{ delay: i * 0.05 }}
                      className={`flex items-center gap-2.5 px-3 py-2 rounded-xl text-xs font-mono transition-colors ${
                        b === branches.current
                          ? 'bg-emerald-50 border border-emerald-200 text-emerald-700'
                          : 'bg-[#FAFAFA] border border-[#E5E5E7] text-[#6B7280]'
                      }`}
                    >
                      <GitBranch className={`w-3.5 h-3.5 shrink-0 ${b === branches.current ? 'text-emerald-500' : 'text-[#9CA3AF]'}`} />
                      <span className="truncate">{b}</span>
                      {b === branches.current && (
                        <span className="ml-auto shrink-0 text-[9px] font-bold uppercase tracking-wider text-emerald-600">HEAD</span>
                      )}
                    </motion.div>
                  ))}
                </div>
              </div>
            )}

            {/* Commit frequency mini-chart */}
            {commits.length > 1 && (
              <div className="bg-white rounded-2xl border border-[#E5E5E7] shadow-sm overflow-hidden">
                <div className="flex items-center gap-2.5 px-5 py-4 border-b border-[#E5E5E7]">
                  <Activity className="w-4 h-4 text-[#F59E0B]" />
                  <span className="text-sm font-bold text-[#111114]">Commit Frequency</span>
                </div>
                <div className="px-5 py-4">
                  <CommitFrequencyChart commits={commits} />
                </div>
              </div>
            )}
          </div>
        </div>

        <div className="mt-8 flex items-center justify-between text-[10px] font-mono text-[#C0C4CC] px-1">
          <span>Status: <span className="text-emerald-500">Active Stream</span></span>
          <span>Latency: <span className="text-[#2563EB] font-semibold">&lt; 14ms</span></span>
        </div>
      </div>


    </main>
  );
}

/* ── Compare Repos ───────────────────────────────────────────── */
interface CompareData {
  repoUrl: string;
  commits: number;
  contributors: number;
  branches: number;
  topAuthor: string;
  lastCommit: string;
  languages: string[];
  summary: string;
  similarityScore: number;
}

/** Extract keywords from a string for similarity matching */
function extractKeywords(text: string): string[] {
  return text.toLowerCase()
    .replace(/[^a-z0-9\s]/g, ' ')
    .split(/\s+/)
    .filter((w) => w.length > 3 && !['this','that','with','from','have','been','will','they','your','repo','code','file'].includes(w));
}

/** Score similarity between two repos (0–100) */
function similarityScore(a: CompareData, b: CompareData): number {
  let score = 0;
  // Language overlap (40 pts)
  const langOverlap = a.languages.filter((l) => b.languages.includes(l)).length;
  const langUnion   = new Set([...a.languages, ...b.languages]).size;
  score += langUnion > 0 ? (langOverlap / langUnion) * 40 : 0;
  // Summary keyword overlap (40 pts)
  const kwA = new Set(extractKeywords(a.summary));
  const kwB = new Set(extractKeywords(b.summary));
  const kwOverlap = [...kwA].filter((k) => kwB.has(k)).length;
  const kwUnion   = new Set([...kwA, ...kwB]).size;
  score += kwUnion > 0 ? (kwOverlap / kwUnion) * 40 : 0;
  // Similar commit scale (20 pts)
  const commitRatio = Math.min(a.commits, b.commits) / Math.max(a.commits, b.commits, 1);
  score += commitRatio * 20;
  return Math.round(score);
}

/** Parse all cached results from localStorage into CompareData[] */
function loadAllCachedRepos(): CompareData[] {
  const results: CompareData[] = [];
  try {
    for (let i = 0; i < localStorage.length; i++) {
      const key = localStorage.key(i);
      if (!key?.endsWith('_result') || !key.startsWith('repoatlas_')) continue;
      const raw = localStorage.getItem(key);
      if (!raw) continue;
      const parsed = JSON.parse(raw);
      const trace = parsed?.trace;
      const viz   = parsed?.visualization;
      if (!trace && !viz) continue;
      const commits      = trace?.commits ?? [];
      const contributors = trace?.contributors ?? [];
      const branches     = trace?.branches?.all ?? [];
      const langs        = (viz?.language_breakdown ?? []).map((l: { language: string }) => l.language.toLowerCase());
      const summary      = parsed?.executive_summary ?? trace?.summary ?? '';
      results.push({
        repoUrl:         parsed?.repo_path ?? '',
        commits:         commits.length,
        contributors:    [...new Set(commits.map((c: CommitEntry) => c.author))].length || contributors.length,
        branches:        branches.length || 1,
        topAuthor:       contributors[0]?.author || '—',
        lastCommit:      commits[0]?.date
          ? new Date(commits[0].date).toLocaleDateString('en-GB', { day: '2-digit', month: 'short', year: 'numeric' })
          : '—',
        languages: langs,
        summary,
        similarityScore: 0,
      });
    }
  } catch { /* ignore */ }
  return results;
}

function CompareBar({ label, valA, valB }: { label: string; valA: number; valB: number }) {
  const max = Math.max(valA, valB, 1);
  const winA = valA >= valB;
  return (
    <div className="space-y-1">
      <div className="flex items-center justify-between text-[10px] font-mono">
        <span className="font-semibold text-[#374151]">{label}</span>
        <div className="flex items-center gap-2">
          <span className={`font-bold ${winA ? 'text-[#2563EB]' : 'text-[#9CA3AF]'}`}>{valA.toLocaleString()}</span>
          <span className="text-[#D1D5DB] text-[9px]">vs</span>
          <span className={`font-bold ${!winA ? 'text-[#7C3AED]' : 'text-[#9CA3AF]'}`}>{valB.toLocaleString()}</span>
          <span className={`ml-1 px-1.5 py-0.5 rounded text-[8px] font-bold ${winA ? 'bg-[#EFF6FF] text-[#2563EB]' : 'bg-[#F5F3FF] text-[#7C3AED]'}`}>
            {winA ? 'A wins' : 'B wins'}
          </span>
        </div>
      </div>
      <div className="flex gap-0.5 h-2.5 rounded-full overflow-hidden bg-[#F3F4F6]">
        <motion.div
          initial={{ width: 0 }}
          animate={{ width: `${(valA / max) * 100}%` }}
          transition={{ duration: 0.7, ease: [0.16, 1, 0.3, 1] }}
          className="h-full bg-[#2563EB] rounded-l-full"
        />
        <motion.div
          initial={{ width: 0 }}
          animate={{ width: `${(valB / max) * 100}%` }}
          transition={{ duration: 0.7, delay: 0.1, ease: [0.16, 1, 0.3, 1] }}
          className="h-full bg-[#7C3AED] rounded-r-full"
        />
      </div>
    </div>
  );
}

function CompareRepos({ currentCommits, currentContributors, currentBranches }: {
  currentCommits: DisplayCommit[];
  currentContributors: ContributorEntry[];
  currentBranches: { current: string; all: string[] };
}) {
  const currentRepoUrl = (() => {
    try { return sessionStorage.getItem('repoatlas_url') || localStorage.getItem('repoatlas_url') || ''; }
    catch { return ''; }
  })();

  const [inputUrl1, setInputUrl1] = useState(currentRepoUrl || 'Sara-ux23/Fower_classify');
  const [inputUrl2, setInputUrl2] = useState('gabrielecirulli/2048');
  const [isComparing, setIsComparing] = useState(false);
  const [liveResult, setLiveResult] = useState<CompareResponse | null>(null);
  const [error, setError] = useState<string | null>(null);

  const samplePairs = [
    { name: 'Fower Classify vs 2048', url1: 'Sara-ux23/Fower_classify', url2: 'gabrielecirulli/2048' },
    { name: 'Feedback Form vs Fake Headline', url1: 'Sara-ux23/Feedback-Form', url2: 'shofiahmed69/Fake-Headline-Generator' },
  ];

  const handleRunComparison = async (u1?: string, u2?: string) => {
    const target1 = u1 || inputUrl1;
    const target2 = u2 || inputUrl2;
    if (!target1.trim() || !target2.trim()) return;

    setIsComparing(true);
    setError(null);
    try {
      const res = await compareRepos(target1.trim(), target2.trim());
      setLiveResult(res);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Multi-repo benchmark failed');
    } finally {
      setIsComparing(false);
    }
  };

  const shortName = (url: string) => url.replace('https://github.com/', '').replace('http://github.com/', '');

  return (
    <div className="p-5 rounded-2xl bg-white border border-[#2563EB]/20 shadow-sm space-y-5">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <p className="text-xs font-mono font-bold text-[#2563EB] uppercase tracking-wider">Multi-Repository Side-by-Side Benchmark</p>
          <p className="text-[10px] font-mono text-[#6B7280]">Compare commit velocity, contributors, security risk, and architecture complexity</p>
        </div>
        {isComparing && <div className="w-4 h-4 border-2 border-[#2563EB]/30 border-t-[#2563EB] rounded-full animate-spin" />}
      </div>

      {/* Input controls */}
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
        <div>
          <label className="block text-[10px] font-mono font-bold text-[#4B5563] mb-1">Repo A (Base)</label>
          <input
            type="text"
            value={inputUrl1}
            onChange={(e) => setInputUrl1(e.target.value)}
            placeholder="github.com/org/repo-a"
            className="w-full px-3 py-2 rounded-xl bg-[#FAFAFA] border border-[#E5E5E7] text-xs font-mono focus:outline-none focus:border-[#2563EB]"
          />
        </div>
        <div>
          <label className="block text-[10px] font-mono font-bold text-[#4B5563] mb-1">Repo B (Comparison)</label>
          <input
            type="text"
            value={inputUrl2}
            onChange={(e) => setInputUrl2(e.target.value)}
            placeholder="github.com/org/repo-b"
            className="w-full px-3 py-2 rounded-xl bg-[#FAFAFA] border border-[#E5E5E7] text-xs font-mono focus:outline-none focus:border-[#7C3AED]"
          />
        </div>
      </div>

      {/* Preset pair buttons & Run CTA */}
      <div className="flex flex-wrap items-center justify-between gap-2 pt-1">
        <div className="flex flex-wrap items-center gap-1.5 text-xs">
          <span className="text-[10px] font-mono text-[#9CA3AF]">Presets:</span>
          {samplePairs.map((p) => (
            <button
              key={p.name}
              onClick={() => { setInputUrl1(p.url1); setInputUrl2(p.url2); handleRunComparison(p.url1, p.url2); }}
              className="px-2.5 py-1 rounded-lg bg-[#F1F5F9] hover:bg-[#E2E8F0] text-[10px] font-mono font-semibold text-[#475569] transition-colors"
            >
              {p.name}
            </button>
          ))}
        </div>

        <button
          onClick={() => handleRunComparison()}
          disabled={isComparing}
          className="px-5 py-2 rounded-xl bg-[#2563EB] hover:bg-[#1D4ED8] disabled:opacity-50 text-white font-mono text-xs font-bold shadow-md transition-all flex items-center gap-2"
        >
          {isComparing ? <Sparkles className="w-3.5 h-3.5 animate-spin" /> : <GitBranch className="w-3.5 h-3.5" />}
          <span>{isComparing ? 'Running Benchmark…' : 'Run Side-by-Side Benchmark'}</span>
        </button>
      </div>

      {error && (
        <div className="p-3 rounded-xl bg-red-50 text-red-700 text-xs font-mono border border-red-200">
          {error}
        </div>
      )}

      {/* Results view */}
      {liveResult && (
        <motion.div initial={{ opacity: 0, y: 12 }} animate={{ opacity: 1, y: 0 }} className="space-y-4 pt-2">
          {/* Identity cards */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            {[
              { data: liveResult.repo1, border: 'border-[#BFDBFE] bg-[#EFF6FF]', dot: 'bg-[#2563EB]', label: 'Repo A' },
              { data: liveResult.repo2, border: 'border-[#DDD6FE] bg-[#F5F3FF]', dot: 'bg-[#7C3AED]', label: 'Repo B' },
            ].map(({ data, border, dot, label }) => (
              <div key={label} className={`p-4 rounded-xl border ${border} space-y-2`}>
                <div className="flex items-center justify-between">
                  <span className="text-[10px] font-mono font-bold uppercase tracking-wider text-[#6B7280] flex items-center gap-1.5">
                    <span className={`w-2 h-2 rounded-full ${dot}`} />
                    {label}
                  </span>
                  <span className={`px-2 py-0.5 rounded-full text-[9px] font-mono font-bold ${
                    data.security_risk === 'SAFE' ? 'bg-emerald-100 text-emerald-700' : 'bg-amber-100 text-amber-700'
                  }`}>
                    Risk: {data.security_risk}
                  </span>
                </div>

                <p className="text-sm font-mono font-bold text-[#111114] truncate" title={data.repo_url}>
                  {data.repo_name}
                </p>

                <div className="grid grid-cols-2 gap-2 text-xs font-mono pt-1">
                  <div className="bg-white/80 p-2 rounded-lg border border-white">
                    <span className="text-[9px] text-[#9CA3AF] block">Commits</span>
                    <span className="font-bold text-[#111114]">{data.total_commits} ({data.monthly_velocity}/mo)</span>
                  </div>
                  <div className="bg-white/80 p-2 rounded-lg border border-white">
                    <span className="text-[9px] text-[#9CA3AF] block">Contributors</span>
                    <span className="font-bold text-[#111114]">{data.total_contributors}</span>
                  </div>
                  <div className="bg-white/80 p-2 rounded-lg border border-white">
                    <span className="text-[9px] text-[#9CA3AF] block">Primary Stack</span>
                    <span className="font-bold text-[#111114]">{data.primary_lang}</span>
                  </div>
                  <div className="bg-white/80 p-2 rounded-lg border border-white">
                    <span className="text-[9px] text-[#9CA3AF] block">Total Lines</span>
                    <span className="font-bold text-[#111114]">{data.total_lines.toLocaleString()}</span>
                  </div>
                </div>
              </div>
            ))}
          </div>

          {/* Metric Progress Bars */}
          <div className="p-4 rounded-xl bg-[#FAFAFA] border border-[#E5E5E7] space-y-3">
            <p className="text-[10px] font-mono font-bold uppercase tracking-wider text-[#4B5563]">Side-by-Side Metric Comparison</p>
            <CompareBar label="Commits Count" valA={liveResult.repo1.total_commits} valB={liveResult.repo2.total_commits} />
            <CompareBar label="Monthly Commit Velocity" valA={liveResult.repo1.monthly_velocity} valB={liveResult.repo2.monthly_velocity} />
            <CompareBar label="Contributors Diversity" valA={liveResult.repo1.total_contributors} valB={liveResult.repo2.total_contributors} />
            <CompareBar label="Lines of Code" valA={liveResult.repo1.total_lines} valB={liveResult.repo2.total_lines} />
          </div>

          {/* AI Verdict */}
          <div className="p-4 rounded-xl bg-gradient-to-r from-[#EFF6FF] via-[#F8FAFC] to-[#F5F3FF] border border-[#BFDBFE] space-y-2">
            <div className="flex items-center gap-2 text-xs font-mono font-bold text-[#2563EB]">
              <Sparkles className="w-4 h-4 text-[#2563EB]" />
              <span>AI Comparative Architectural Verdict</span>
            </div>
            <p className="text-xs text-[#374151] font-sans leading-relaxed whitespace-pre-line">
              {liveResult.verdict}
            </p>
          </div>
        </motion.div>
      )}
    </div>
  );
}

/* ── Commit frequency bar chart (by month) ───────────────────── */
function CommitFrequencyChart({ commits }: { commits: DisplayCommit[] }) {
  // Bucket commits by month
  const buckets: Record<string, number> = {};
  for (const c of commits) {
    if (!c.date) continue;
    const key = `${c.date.getFullYear()}-${String(c.date.getMonth() + 1).padStart(2, '0')}`;
    buckets[key] = (buckets[key] ?? 0) + 1;
  }
  const entries = Object.entries(buckets).sort(([a], [b]) => a.localeCompare(b)).slice(-8);
  const max = Math.max(...entries.map(([, v]) => v), 1);

  if (entries.length === 0) {
    return <p className="text-xs font-mono text-[#9CA3AF] text-center py-2">Not enough date data</p>;
  }

  return (
    <div className="flex items-end gap-1.5 h-20">
      {entries.map(([month, count], i) => {
        const label = new Date(`${month}-01`).toLocaleDateString('en-US', { month: 'short' });
        return (
          <div key={month} className="flex-1 flex flex-col items-center gap-1">
            <motion.div
              initial={{ height: 0 }}
              animate={{ height: `${(count / max) * 100}%` }}
              transition={{ duration: 0.5, delay: i * 0.05 }}
              className="w-full min-h-[4px] rounded-t-sm bg-gradient-to-t from-[#2563EB] to-[#60A5FA]"
              title={`${count} commit${count !== 1 ? 's' : ''} in ${month}`}
            />
            <span className="text-[8px] font-mono text-[#9CA3AF]">{label}</span>
          </div>
        );
      })}
    </div>
  );
}
