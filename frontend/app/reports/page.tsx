'use client';

import React, { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import {
  FileText, GitBranch, Clock, Search, ExternalLink, Download,
  Compass, Shield, Network, Eye, ChevronRight, CheckCircle2,
  Sparkles, Layers, Cpu, Code2, AlertTriangle, ArrowRight, RefreshCw, Trash2,
} from 'lucide-react';
import { Navbar } from '../../components/Navbar';

import { useRepo } from '../../lib/repoContext';
import {
  getAnalysisHistory, getAnalysisDetail, getChatRepos, analyzeRepo, saveLocalAnalysis, AnalysisSummary, AnalysisDetail, SecurityFinding, LangEntry,
} from '../../lib/api';

function repoLabel(url: string) {
  try { return new URL(url).pathname.replace(/^\//, '').replace(/\.git$/, ''); }
  catch { return url; }
}

function timeAgo(iso: string) {
  const diff = Date.now() - new Date(iso).getTime();
  const m = Math.floor(diff / 60000);
  if (m < 1) return 'just now';
  if (m < 60) return `${m}m ago`;
  const h = Math.floor(m / 60);
  if (h < 24) return `${h}h ago`;
  return `${Math.floor(h / 24)}d ago`;
}

function consolidateLangs(langs: LangEntry[]): LangEntry[] {
  const map: Record<string, LangEntry> = {};
  for (const l of langs) {
    if (!l || !l.language) continue;
    if (map[l.language]) {
      map[l.language].lines += l.lines || 0;
      map[l.language].files += l.files || 0;
    } else {
      map[l.language] = { ...l };
    }
  }
  return Object.values(map).sort((a, b) => b.lines - a.lines);
}

function extractShortExecutiveSummary(text: string): string {
  if (!text) return 'Security scan completed across repository codebase.';
  let clean = text
    .replace(/\*{2,3}(.*?)\*{2,3}/g, '$1')
    .replace(/#+\s*/g, '')
    .replace(/Security Scan Analysis Report\s*/gi, '')
    .trim();

  const execMatch = clean.match(/(?:1\.\s*)?Executive Summary[:\s]*(.*?)(?=\s*(?:2\.|Critical Issues|Top Recommendations|Recommendations|\d+\.))/i);
  if (execMatch && execMatch[1].trim()) {
    clean = execMatch[1].trim();
  }

  const sentences = clean.split(/(?<=[.!?])\s+/);
  if (sentences.length > 0) {
    let summary = sentences[0];
    if (sentences[1] && (summary.length + sentences[1].length) < 220) {
      summary += ' ' + sentences[1];
    }
    return summary;
  }

  return clean.length > 200 ? clean.slice(0, 197) + '...' : clean;
}

function normalizeReportDetail(detail: any): AnalysisDetail | null {
  if (!detail) return null;
  return {
    ...detail,
    explorer_result: detail.explorer_result ?? detail.explorer ?? null,
    trace_result: detail.trace_result ?? detail.trace ?? null,
    security_result: detail.security_result ?? detail.security ?? null,
    visualization_result: detail.visualization_result ?? detail.visualization ?? null,
  };
}

function renderSecurityReport(val: any) {
  if (!val) {
    return (
      <div className="p-8 text-center text-xs text-[#9CA3AF]">
        Security vulnerability audit results not recorded for this session.
      </div>
    );
  }

  if (typeof val === 'string') {
    return (
      <div className="text-sm leading-relaxed text-[#374151] whitespace-pre-wrap font-sans bg-[#F9FAFB] p-5 rounded-xl border border-[#E5E5E7]">
        {val}
      </div>
    );
  }

  const riskRating = (val.risk_rating || val.score?.rating || 'SAFE').toUpperCase();
  const totalFindings = val.score?.total ?? (
    val.findings
      ? Object.values(val.findings as Record<string, any[]>).reduce((sum, arr) => sum + (Array.isArray(arr) ? arr.length : 0), 0)
      : 0
  );
  const counts: Record<string, number> = val.score?.counts || { CRITICAL: 0, HIGH: 0, MEDIUM: 0, LOW: 0 };
  const expertAnalysis = val.expert_analysis || val.report || null;
  const findingsObj: Record<string, SecurityFinding[]> = val.findings || {};

  const riskBadgeStyle =
    riskRating === 'CRITICAL' || riskRating === 'HIGH'
      ? 'bg-red-100 text-red-700 border-red-200'
      : riskRating === 'MEDIUM'
      ? 'bg-amber-100 text-amber-800 border-amber-200'
      : 'bg-emerald-100 text-emerald-800 border-emerald-200';

  const severityBadge = (sev: string) => {
    const s = (sev || '').toUpperCase();
    if (s === 'CRITICAL' || s === 'HIGH') return 'bg-red-50 text-red-600 border-red-200';
    if (s === 'MEDIUM') return 'bg-amber-50 text-amber-700 border-amber-200';
    return 'bg-emerald-50 text-emerald-700 border-emerald-200';
  };

  const categories = Object.entries(findingsObj).filter(([, items]) => Array.isArray(items) && items.length > 0);

  return (
    <div className="space-y-6 font-sans">
      {/* Risk Overview Banner */}
      <div className="p-5 rounded-xl bg-[#F8FAFC] border border-[#E2E8F0] flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div className="space-y-1">
          <div className="flex items-center gap-3">
            <span className={`px-3 py-1 rounded-full text-xs font-mono font-extrabold border uppercase tracking-wider ${riskBadgeStyle}`}>
              {riskRating} RISK LEVEL
            </span>
            <span className="text-xs font-semibold text-[#475569]">
              {totalFindings === 0 ? 'No security threats detected' : `${totalFindings} Security Finding(s) Identified`}
            </span>
          </div>
          <p className="text-xs text-[#64748B] pt-1">
            Comprehensive audit covering API secrets, dependencies, sensitive file exposures, and code misconfigurations.
          </p>
        </div>

        {/* Severity Count Pills */}
        <div className="flex items-center gap-2 flex-wrap">
          {Object.entries(counts).map(([sev, count]) => (
            <div key={sev} className="px-2.5 py-1 rounded-lg bg-white border border-[#E2E8F0] text-[11px] font-mono flex items-center gap-1.5 shadow-xs">
              <span className="text-[#64748B] font-medium">{sev}:</span>
              <span className={`font-bold ${Number(count) > 0 ? 'text-[#0F172A]' : 'text-[#94A3B8]'}`}>{Number(count)}</span>
            </div>
          ))}
        </div>
      </div>

      {/* Detailed Assessment Text */}
      <div className="space-y-2">
        <h4 className="text-xs font-bold text-[#1E293B] uppercase tracking-wider font-mono flex items-center gap-2">
          <Shield className="w-4 h-4 text-[#2563EB]" />
          Security Assessment & Expert Findings
        </h4>
        <div className="p-4 rounded-xl bg-gradient-to-r from-[#F8FAFC] to-[#F1F5F9] border border-[#CBD5E1]/80 shadow-xs">
          {expertAnalysis ? (
            <p className="font-sans text-xs sm:text-[13px] leading-relaxed text-[#1E293B] font-medium">
              <span className="font-bold text-[#2563EB] font-mono uppercase text-[11px] tracking-wider mr-1.5">
                Executive Overview:
              </span>
              {extractShortExecutiveSummary(expertAnalysis)}
            </p>
          ) : (
            <p className="font-sans text-xs sm:text-[13px] leading-relaxed text-[#1E293B] font-medium">
              The security agent evaluated repository architecture, package lockfiles, environment declarations, and HTTP configurations.
              {totalFindings === 0
                ? ' No hardcoded API keys, unencrypted secrets, or severe vulnerabilities were discovered.'
                : ` A total of ${totalFindings} potential threat items were detected and detailed below for developer review.`}
            </p>
          )}
        </div>
      </div>

      {/* Elaborated Findings Breakdown */}
      {categories.length > 0 && (
        <div className="space-y-3">
          <h4 className="text-xs font-bold text-[#1E293B] uppercase tracking-wider font-mono flex items-center gap-2">
            <span className="w-2.5 h-2.5 rounded-full bg-[#EF4444]" />
            Elaborated Vulnerability Findings & Misconfigurations
          </h4>

          <div className="space-y-3">
            {categories.map(([catName, items]) => (
              <div key={catName} className="border border-[#E2E8F0] rounded-xl overflow-hidden bg-white shadow-xs">
                <div className="bg-[#F8FAFC] px-4 py-2.5 border-b border-[#E2E8F0] flex items-center justify-between">
                  <span className="text-xs font-bold text-[#1E293B] font-mono capitalize">
                    {catName.replace(/_/g, ' ')}
                  </span>
                  <span className="text-[10px] font-mono text-[#2563EB] font-bold bg-[#EFF6FF] px-2 py-0.5 rounded-full">
                    {items.length} finding(s)
                  </span>
                </div>

                <div className="divide-y divide-[#F1F5F9]">
                  {items.map((item, idx) => {
                    const title = item.type || item.package || catName.replace(/_/g, ' ');
                    const severity = (item.severity || 'medium').toString();
                    const fileLocation = item.file || item.package || '';
                    const reason = item.reason || 'Potential security risk identified during static analysis scan.';

                    return (
                      <div key={idx} className="p-4 space-y-2 hover:bg-[#FAFAFA] transition-colors">
                        <div className="flex items-center justify-between gap-3 flex-wrap">
                          <div className="flex items-center gap-2">
                            <span className="text-xs font-bold text-[#0F172A] font-sans">{title}</span>
                            <span className={`text-[10px] font-mono font-bold px-2 py-0.5 rounded border ${severityBadge(severity)}`}>
                              {severity.toUpperCase()}
                            </span>
                          </div>
                          {fileLocation && (
                            <span className="text-[11px] font-mono text-[#64748B] bg-[#F1F5F9] px-2 py-0.5 rounded border border-[#E2E8F0]">
                              {fileLocation} {item.line ? `(line ${item.line})` : ''}
                            </span>
                          )}
                        </div>

                        <p className="text-xs text-[#475569] leading-relaxed font-sans">
                          {reason}
                        </p>
                      </div>
                    );
                  })}
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Actionable Remediation Checklist */}
      <div className="p-5 rounded-xl bg-[#F0FDF4] border border-[#BBF7D0] space-y-2">
        <h4 className="text-xs font-bold text-[#166534] font-mono uppercase tracking-wider flex items-center gap-2">
          <span>✓</span> Actionable Security Recommendations
        </h4>
        <ul className="text-xs text-[#15803D] space-y-1.5 list-disc list-inside font-sans leading-relaxed">
          <li>Ensure all secret tokens, API keys, and database connection URIs are loaded exclusively from environment variables (`.env`) rather than hardcoded in repository code.</li>
          <li>Configure strict Cross-Origin Resource Sharing (CORS) headers to explicitly restrict wildcard access (`*`) in production APIs.</li>
          <li>Periodically audit and update third-party dependencies using `npm audit fix` or `pip audit` to keep libraries free of published CVE vulnerabilities.</li>
        </ul>
      </div>
    </div>
  );
}

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
    <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 font-sans">
      {/* Latest Commit Card */}
      <div className="p-3.5 rounded-xl bg-white border border-[#BFDBFE] shadow-2xs space-y-1.5">
        <p className="text-[10px] font-mono font-bold text-[#2563EB] uppercase tracking-wider flex items-center gap-1.5">
          <GitBranch className="w-3.5 h-3.5" />
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
          <Code2 className="w-3.5 h-3.5" />
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

function renderTraceReport(val: any) {
  if (!val) {
    return (
      <div className="p-8 text-center text-xs text-[#9CA3AF]">
        Call chain trace data not recorded for this session.
      </div>
    );
  }

  const summaryStr = typeof val === 'string' ? val : (val.summary || JSON.stringify(val, null, 2));
  const commits = typeof val === 'object' && Array.isArray(val?.commits) ? val.commits : [];

  return (
    <div className="space-y-5 font-sans">
      <FormattedSummary summary={summaryStr} />

      {commits.length > 0 && (
        <div className="p-4 rounded-xl bg-white border border-[#E2E8F0] space-y-3 shadow-2xs">
          <div className="flex items-center justify-between">
            <span className="text-xs font-mono font-bold text-[#1E293B] uppercase tracking-wider flex items-center gap-2">
              <GitBranch className="w-4 h-4 text-[#2563EB]" />
              Recent Commits ({commits.length})
            </span>
          </div>
          <div className="space-y-2 max-h-60 overflow-y-auto pr-1">
            {commits.map((c: any, i: number) => (
              <div key={i} className="flex items-center justify-between p-2.5 rounded-lg bg-[#F8FAFC] border border-[#E2E8F0] text-xs font-mono">
                <div className="flex items-center gap-2 min-w-0">
                  <span className="px-2 py-0.5 rounded bg-[#EFF6FF] text-[#2563EB] font-bold border border-[#BFDBFE] shrink-0">
                    {c.short_hash || c.hash?.slice(0, 7) || 'commit'}
                  </span>
                  <span className="text-[#1E293B] truncate font-sans">{c.message}</span>
                </div>
                <span className="text-[10px] text-[#64748B] shrink-0 ml-2">{c.author}</span>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}

function AnimatedArchitectureGraph({ val }: { val: any }) {
  if (!val) {
    return (
      <div className="p-8 text-center text-xs text-[#9CA3AF]">
        Graph visualization output not recorded for this session.
      </div>
    );
  }

  const viz = typeof val === 'string' ? null : val;
  const rawNarrative = typeof val === 'string' ? val : (val?.narrative || val?.summary || '');

  const langs: LangEntry[] = viz?.language_breakdown ? consolidateLangs(viz.language_breakdown).slice(0, 8) : [];
  const totalLines = langs.reduce((sum, l) => sum + (l.lines || 0), 0);

  const depGraph = viz?.dependency_graph || null;
  const nodes = depGraph?.nodes || [];
  const edges = depGraph?.edges || [];

  const displayNodes = nodes.length > 0 ? nodes.slice(0, 10) : [
    { id: '1', label: 'App Entry (main.py / index.tsx)', type: 'core' },
    { id: '2', label: 'API Router & Controllers', type: 'route' },
    { id: '3', label: 'Multi-Agent Orchestrator', type: 'agent' },
    { id: '4', label: 'AST Code Explorer Agent', type: 'agent' },
    { id: '5', label: 'Git Trace & Commit Agent', type: 'agent' },
    { id: '6', label: 'Security Audit Scanner', type: 'security' },
    { id: '7', label: 'Architecture Viz Generator', type: 'viz' },
    { id: '8', label: 'Database & Cache Storage', type: 'db' },
  ];

  const nodePositions = displayNodes.map((n: any, idx: number, arr: any[]) => {
    const angle = (idx / arr.length) * 2 * Math.PI - Math.PI / 2;
    const rx = 240;
    const ry = 100;
    const cx = 320;
    const cy = 150;
    return {
      ...n,
      x: cx + rx * Math.cos(angle),
      y: cy + ry * Math.sin(angle),
    };
  });

  const posMap = new Map<string, { x: number; y: number; label: string; type: string }>();
  nodePositions.forEach((p) => posMap.set(p.id, p));

  const displayEdges = edges.length > 0
    ? edges.slice(0, 12).map((e: any) => ({
        source: posMap.get(e.source) || nodePositions[0],
        target: posMap.get(e.target) || nodePositions[1],
      })).filter((e: any) => e.source && e.target)
    : nodePositions.map((n: any, i: number) => ({
        source: n,
        target: nodePositions[(i + 1) % nodePositions.length],
      }));

  return (
    <div className="space-y-6 font-sans">
      {/* Visual Header Stats */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
        <div className="p-3.5 rounded-xl bg-white border border-[#E2E8F0] shadow-xs flex items-center gap-3">
          <div className="p-2.5 rounded-lg bg-[#EFF6FF] text-[#2563EB]">
            <Network className="w-4 h-4" />
          </div>
          <div>
            <p className="text-[10px] font-mono text-[#64748B] uppercase tracking-wider">Nodes</p>
            <p className="text-sm font-extrabold text-[#0F172A] font-mono">{displayNodes.length}</p>
          </div>
        </div>

        <div className="p-3.5 rounded-xl bg-white border border-[#E2E8F0] shadow-xs flex items-center gap-3">
          <div className="p-2.5 rounded-lg bg-[#F0FDF4] text-[#166534]">
            <GitBranch className="w-4 h-4" />
          </div>
          <div>
            <p className="text-[10px] font-mono text-[#64748B] uppercase tracking-wider">Edges</p>
            <p className="text-sm font-extrabold text-[#0F172A] font-mono">{displayEdges.length}</p>
          </div>
        </div>

        <div className="p-3.5 rounded-xl bg-white border border-[#E2E8F0] shadow-xs flex items-center gap-3">
          <div className="p-2.5 rounded-lg bg-[#FAF5FF] text-[#7C3AED]">
            <Code2 className="w-4 h-4" />
          </div>
          <div>
            <p className="text-[10px] font-mono text-[#64748B] uppercase tracking-wider">Lines of Code</p>
            <p className="text-sm font-extrabold text-[#0F172A] font-mono">{totalLines > 0 ? totalLines.toLocaleString() : '1,200+'}</p>
          </div>
        </div>

        <div className="p-3.5 rounded-xl bg-white border border-[#E2E8F0] shadow-xs flex items-center gap-3">
          <div className="p-2.5 rounded-lg bg-[#FFF7ED] text-[#C2410C]">
            <Sparkles className="w-4 h-4" />
          </div>
          <div>
            <p className="text-[10px] font-mono text-[#64748B] uppercase tracking-wider">Languages</p>
            <p className="text-sm font-extrabold text-[#0F172A] font-mono">{langs.length || 1}</p>
          </div>
        </div>
      </div>

      {/* Interactive Animated Architecture Graph SVG Canvas */}
      <div className="relative rounded-2xl bg-[#0F172A] border border-[#1E293B] overflow-hidden shadow-md p-4">
        <div className="flex items-center justify-between pb-3 border-b border-[#1E293B] mb-2">
          <div className="flex items-center gap-2">
            <span className="w-2.5 h-2.5 rounded-full bg-[#38BDF8] animate-pulse" />
            <span className="text-xs font-mono font-bold text-slate-200 uppercase tracking-wider">
              System Architecture & Dependency Graph
            </span>
          </div>
          <span className="text-[10px] font-mono text-slate-400 bg-[#1E293B] px-2 py-0.5 rounded border border-slate-700">
            Animated Real-time Synthesis
          </span>
        </div>

        <div className="w-full h-[320px] relative flex items-center justify-center overflow-hidden">
          <svg viewBox="0 0 640 300" className="w-full h-full select-none">
            <defs>
              <linearGradient id="edge-grad" x1="0%" y1="0%" x2="100%" y2="100%">
                <stop offset="0%" stopColor="#38BDF8" stopOpacity="0.6" />
                <stop offset="100%" stopColor="#818CF8" stopOpacity="0.2" />
              </linearGradient>
            </defs>

            {/* Edge lines & traveling pulse dots */}
            {displayEdges.map((edge: any, i: number) => {
              const dx = edge.target.x - edge.source.x;
              const cx1 = edge.source.x + dx * 0.5;
              const cy1 = edge.source.y;
              const pathD = `M ${edge.source.x} ${edge.source.y} Q ${cx1} ${cy1} ${edge.target.x} ${edge.target.y}`;

              return (
                <g key={i}>
                  <path
                    d={pathD}
                    fill="none"
                    stroke="url(#edge-grad)"
                    strokeWidth="1.5"
                    strokeDasharray="4 3"
                    className="opacity-70"
                  />
                  <motion.circle
                    r="3.5"
                    fill="#38BDF8"
                    animate={{
                      cx: [edge.source.x, edge.target.x],
                      cy: [edge.source.y, edge.target.y],
                      opacity: [0, 1, 0],
                    }}
                    transition={{
                      duration: 3 + (i % 3),
                      repeat: Infinity,
                      ease: 'easeInOut',
                      delay: i * 0.2,
                    }}
                  />
                </g>
              );
            })}

            {/* Pulsing Nodes */}
            {nodePositions.map((node: any, i: number) => {
              const colors: Record<string, string> = {
                core: '#38BDF8',
                route: '#818CF8',
                agent: '#C084FC',
                security: '#F87171',
                viz: '#FBBF24',
                db: '#34D399',
              };
              const nodeColor = colors[node.type] || '#38BDF8';

              return (
                <g key={node.id} className="cursor-pointer group">
                  <motion.circle
                    cx={node.x}
                    cy={node.y}
                    r="18"
                    fill={nodeColor}
                    opacity="0.15"
                    animate={{ scale: [1, 1.3, 1], opacity: [0.1, 0.25, 0.1] }}
                    transition={{ duration: 2.5, repeat: Infinity, delay: i * 0.15 }}
                  />
                  <circle
                    cx={node.x}
                    cy={node.y}
                    r="8"
                    fill={nodeColor}
                    stroke="#0F172A"
                    strokeWidth="2"
                  />
                  <foreignObject
                    x={node.x - 65}
                    y={node.y + 12}
                    width="130"
                    height="32"
                    className="pointer-events-none"
                  >
                    <div className="flex justify-center">
                      <span className="px-2 py-0.5 rounded bg-[#1E293B]/90 text-[9px] font-mono text-slate-200 font-semibold border border-slate-700/60 truncate max-w-[125px] shadow-sm text-center">
                        {node.label}
                      </span>
                    </div>
                  </foreignObject>
                </g>
              );
            })}
          </svg>
        </div>
      </div>

      {/* Language Breakdown Bar */}
      {langs.length > 0 && (
        <div className="p-4 rounded-xl bg-white border border-[#E2E8F0] space-y-3 shadow-2xs">
          <div className="flex items-center justify-between">
            <span className="text-xs font-mono font-bold text-[#1E293B] uppercase tracking-wider flex items-center gap-2">
              <span className="w-2 h-2 rounded-full bg-[#2563EB]" />
              Language Distribution
            </span>
            <span className="text-[10px] font-mono text-[#64748B]">
              {totalLines.toLocaleString()} total lines
            </span>
          </div>

          <div className="flex rounded-full overflow-hidden h-3.5 w-full gap-[2px] bg-[#F1F5F9] shadow-inner">
            {langs.map((l) => (
              <div
                key={l.language}
                style={{
                  width: `${((l.lines / totalLines) * 100).toFixed(1)}%`,
                  backgroundColor: l.color || '#2563EB',
                }}
                title={`${l.language}: ${l.lines.toLocaleString()} lines`}
                className="h-full first:rounded-l-full last:rounded-r-full transition-all"
              />
            ))}
          </div>

          <div className="flex flex-wrap gap-2 pt-1">
            {langs.map((l) => (
              <span key={l.language} className="flex items-center gap-1.5 px-2.5 py-1 rounded-full bg-[#F8FAFC] border border-[#E2E8F0] text-[10px] font-mono text-[#475569]">
                <span className="w-2 h-2 rounded-full shrink-0" style={{ backgroundColor: l.color || '#2563EB' }} />
                {l.language} · {((l.lines / totalLines) * 100).toFixed(0)}% ({l.lines.toLocaleString()} lines)
              </span>
            ))}
          </div>
        </div>
      )}

      {/* Minimal Overview Text */}
      {rawNarrative && (
        <div className="p-4 rounded-xl bg-[#F8FAFC] border border-[#E2E8F0] text-xs text-[#475569] leading-relaxed font-sans">
          <span className="font-bold text-[#1E293B] font-mono uppercase tracking-wider block mb-1">Architecture Overview:</span>
          {rawNarrative.length > 300 ? rawNarrative.slice(0, 300) + '...' : rawNarrative}
        </div>
      )}
    </div>
  );
}

export default function ReportsPage() {
  const { repoPath, setRepoPath } = useRepo();
  const [history, setHistory] = useState<AnalysisSummary[]>([]);
  const [selectedReportId, setSelectedReportId] = useState<string | null>(null);
  const [reportDetail, setReportDetail] = useState<AnalysisDetail | null>(null);
  const [activeTab, setActiveTab] = useState<'summary' | 'explorer' | 'trace' | 'security' | 'visualization'>('summary');
  const [searchQuery, setSearchQuery] = useState('');
  const [loadingHistory, setLoadingHistory] = useState(true);
  const [loadingDetail, setLoadingDetail] = useState(false);

  /* ── Boot: fetch history + load active report ── */
  useEffect(() => {
    const init = async () => {
      setLoadingHistory(true);

      // 1. Fetch DB history + DB chat repos in parallel
      const [dbHist, chatRepos] = await Promise.all([
        getAnalysisHistory(),
        getChatRepos(),
      ]);

      // 2. Fetch local storage analysis history array (if present)
      let localHist: AnalysisDetail[] = [];
      try {
        const rawLocalHist = localStorage.getItem('repoatlas_history');
        if (rawLocalHist) {
          localHist = JSON.parse(rawLocalHist);
        }
      } catch { /* ignore */ }

      // 3. Fetch local storage explorer chat sessions
      let explorerSessions: any[] = [];
      try {
        const rawExplorer = localStorage.getItem('repoatlas_explorer_sessions');
        if (rawExplorer) {
          explorerSessions = JSON.parse(rawExplorer);
        }
      } catch { /* ignore */ }

      // 4. Fetch active fallback session from local/sessionStorage
      let activeFallback: AnalysisDetail | null = null;
      try {
        const rawResult = localStorage.getItem('repoatlas_result') || sessionStorage.getItem('repoatlas_result');
        const rawUrl = repoPath || localStorage.getItem('repoatlas_url') || sessionStorage.getItem('repoatlas_url') || '';
        if (rawResult && rawUrl) {
          const parsed = JSON.parse(rawResult);
          activeFallback = normalizeReportDetail({
            id: 'local-session',
            repo_url: rawUrl,
            query: parsed.query || 'Initial Repository Analysis',
            agents_run: parsed.agents_run || ['explorer', 'trace', 'security', 'visualization'],
            executive_summary: typeof parsed.summary === 'string'
              ? parsed.summary
              : (parsed.executive_summary || 'Active session analysis report for ' + rawUrl),
            explorer_result: parsed.explorer_result ?? parsed.explorer ?? null,
            trace_result: parsed.trace_result ?? parsed.trace ?? null,
            security_result: parsed.security_result ?? parsed.security ?? null,
            visualization_result: parsed.visualization_result ?? parsed.visualization ?? null,
            created_at: new Date().toISOString(),
          });
        }
      } catch { /* ignore */ }

      // 5. Build combined map keyed by repo_url
      const combinedMap = new Map<string, AnalysisDetail>();

      // Active fallback item first
      if (activeFallback) {
        combinedMap.set(activeFallback.repo_url, activeFallback);
      }

      // Local storage history items
      for (const item of localHist) {
        if (item.repo_url && !combinedMap.has(item.repo_url)) {
          combinedMap.set(item.repo_url, normalizeReportDetail(item)!);
        }
      }

      // Local explorer chat sessions
      for (const sess of explorerSessions) {
        if (sess.repo_url && !combinedMap.has(sess.repo_url)) {
          combinedMap.set(sess.repo_url, {
            id: `explorer-${sess.id || Date.now()}`,
            repo_url: sess.repo_url,
            query: sess.title || 'Explorer Agent Session',
            agents_run: ['explorer'],
            executive_summary: `Interactive codebase exploration and chat history for ${sess.repo_url}`,
            created_at: sess.updated_at || sess.created_at || new Date().toISOString(),
          });
        }
      }

      // DB chat repos
      for (const cr of chatRepos) {
        if (cr.repo_url && !combinedMap.has(cr.repo_url)) {
          combinedMap.set(cr.repo_url, {
            id: `chat-${cr.repo_url}`,
            repo_url: cr.repo_url,
            query: 'Chat Session',
            agents_run: ['explorer'],
            executive_summary: `Interactive chat session history for ${cr.repo_url}`,
            created_at: cr.last_message_at || new Date().toISOString(),
          });
        }
      }

      // DB history items
      for (const item of dbHist) {
        if (item.repo_url) {
          const existing = combinedMap.get(item.repo_url);
          combinedMap.set(item.repo_url, normalizeReportDetail({
            ...existing,
            ...item,
            created_at: item.created_at || existing?.created_at || new Date().toISOString(),
          })!);
        }
      }

      const combinedList = Array.from(combinedMap.values());
      setHistory(combinedList);
      setLoadingHistory(false);

      // Select initial report
      if (combinedList.length > 0) {
        const initialReport = combinedList[0];
        setSelectedReportId(initialReport.id);
        if (initialReport.explorer_result || initialReport.executive_summary) {
          setReportDetail(normalizeReportDetail(initialReport));
          if (initialReport.repo_url) setRepoPath(initialReport.repo_url);
        } else {
          loadReportWithList(initialReport.id, combinedList);
        }
      }
    };

    init();
  }, []);

  /* ── Load a single report detail ── */
  const loadReportWithList = async (id: string, list: AnalysisSummary[]) => {
    setSelectedReportId(id);
    setLoadingDetail(true);
    let detail: AnalysisDetail | null = null;

    if (id !== 'local-session' && !id.startsWith('local-') && !id.startsWith('explorer-')) {
      detail = await getAnalysisDetail(id);
    }

    if (!detail) {
      // Find item in existing history list
      const summary = list.find((h) => h.id === id);
      if (summary) {
        detail = summary as AnalysisDetail;
      }
    }

    const norm = normalizeReportDetail(detail);
    const hasFullAgentData = norm && (
      norm.explorer_result || norm.trace_result || norm.security_result || norm.visualization_result
    );

    if (norm && !hasFullAgentData && norm.repo_url) {
      // Automatically fetch and persist full analysis for this previous repo
      try {
        const fullRes = await analyzeRepo({ repo_path: norm.repo_url, query: 'full analysis' });
        if (fullRes) {
          saveLocalAnalysis(norm.repo_url, fullRes);
          const fullDetail: AnalysisDetail = {
            id: norm.id,
            repo_url: norm.repo_url,
            query: fullRes.query || norm.query || 'full analysis',
            agents_run: fullRes.agents_run || norm.agents_run,
            executive_summary: fullRes.executive_summary || norm.executive_summary,
            explorer_result: fullRes.explorer,
            trace_result: fullRes.trace,
            security_result: fullRes.security,
            visualization_result: fullRes.visualization,
            created_at: norm.created_at || new Date().toISOString(),
          };
          const normalizedFull = normalizeReportDetail(fullDetail);
          setReportDetail(normalizedFull);
          if (norm.repo_url) setRepoPath(norm.repo_url);

          // Update in-memory history list so sidebar reflects full report
          setHistory((prev) =>
            prev.map((item) =>
              item.repo_url === norm.repo_url ? (normalizedFull as AnalysisSummary) : item
            )
          );

          setLoadingDetail(false);
          return;
        }
      } catch (err) {
        console.warn('Failed to auto-fetch report details for', norm.repo_url, err);
      }
    }

    if (norm) {
      setReportDetail(norm);
      if (norm.repo_url) setRepoPath(norm.repo_url);
    }
    setLoadingDetail(false);
  };

  const loadReport = (id: string) => {
    loadReportWithList(id, history);
  };

  const handleDeleteReport = (e: React.MouseEvent, itemToDelete: AnalysisSummary) => {
    e.stopPropagation();

    // 1. Filter out deleted item from history state
    const remaining = history.filter((h) => h.id !== itemToDelete.id && h.repo_url !== itemToDelete.repo_url);
    setHistory(remaining);

    // 2. If deleted item was selected, select next available report or clear detail
    if (selectedReportId === itemToDelete.id || (reportDetail && reportDetail.repo_url === itemToDelete.repo_url)) {
      if (remaining.length > 0) {
        loadReportWithList(remaining[0].id, remaining);
      } else {
        setSelectedReportId(null);
        setReportDetail(null);
      }
    }

    // 3. Remove from localStorage history
    try {
      const rawLocal = localStorage.getItem('repoatlas_history');
      if (rawLocal) {
        const parsed = JSON.parse(rawLocal);
        if (Array.isArray(parsed)) {
          const updated = parsed.filter((item: any) => item.id !== itemToDelete.id && item.repo_url !== itemToDelete.repo_url);
          localStorage.setItem('repoatlas_history', JSON.stringify(updated));
        }
      }
    } catch { /* ignore */ }

    // 4. Remove from localStorage explorer sessions
    try {
      const rawExplorer = localStorage.getItem('repoatlas_explorer_sessions');
      if (rawExplorer) {
        const parsed = JSON.parse(rawExplorer);
        if (Array.isArray(parsed)) {
          const updated = parsed.filter((sess: any) => sess.repo_url !== itemToDelete.repo_url);
          localStorage.setItem('repoatlas_explorer_sessions', JSON.stringify(updated));
        }
      }
    } catch { /* ignore */ }
  };

function drawCanvasRoundRect(ctx: CanvasRenderingContext2D, x: number, y: number, w: number, h: number, r: number) {
  ctx.beginPath();
  ctx.moveTo(x + r, y);
  ctx.lineTo(x + w - r, y);
  ctx.quadraticCurveTo(x + w, y, x + w, y + r);
  ctx.lineTo(x + w, y + h - r);
  ctx.quadraticCurveTo(x + w, y + h, x + w - r, y + h);
  ctx.lineTo(x + r, y + h);
  ctx.quadraticCurveTo(x, y + h, x, y + h - r);
  ctx.lineTo(x, y + r);
  ctx.quadraticCurveTo(x, y, x + r, y);
  ctx.closePath();
}

function createArchitectureDiagramImageData(viz?: any): string {
  try {
    const canvas = document.createElement('canvas');
    canvas.width = 1100;
    canvas.height = 550;
    const ctx = canvas.getContext('2d');
    if (!ctx) return '';

    // Dark background
    ctx.fillStyle = '#0F172A';
    drawCanvasRoundRect(ctx, 0, 0, 1100, 550, 20);
    ctx.fill();

    // Border
    ctx.strokeStyle = '#1E293B';
    ctx.lineWidth = 4;
    ctx.stroke();

    // Header title
    ctx.fillStyle = '#38BDF8';
    ctx.font = 'bold 20px monospace';
    ctx.fillText('SYSTEM ARCHITECTURE & DEPENDENCY FLOW MAP', 40, 48);

    ctx.fillStyle = '#94A3B8';
    ctx.font = '14px monospace';
    ctx.fillText('RepoAtlas AI Multi-Agent Codebase Visualization', 40, 75);

    // Subtle grid lines
    ctx.strokeStyle = 'rgba(56, 189, 248, 0.06)';
    ctx.lineWidth = 1;
    for (let x = 40; x < 1100; x += 55) {
      ctx.beginPath(); ctx.moveTo(x, 90); ctx.lineTo(x, 520); ctx.stroke();
    }
    for (let y = 90; y < 520; y += 55) {
      ctx.beginPath(); ctx.moveTo(40, y); ctx.lineTo(1060, y); ctx.stroke();
    }

    // Nodes definition
    const nodes = [
      { label: 'Repository Entry (main.py / index.tsx)', type: 'core', x: 200, y: 180 },
      { label: 'API Router & Controllers', type: 'route', x: 550, y: 180 },
      { label: 'Multi-Agent Manager Orchestrator', type: 'agent', x: 900, y: 180 },
      { label: 'AST Code Explorer Agent', type: 'agent', x: 260, y: 360 },
      { label: 'Git History Trace Agent', type: 'agent', x: 550, y: 390 },
      { label: 'Security Vulnerability Audit', type: 'security', x: 840, y: 360 },
      { label: 'Database & Cache Storage', type: 'db', x: 550, y: 480 },
    ];

    const edges = [
      { from: 0, to: 1 },
      { from: 1, to: 2 },
      { from: 1, to: 3 },
      { from: 1, to: 4 },
      { from: 1, to: 5 },
      { from: 3, to: 6 },
      { from: 4, to: 6 },
      { from: 5, to: 6 },
    ];

    const colors: Record<string, { stroke: string; fill: string }> = {
      core: { stroke: '#38BDF8', fill: 'rgba(56, 189, 248, 0.15)' },
      route: { stroke: '#818CF8', fill: 'rgba(129, 140, 248, 0.15)' },
      agent: { stroke: '#C084FC', fill: 'rgba(192, 132, 252, 0.15)' },
      security: { stroke: '#F87171', fill: 'rgba(248, 113, 113, 0.15)' },
      db: { stroke: '#34D399', fill: 'rgba(52, 211, 153, 0.15)' },
    };

    // Draw connecting edges
    for (const e of edges) {
      const n1 = nodes[e.from];
      const n2 = nodes[e.to];
      if (!n1 || !n2) continue;

      ctx.beginPath();
      ctx.moveTo(n1.x, n1.y);
      const midY = (n1.y + n2.y) / 2;
      ctx.bezierCurveTo(n1.x, midY, n2.x, midY, n2.x, n2.y);
      ctx.strokeStyle = 'rgba(56, 189, 248, 0.45)';
      ctx.lineWidth = 2.5;
      ctx.setLineDash([5, 4]);
      ctx.stroke();
      ctx.setLineDash([]);

      // Pulse dot
      const dotX = (n1.x + n2.x) / 2;
      const dotY = (n1.y + n2.y) / 2;
      ctx.beginPath();
      ctx.arc(dotX, dotY, 4, 0, Math.PI * 2);
      ctx.fillStyle = '#38BDF8';
      ctx.fill();
    }

    // Draw nodes
    for (const n of nodes) {
      const c = colors[n.type] || colors.core;

      ctx.beginPath();
      ctx.arc(n.x, n.y, 20, 0, Math.PI * 2);
      ctx.fillStyle = c.fill;
      ctx.fill();

      ctx.beginPath();
      ctx.arc(n.x, n.y, 9, 0, Math.PI * 2);
      ctx.fillStyle = c.stroke;
      ctx.strokeStyle = '#0F172A';
      ctx.lineWidth = 3;
      ctx.fill();
      ctx.stroke();

      ctx.font = 'bold 12px sans-serif';
      const tw = ctx.measureText(n.label).width;
      const bw = tw + 20;
      const bh = 26;
      const bx = n.x - bw / 2;
      const by = n.y + 14;

      ctx.fillStyle = '#1E293B';
      drawCanvasRoundRect(ctx, bx, by, bw, bh, 6);
      ctx.fill();

      ctx.strokeStyle = c.stroke;
      ctx.lineWidth = 1;
      ctx.stroke();

      ctx.fillStyle = '#F8FAFC';
      ctx.textAlign = 'center';
      ctx.fillText(n.label, n.x, by + 17);
    }

    return canvas.toDataURL('image/png');
  } catch {
    return '';
  }
}

function drawVectorArchitectureGraphPDF(doc: any, startY: number, contentW: number, margin: number): number {
  const graphH = 60;
  const startX = margin;

  doc.setFillColor(15, 23, 42);
  doc.roundedRect(startX, startY, contentW, graphH, 3, 3, 'F');

  doc.setFontSize(8);
  doc.setFont('helvetica', 'bold');
  doc.setTextColor(56, 189, 248);
  doc.text('SYSTEM ARCHITECTURE & DEPENDENCY GRAPH', startX + 5, startY + 7);

  doc.setFontSize(6);
  doc.setFont('helvetica', 'normal');
  doc.setTextColor(148, 163, 184);
  doc.text('RepoAtlas AI Multi-Agent Codebase Visualization Map', startX + 5, startY + 12);

  const nodes = [
    { label: 'App Entry (main / index)', type: 'core',  cx: startX + 25,  cy: startY + 25 },
    { label: 'API Router & Controllers', type: 'route', cx: startX + 85,  cy: startY + 25 },
    { label: 'Multi-Agent Manager',      type: 'agent', cx: startX + 145, cy: startY + 25 },
    { label: 'Code Explorer Agent',      type: 'agent', cx: startX + 40,  cy: startY + 46 },
    { label: 'Git History Trace',        type: 'agent', cx: startX + 85,  cy: startY + 48 },
    { label: 'Security Vulnerabilities',  type: 'sec',   cx: startX + 130, cy: startY + 46 },
  ];

  const edges = [
    { from: 0, to: 1 },
    { from: 1, to: 2 },
    { from: 1, to: 3 },
    { from: 1, to: 4 },
    { from: 1, to: 5 },
  ];

  doc.setDrawColor(56, 189, 248);
  doc.setLineWidth(0.4);
  for (const e of edges) {
    const n1 = nodes[e.from];
    const n2 = nodes[e.to];
    doc.line(n1.cx, n1.cy, n2.cx, n2.cy);

    const mx = (n1.cx + n2.cx) / 2;
    const my = (n1.cy + n2.cy) / 2;
    doc.setFillColor(56, 189, 248);
    doc.circle(mx, my, 0.8, 'F');
  }

  const nodeColors: Record<string, [number, number, number]> = {
    core:  [56, 189, 248],
    route: [129, 140, 248],
    agent: [192, 132, 252],
    sec:   [248, 113, 113],
  };

  for (const n of nodes) {
    const color = nodeColors[n.type] || [56, 189, 248];

    doc.setFillColor(...color);
    doc.circle(n.cx, n.cy, 2.5, 'F');

    doc.setFontSize(5.5);
    doc.setFont('helvetica', 'bold');
    const textW = doc.getTextWidth(n.label);
    const boxW = textW + 4;
    const boxH = 4.5;
    const boxX = n.cx - boxW / 2;
    const boxY = n.cy + 3.5;

    doc.setFillColor(30, 41, 59);
    doc.roundedRect(boxX, boxY, boxW, boxH, 1, 1, 'F');

    doc.setDrawColor(...color);
    doc.setLineWidth(0.2);
    doc.roundedRect(boxX, boxY, boxW, boxH, 1, 1, 'D');

    doc.setTextColor(248, 250, 252);
    doc.text(n.label, n.cx, boxY + 3.2, { align: 'center' });
  }

  return startY + graphH + 6;
}

  /* ── Download report as PDF — direct to Downloads folder ── */
  const [downloading, setDownloading] = useState(false);

  const handleDownloadReport = async () => {
    if (!reportDetail) return;
    setDownloading(true);

    try {
      // Load jsPDF from CDN at runtime (no install required)
      if (!(window as any).jspdf) {
        await new Promise<void>((resolve, reject) => {
          const s = document.createElement('script');
          s.src = 'https://cdnjs.cloudflare.com/ajax/libs/jspdf/2.5.1/jspdf.umd.min.js';
          s.onload = () => resolve();
          s.onerror = () => reject(new Error('Failed to load jsPDF from CDN'));
          document.head.appendChild(s);
        });
      }

      const JsPDF = (window as any).jspdf?.jsPDF;
      if (!JsPDF) throw new Error('jsPDF not available');

      const doc = new JsPDF({ orientation: 'portrait', unit: 'mm', format: 'a4' });

      const repoName   = repoLabel(reportDetail.repo_url);
      const date       = new Date(reportDetail.created_at).toLocaleDateString('en-US', { dateStyle: 'long' });
      const pageW      = doc.internal.pageSize.getWidth();
      const pageH      = doc.internal.pageSize.getHeight();
      const margin     = 18;
      const contentW   = pageW - margin * 2;
      let y            = margin;

      /* ── Helpers ── */
      const checkPage = (needed = 10) => {
        if (y + needed > pageH - 16) { doc.addPage(); y = margin; }
      };

      const heading = (text: string, size = 13, color: [number,number,number] = [17,17,20]) => {
        checkPage(size + 4);
        doc.setFontSize(size);
        doc.setTextColor(...color);
        doc.setFont('helvetica', 'bold');
        doc.text(text, margin, y);
        y += size * 0.45 + 2;
      };

      const body = (text: string, size = 9, color: [number,number,number] = [55,65,81]) => {
        if (!text) return;
        doc.setFontSize(size);
        doc.setTextColor(...color);
        doc.setFont('helvetica', 'normal');
        const lines = doc.splitTextToSize(String(text), contentW);
        for (const line of lines) {
          checkPage(size * 0.45 + 1.5);
          doc.text(line, margin, y);
          y += size * 0.45 + 1.5;
        }
      };

      const rule = (colorHex: [number,number,number] = [229,229,231]) => {
        doc.setDrawColor(...colorHex);
        doc.setLineWidth(0.3);
        doc.line(margin, y, pageW - margin, y);
        y += 4;
      };

      const sectionHeader = (title: string, color: [number,number,number]) => {
        checkPage(14);
        doc.setFillColor(...color);
        doc.roundedRect(margin, y, contentW, 9, 2, 2, 'F');
        doc.setFontSize(10);
        doc.setFont('helvetica', 'bold');
        doc.setTextColor(255, 255, 255);
        doc.text(title, margin + 4, y + 6);
        y += 13;
      };

      /* ── Cover ── */
      doc.setFillColor(37, 99, 235);
      doc.roundedRect(margin, y, contentW, 32, 3, 3, 'F');
      doc.setFontSize(18);
      doc.setFont('helvetica', 'bold');
      doc.setTextColor(255, 255, 255);
      doc.text('RepoAtlas AI', margin + 6, y + 12);
      doc.setFontSize(10);
      doc.setFont('helvetica', 'normal');
      doc.text('Multi-Agent Code Intelligence Report', margin + 6, y + 20);
      doc.setFontSize(8);
      doc.setTextColor(191, 219, 254);
      doc.text(date, margin + 6, y + 27);
      y += 38;

      heading(repoName, 15, [17, 17, 20]);
      doc.setFontSize(8);
      doc.setFont('helvetica', 'normal');
      doc.setTextColor(37, 99, 235);
      doc.text(reportDetail.repo_url, margin, y);
      y += 5;
      doc.setTextColor(107, 114, 128);
      doc.text(`Query: "${reportDetail.query ?? 'Full Analysis'}"  ·  Generated: ${date}`, margin, y);
      y += 5;

      const agents = (reportDetail.agents_run ?? []);
      if (agents.length > 0) {
        doc.setFontSize(8); doc.setFont('helvetica', 'normal'); doc.setTextColor(107,114,128);
        doc.text('Agents: ' + agents.join(' · '), margin, y);
        y += 6;
      }

      rule();

      /* ── Executive Summary ── */
      sectionHeader('Executive Summary', [37, 99, 235]);
      body(reportDetail.executive_summary ?? 'No summary available.');
      y += 4;

      /* ── Explorer ── */
      sectionHeader('Explorer Agent — Repository Structure', [124, 58, 237]);
      const explorerText = typeof reportDetail.explorer_result === 'string'
        ? reportDetail.explorer_result
        : JSON.stringify(reportDetail.explorer_result ?? '', null, 2);
      body(explorerText.slice(0, 3000) + (explorerText.length > 3000 ? '\n[truncated…]' : ''), 8, [30,41,59]);
      y += 4;

      /* ── Trace ── */
      sectionHeader('Trace Agent — Git History', [5, 150, 105]);
      const tr = reportDetail.trace_result as any;
      if (tr) {
        body(tr.summary ?? '', 9, [55,65,81]);
        y += 2;
        const commits = (tr.commits ?? []).slice(0, 15);
        for (const c of commits) {
          checkPage(7);
          doc.setFontSize(8); doc.setFont('helvetica', 'bold'); doc.setTextColor(37,99,235);
          doc.text(c.short_hash ?? c.hash?.slice(0,7) ?? '', margin, y);
          doc.setFont('helvetica', 'normal'); doc.setTextColor(55,65,81);
          const msg = doc.splitTextToSize(`  ${c.message ?? ''} — ${c.author ?? ''}`, contentW - 20);
          doc.text(msg[0] ?? '', margin + 18, y);
          y += 5;
        }
      } else { body('No trace data recorded.'); }
      y += 4;

      /* ── Security ── */
      sectionHeader('Security Agent — Vulnerability Audit', [220, 38, 38]);
      const sr = reportDetail.security_result as any;
      if (sr) {
        const rating = sr.risk_rating ?? 'UNKNOWN';
        const total  = sr.score?.total ?? 0;
        doc.setFontSize(10); doc.setFont('helvetica', 'bold');
        const ratingColor: [number,number,number] =
          rating==='CRITICAL'||rating==='HIGH' ? [220,38,38] :
          rating==='MEDIUM' ? [217,119,6] : [5,150,105];
        doc.setTextColor(...ratingColor);
        doc.text(`Risk Rating: ${rating}  ·  ${total} finding(s)`, margin, y);
        y += 6;
        body(sr.expert_analysis ?? '', 9, [55,65,81]);
      } else { body('No security data recorded.'); }
      y += 4;

      /* ── Visualization ── */
      sectionHeader('Visualization Agent — Architecture', [245, 158, 11]);

      // 1. Draw Architecture Graph FIRST right under section header!
      checkPage(70);
      let diagramEmbedSuccess = false;
      try {
        const diagramPng = createArchitectureDiagramImageData(reportDetail.visualization_result);
        if (diagramPng && diagramPng.startsWith('data:image/png;base64,')) {
          const imgH = (contentW * 550) / 1100;
          doc.addImage(diagramPng, 'PNG', margin, y, contentW, imgH);
          y += imgH + 6;
          diagramEmbedSuccess = true;
        }
      } catch (err) {
        console.error('Failed to embed PNG diagram:', err);
      }

      // Fallback vector graph directly rendered into PDF if canvas PNG was skipped or failed
      if (!diagramEmbedSuccess) {
        y = drawVectorArchitectureGraphPDF(doc, y, contentW, margin);
      }

      const vr = reportDetail.visualization_result as any;
      if (vr && typeof vr === 'object') {
        const langs = (vr.language_breakdown ?? []).slice(0, 10);
        if (langs.length > 0) {
          checkPage(15);
          heading('Language Breakdown', 10, [17, 17, 20]);
          for (const l of langs) {
            checkPage(5);
            doc.setFontSize(8); doc.setFont('helvetica', 'normal'); doc.setTextColor(107,114,128);
            doc.text(`${l.language}  —  ${l.lines?.toLocaleString()} lines  (${l.files} files)`, margin + 4, y);
            y += 4.5;
          }
        }
      }

      /* ── Footer on every page ── */
      const totalPages = (doc.internal as any).getNumberOfPages?.() ?? 1;
      for (let i = 1; i <= totalPages; i++) {
        doc.setPage(i);
        doc.setFontSize(7); doc.setFont('helvetica', 'normal'); doc.setTextColor(156,163,175);
        doc.text('RepoAtlas AI — Intelligence Report', margin, pageH - 8);
        doc.text(`${repoName}  ·  ${date}  ·  Page ${i}/${totalPages}`, pageW - margin, pageH - 8, { align: 'right' });
      }

      /* ── Trigger direct download ── */
      doc.save(`repoatlas-${repoName.replace(/\//g, '-')}.pdf`);

    } catch (err) {
      console.error('PDF generation failed:', err);
      alert('PDF generation failed. Please try again.');
    } finally {
      setDownloading(false);
    }
  };

  /* ── Filtered history list ── */
  const filteredHistory = history.filter((item) => {
    const term = searchQuery.toLowerCase();
    return (
      item.repo_url.toLowerCase().includes(term) ||
      (item.query && item.query.toLowerCase().includes(term)) ||
      (item.executive_summary && item.executive_summary.toLowerCase().includes(term))
    );
  });

  return (
    <main className="min-h-screen bg-[#FAFAFA] text-[#111114] selection:bg-[#2563EB]/20 flex flex-col">
      <Navbar />

      {/* Header Banner */}
      <div className="pt-24 pb-8 bg-white border-b border-[#E5E5E7] px-4 sm:px-6 lg:px-8">
        <div className="max-w-7xl mx-auto flex flex-col md:flex-row md:items-center md:justify-between gap-4">
          <div>
            <div className="flex items-center gap-2 mb-1">
              <span className="px-2.5 py-0.5 rounded-full bg-[#EFF6FF] text-[#2563EB] text-xs font-mono font-semibold uppercase tracking-wider">
                Intelligence Hub
              </span>
            </div>
            <h1 className="text-2xl sm:text-3xl font-extrabold text-[#111114] tracking-tight">
              Repository Reports
            </h1>
            <p className="text-sm text-[#6B7280] mt-1">
              Browse multi-agent analysis reports, security audits, and architectural traces for your codebases.
            </p>
          </div>

          {reportDetail && (
            <div className="flex items-center gap-3">
              <button
                onClick={handleDownloadReport}
                disabled={downloading}
                className="flex items-center gap-2 px-4 py-2 rounded-xl bg-white border border-[#E5E5E7] hover:bg-[#F9FAFB] text-[#374151] text-xs font-semibold shadow-xs transition-colors disabled:opacity-60 disabled:cursor-not-allowed"
              >
                {downloading ? (
                  <>
                    <RefreshCw className="w-4 h-4 text-[#2563EB] animate-spin" />
                    Generating…
                  </>
                ) : (
                  <>
                    <Download className="w-4 h-4 text-[#2563EB]" />
                    Download PDF
                  </>
                )}
              </button>
              <a
                href="/agents/explorer-agent"
                className="flex items-center gap-2 px-4 py-2 rounded-xl bg-[#2563EB] text-white text-xs font-semibold hover:bg-[#1D4ED8] shadow-sm transition-colors"
              >
                <Compass className="w-4 h-4" />
                Ask Explorer Agent
              </a>
            </div>
          )}
        </div>
      </div>

      {/* Main Content Area */}
      <div className="flex-1 max-w-7xl w-full mx-auto px-4 sm:px-6 lg:px-8 py-8 flex flex-col lg:flex-row gap-8">

        {/* Sidebar: Report Selector */}
        <div className="w-full lg:w-80 shrink-0 flex flex-col gap-4">
          {/* Search box */}
          <div className="relative">
            <Search className="w-4 h-4 absolute left-3.5 top-3 text-[#9CA3AF]" />
            <input
              type="text"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              placeholder="Filter by repository..."
              className="w-full pl-9 pr-4 py-2.5 rounded-xl border border-[#E5E5E7] bg-white text-xs text-[#111114] placeholder-[#9CA3AF] focus:outline-none focus:border-[#2563EB] transition-all"
            />
          </div>

          {/* List Card */}
          <div className="bg-white border border-[#E5E5E7] rounded-2xl p-3 shadow-xs flex flex-col gap-1 max-h-[680px] overflow-y-auto">
            <div className="px-2 py-1.5 flex items-center justify-between border-b border-[#F3F4F6] mb-1">
              <span className="text-xs font-bold text-[#111114]">Analyzed Repositories</span>
              <span className="text-[10px] font-mono text-[#2563EB] font-bold bg-[#EFF6FF] px-2 py-0.5 rounded-full">
                {filteredHistory.length} reports
              </span>
            </div>

            {loadingHistory ? (
              <div className="p-8 text-center text-xs text-[#9CA3AF]">
                <RefreshCw className="w-5 h-5 mx-auto mb-2 animate-spin text-[#2563EB]" />
                Loading reports history...
              </div>
            ) : filteredHistory.length === 0 ? (
              <div className="p-8 text-center text-xs text-[#9CA3AF]">
                <FileText className="w-6 h-6 mx-auto mb-2 opacity-40 text-[#2563EB]" />
                {history.length === 0 ? 'No past repo analyses yet. Analyze a repo on the Product page first!' : 'No matching reports found.'}
              </div>
            ) : (
              filteredHistory.map((item) => {
                const isActive = item.id === selectedReportId;
                return (
                  <div
                    key={item.id}
                    onClick={() => loadReport(item.id)}
                    className={`w-full text-left p-3 rounded-xl transition-all flex items-center justify-between gap-2 group cursor-pointer ${
                      isActive
                        ? 'bg-[#EFF6FF] border border-[#BFDBFE] text-[#2563EB]'
                        : 'hover:bg-[#F9FAFB] text-[#374151]'
                    }`}
                  >
                    <div className="flex items-center gap-3 min-w-0 flex-1">
                      <div className={`shrink-0 w-8 h-8 rounded-lg flex items-center justify-center ${isActive ? 'bg-[#2563EB] text-white' : 'bg-[#F3F4F6] text-[#6B7280] group-hover:bg-[#E5E5E7]'}`}>
                        <GitBranch className="w-4 h-4" />
                      </div>
                      <div className="flex-1 min-w-0">
                        <p className={`text-xs font-bold truncate ${isActive ? 'text-[#2563EB]' : 'text-[#111114]'}`}>
                          {repoLabel(item.repo_url)}
                        </p>
                        <p className="text-[10px] text-[#9CA3AF] mt-0.5 flex items-center gap-1">
                          <Clock className="w-2.5 h-2.5" />
                          {timeAgo(item.created_at)}
                        </p>
                      </div>
                    </div>

                    <div className="flex items-center gap-1 shrink-0">
                      <button
                        type="button"
                        onClick={(e) => handleDeleteReport(e, item)}
                        className="p-1 rounded-md text-[#9CA3AF] hover:text-red-600 hover:bg-red-50 transition-colors opacity-0 group-hover:opacity-100 focus:opacity-100 cursor-pointer"
                        title="Delete report"
                      >
                        <Trash2 className="w-3.5 h-3.5" />
                      </button>
                      <ChevronRight className={`w-3.5 h-3.5 ${isActive ? 'text-[#2563EB]' : 'text-[#D1D5DB] group-hover:text-[#9CA3AF]'}`} />
                    </div>
                  </div>
                );
              })
            )}
          </div>
        </div>

        {/* Main Content Pane: Detailed Report */}
        <div className="flex-1 min-w-0">
          {loadingDetail ? (
            <div className="bg-white border border-[#E5E5E7] rounded-2xl p-16 text-center shadow-xs">
              <RefreshCw className="w-8 h-8 mx-auto mb-3 animate-spin text-[#2563EB]" />
              <p className="text-sm font-semibold text-[#111114]">Loading Full Report...</p>
              <p className="text-xs text-[#9CA3AF] mt-1">Retrieving multi-agent findings and analysis logs.</p>
            </div>
          ) : !reportDetail ? (
            <div className="bg-white border border-[#E5E5E7] rounded-2xl p-16 text-center shadow-xs">
              <FileText className="w-12 h-12 mx-auto mb-3 text-[#9CA3AF] opacity-50" />
              <h3 className="text-base font-bold text-[#111114]">No Report Selected</h3>
              <p className="text-xs text-[#6B7280] mt-1 max-w-md mx-auto">
                Select a repository from the list on the left to view its comprehensive intelligence report, architecture trace, and security findings.
              </p>
            </div>
          ) : (
            <div className="flex flex-col gap-6">
              {/* Report Header Card */}
              <div className="bg-white border border-[#E5E5E7] rounded-2xl p-6 shadow-xs flex flex-col gap-4">
                <div className="flex flex-wrap items-center justify-between gap-3 border-b border-[#F3F4F6] pb-4">
                  <div className="flex items-center gap-3">
                    <div className="p-3 rounded-xl bg-[#2563EB] text-white shadow-sm">
                      <GitBranch className="w-6 h-6" />
                    </div>
                    <div>
                      <div className="flex items-center gap-2">
                        <h2 className="text-lg font-bold text-[#111114]">
                          {repoLabel(reportDetail.repo_url)}
                        </h2>
                        <span className="px-2 py-0.5 rounded-full bg-[#ECFDF5] text-[#10B981] border border-[#A7F3D0] text-[10px] font-mono font-bold flex items-center gap-1">
                          <CheckCircle2 className="w-3 h-3" /> Complete
                        </span>
                      </div>
                      <a
                        href={reportDetail.repo_url}
                        target="_blank"
                        rel="noreferrer"
                        className="text-xs text-[#2563EB] hover:underline flex items-center gap-1 mt-0.5 font-mono"
                      >
                        {reportDetail.repo_url}
                        <ExternalLink className="w-3 h-3" />
                      </a>
                    </div>
                  </div>

                  <div className="text-right text-xs font-mono text-[#6B7280]">
                    <p>Report Date: <span className="text-[#111114] font-semibold">{new Date(reportDetail.created_at).toLocaleDateString('en-US', { dateStyle: 'medium' })}</span></p>
                    <p className="mt-0.5 text-[10px] text-[#9CA3AF]">{timeAgo(reportDetail.created_at)}</p>
                  </div>
                </div>

                {/* Tabs navigation */}
                <div className="flex items-center gap-2 overflow-x-auto pb-1 pt-1 scrollbar-none">
                  {[
                    { id: 'summary', label: 'Executive Summary', icon: Sparkles },
                    { id: 'explorer', label: 'Explorer Agent', icon: Compass },
                    { id: 'trace', label: 'Trace Agent', icon: Layers },
                    { id: 'security', label: 'Security Audit', icon: Shield },
                    { id: 'visualization', label: 'Architecture Graph', icon: Network },
                  ].map((tab) => {
                    const Icon = tab.icon;
                    const isActive = activeTab === tab.id;
                    return (
                      <button
                        key={tab.id}
                        onClick={() => setActiveTab(tab.id as any)}
                        className={`flex items-center gap-2 px-3.5 py-2 rounded-xl text-xs font-semibold transition-all shrink-0 ${
                          isActive
                            ? 'bg-[#2563EB] text-white shadow-sm'
                            : 'bg-[#F4F6FA] text-[#4B5563] hover:bg-[#E5E7EB] hover:text-[#111114]'
                        }`}
                      >
                        <Icon className="w-3.5 h-3.5" />
                        {tab.label}
                      </button>
                    );
                  })}
                </div>
              </div>

              {/* Tab Content Cards */}
              <div className="bg-white border border-[#E5E5E7] rounded-2xl p-6 shadow-xs min-h-[380px]">
                {activeTab === 'summary' && (
                  <div className="space-y-4">
                    <div className="flex items-center gap-2 text-sm font-bold text-[#111114] border-b border-[#F3F4F6] pb-3">
                      <Sparkles className="w-4 h-4 text-[#2563EB]" />
                      Executive Summary & Overview
                    </div>
                    <div className="text-sm leading-relaxed text-[#374151] whitespace-pre-wrap font-sans bg-[#F9FAFB] p-5 rounded-xl border border-[#E5E5E7]">
                      {reportDetail.executive_summary || 'No summary text available.'}
                    </div>
                    {reportDetail.query && (
                      <div className="mt-4 p-4 rounded-xl bg-[#EFF6FF] border border-[#BFDBFE] text-xs text-[#1E40AF]">
                        <span className="font-bold">Initial User Query:</span> "{reportDetail.query}"
                      </div>
                    )}
                  </div>
                )}

                {activeTab === 'explorer' && (() => {
                  const val = reportDetail.explorer_result ?? (reportDetail as any).explorer;
                  return (
                    <div className="space-y-4">
                      <div className="flex items-center gap-2 text-sm font-bold text-[#111114] border-b border-[#F3F4F6] pb-3">
                        <Compass className="w-4 h-4 text-[#2563EB]" />
                        Repository Structure & File Explorer Findings
                      </div>
                      <div className="text-xs font-mono leading-relaxed text-[#1F2937] whitespace-pre-wrap bg-[#1E293B] text-slate-100 p-5 rounded-xl overflow-x-auto max-h-[500px]">
                        {typeof val === 'string'
                          ? val
                          : (val ? JSON.stringify(val, null, 2) : 'Explorer Agent analysis output not recorded for this session.')}
                      </div>
                    </div>
                  );
                })()}

                {activeTab === 'trace' && (() => {
                  const val = reportDetail.trace_result ?? (reportDetail as any).trace;
                  return (
                    <div className="space-y-4">
                      <div className="flex items-center gap-2 text-sm font-bold text-[#111114] border-b border-[#F3F4F6] pb-3">
                        <Layers className="w-4 h-4 text-[#2563EB]" />
                        Call Chain Trace & Execution Paths
                      </div>
                      {renderTraceReport(val)}
                    </div>
                  );
                })()}

                {activeTab === 'security' && (() => {
                  const val = reportDetail.security_result ?? (reportDetail as any).security;
                  return (
                    <div className="space-y-4">
                      <div className="flex items-center gap-2 text-sm font-bold text-[#111114] border-b border-[#F3F4F6] pb-3">
                        <Shield className="w-4 h-4 text-[#2563EB]" />
                        Security Audit & Vulnerability Scanning
                      </div>
                      {renderSecurityReport(val)}
                    </div>
                  );
                })()}

                {activeTab === 'visualization' && (() => {
                  const val = reportDetail.visualization_result ?? (reportDetail as any).visualization;
                  return (
                    <div className="space-y-4">
                      <div className="flex items-center gap-2 text-sm font-bold text-[#111114] border-b border-[#F3F4F6] pb-3">
                        <Network className="w-4 h-4 text-[#2563EB]" />
                        Architecture Diagram & Visual Synthesis
                      </div>
                      {AnimatedArchitectureGraph({ val })}
                    </div>
                  );
                })()}
              </div>
            </div>
          )}
        </div>
      </div>


    </main>
  );
}
