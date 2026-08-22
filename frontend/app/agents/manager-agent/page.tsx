'use client';

import React, { useEffect, useState } from 'react';
import { motion } from 'framer-motion';
import { CheckCircle, XCircle, Loader2, Bot, Compass, Search, Brain, Palette, ExternalLink, RefreshCw } from 'lucide-react';
import { Navbar } from '../../../components/Navbar';

import type { ManagerResponse } from '../../../lib/api';
import { clearSession, clearLocalSession } from '../../../lib/api';
import { useRepo } from '../../../lib/repoContext';

// Declare custom element for TypeScript
declare global {
  namespace JSX {
    interface IntrinsicElements {
      'spline-viewer': React.DetailedHTMLProps<
        React.HTMLAttributes<HTMLElement> & {
          url?: string;
          'loading-anim-type'?: string;
        },
        HTMLElement
      >;
    }
  }
}

const AGENT_META: Record<string, { label: string; icon: React.ElementType; href: string }> = {
  explorer:      { label: 'Explorer Agent',      icon: Compass, href: '/agents/explorer-agent' },
  trace:         { label: 'Trace Agent',          icon: Search,  href: '/agents/trace-agent' },
  security:      { label: 'Security Agent',       icon: Brain,   href: '/agents/security-agent' },
  visualization: { label: 'Visualization Agent',  icon: Palette, href: '/agents/visualization-agent' },
};

export default function ManagerAgentPage() {
  const { analysisResult, repoPath } = useRepo();
  const [result, setResult] = useState<ManagerResponse | null>(null);
  const [repoUrl, setRepoUrl] = useState<string>('');
  const [splineReady, setSplineReady] = useState(false);

  const handleNewRepo = async () => {
    clearLocalSession();
    try { await clearSession(); } catch { /* backend may be offline */ }
    window.location.href = '/';
  };

  useEffect(() => {
    // Read analysis result immediately from context or storage — don't wait for Spline
    try {
      if (analysisResult) {
        setResult(analysisResult as ManagerResponse);
        if (analysisResult.repo_path) setRepoUrl(analysisResult.repo_path);
      } else {
        const raw = sessionStorage.getItem('repoatlas_result') || localStorage.getItem('repoatlas_result');
        const url = sessionStorage.getItem('repoatlas_url') || localStorage.getItem('repoatlas_url');
        if (raw) setResult(JSON.parse(raw) as ManagerResponse);
        if (url) setRepoUrl(url);
        else if (repoPath) setRepoUrl(repoPath);
      }
      if (repoPath) setRepoUrl(repoPath);
    } catch {
      if (repoPath) setRepoUrl(repoPath);
    }

    // Immediately load Spline viewer script for fast sub-second 3D robot rendering
    const existingScript = document.querySelector('script[src*="spline-viewer"]');
    if (!existingScript) {
      const script = document.createElement('script');
      script.type = 'module';
      script.src = 'https://unpkg.com/@splinetool/viewer@1.9.72/build/spline-viewer.js';
      script.onload = () => setSplineReady(true);
      document.head.appendChild(script);
    } else {
      setSplineReady(true);
    }

    // Hide Spline logo via shadow DOM
    const interval = setInterval(() => {
      const viewer = document.querySelector('spline-viewer');
      if (viewer && viewer.shadowRoot) {
        if (!viewer.shadowRoot.querySelector('#hide-logo-style')) {
          const style = document.createElement('style');
          style.id = 'hide-logo-style';
          style.textContent = `
            #logo, #spline-logo, a[href*="spline"], .watermark, [class*="logo"], [class*="watermark"] {
              display: none !important;
              visibility: hidden !important;
              opacity: 0 !important;
              pointer-events: none !important;
            }
          `;
          viewer.shadowRoot.appendChild(style);
        }
      }
    }, 30);

    return () => { clearInterval(interval); };
  }, [repoPath]);

  return (
    <main className="min-h-screen bg-[#FAFAFA] text-[#111114] selection:bg-[#2563EB]/20 selection:text-[#2563EB] overflow-x-hidden flex flex-col font-sans">
      <Navbar />

      {/* ── Full-Bleed Hero Section Container ── */}
      <div className="flex-1 max-w-7xl mx-auto w-full px-4 sm:px-6 lg:px-8 pt-20 sm:pt-28 pb-16 flex flex-col items-center">
        <motion.section
          initial={{ opacity: 0, y: 15 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.35 }}
          className="w-full flex flex-col items-center text-center space-y-6"
        >
          {/* Centered Header Block */}
          <div className="space-y-1">
            <h1 className="text-3xl sm:text-5xl font-extrabold text-[#111114] tracking-tight">
              Manager Agent
            </h1>
          </div>

          {/* Unboxed Full-Screen 3D Robot Visual */}
          <div className="w-full flex items-center justify-center relative pt-2">
            <div className="absolute w-[300px] sm:w-[500px] h-[300px] sm:h-[500px] rounded-full bg-[#2563EB]/15 blur-3xl pointer-events-none animate-pulse" />
            <div className="relative z-10 w-full max-w-6xl h-[300px] sm:h-[500px] md:h-[600px] lg:h-[700px] overflow-hidden bg-transparent flex items-center justify-center">
              {splineReady ? (
              <spline-viewer
                url="https://prod.spline.design/a5tBEkRdYTDjQ8t0/scene.splinecode"
                loading-anim-type="none"
                style={{
                  position: 'absolute',
                  top: '20px',
                  left: '0px',
                  width: '100%',
                  height: 'calc(100% + 140px)',
                }}
              />
              ) : (
                <div className="flex flex-col items-center justify-center gap-3 text-[#9CA3AF]">
                  <div className="w-10 h-10 border-4 border-[#2563EB]/20 border-t-[#2563EB] rounded-full animate-spin" />
                  <span className="text-xs font-mono">Loading 3D scene…</span>
                </div>
              )}
            </div>
          </div>

          {/* ── Real Results Panel (shown only when result is available) ── */}
          {result && (
            <motion.div
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.45, delay: 0.1 }}
              className="w-full max-w-4xl space-y-4 sm:space-y-5 text-left"
            >
              {/* Repo + status header */}
              <div className="flex items-center justify-between flex-wrap gap-2 sm:gap-3 px-1">
                <div className="flex items-center gap-2 min-w-0">
                  <Bot className="w-4 h-4 sm:w-5 sm:h-5 text-[#2563EB] shrink-0" />
                  <span className="font-mono text-xs sm:text-sm text-[#374151] truncate max-w-[200px] sm:max-w-xs">{repoUrl}</span>
                </div>
                <div className="flex items-center gap-2 flex-wrap">
                  {result.agents_run.map((a) => {
                    const ok = result.statuses[a] === 'success';
                    return (
                      <span
                        key={a}
                        className={`flex items-center gap-1 px-2.5 py-1 rounded-full text-[10px] font-mono font-bold border ${
                          ok
                            ? 'bg-green-50 text-green-700 border-green-200'
                            : 'bg-red-50 text-red-600 border-red-200'
                        }`}
                      >
                        {ok ? <CheckCircle className="w-3 h-3" /> : <XCircle className="w-3 h-3" />}
                        {a}
                      </span>
                    );
                  })}
                  <button
                    onClick={handleNewRepo}
                    className="flex items-center gap-1.5 px-2.5 py-1 rounded-full text-[10px] font-mono font-bold border border-[#2563EB]/30 bg-[#2563EB]/5 text-[#2563EB] hover:bg-[#2563EB] hover:text-white transition-colors"
                  >
                    <RefreshCw className="w-3 h-3" />
                    New Repo
                  </button>
                </div>
              </div>

              {/* Executive Summary */}
              <div className="p-5 rounded-2xl bg-white border border-[#E5E5E7] shadow-sm space-y-2">
                <span className="text-[10px] font-mono font-bold text-[#2563EB] uppercase tracking-wider block">
                  Executive Summary
                </span>
                <p className="text-sm text-[#374151] leading-relaxed font-sans whitespace-pre-wrap">
                  {result.executive_summary}
                </p>
              </div>

              {/* Explorer result */}
              {result.explorer && (
                <div className="p-5 rounded-2xl bg-white border border-[#E5E5E7] shadow-sm space-y-2">
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-2">
                      <Compass className="w-4 h-4 text-[#2563EB]" />
                      <span className="text-[10px] font-mono font-bold text-[#2563EB] uppercase tracking-wider">
                        Explorer Agent
                      </span>
                    </div>
                    <a href="/agents/explorer-agent" className="text-[10px] font-mono text-[#9CA3AF] hover:text-[#2563EB] flex items-center gap-1 transition-colors">
                      View full <ExternalLink className="w-3 h-3" />
                    </a>
                  </div>
                  <p className="text-sm text-[#374151] leading-relaxed font-sans whitespace-pre-wrap">
                    {typeof result.explorer === 'string' ? result.explorer : JSON.stringify(result.explorer, null, 2)}
                  </p>
                </div>
              )}

              {/* Trace result */}
              {result.trace && (
                <div className="p-5 rounded-2xl bg-white border border-[#E5E5E7] shadow-sm space-y-2">
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-2">
                      <Search className="w-4 h-4 text-[#2563EB]" />
                      <span className="text-[10px] font-mono font-bold text-[#2563EB] uppercase tracking-wider">
                        Trace Agent
                      </span>
                    </div>
                    <a href="/agents/trace-agent" className="text-[10px] font-mono text-[#9CA3AF] hover:text-[#2563EB] flex items-center gap-1 transition-colors">
                      View full <ExternalLink className="w-3 h-3" />
                    </a>
                  </div>
                  <p className="text-sm text-[#374151] leading-relaxed font-sans whitespace-pre-wrap">
                    {result.trace.summary}
                  </p>
                  {result.trace.contributors?.length > 0 && (
                    <div className="flex flex-wrap gap-2 pt-1">
                      {result.trace.contributors.slice(0, 6).map((c, i) => (
                        <span key={i} className="px-2 py-0.5 rounded-full bg-[#FAFAFA] border border-[#E5E5E7] text-[10px] font-mono text-[#6B7280]">
                          {c.author} · {c.count}
                        </span>
                      ))}
                    </div>
                  )}
                </div>
              )}

              {/* Security result */}
              {result.security && (
                <div className="p-5 rounded-2xl bg-white border border-[#E5E5E7] shadow-sm space-y-2">
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-2">
                      <Brain className="w-4 h-4 text-[#2563EB]" />
                      <span className="text-[10px] font-mono font-bold text-[#2563EB] uppercase tracking-wider">
                        Security Agent
                      </span>
                    </div>
                    <a href="/agents/security-agent" className="text-[10px] font-mono text-[#9CA3AF] hover:text-[#2563EB] flex items-center gap-1 transition-colors">
                      View full <ExternalLink className="w-3 h-3" />
                    </a>
                  </div>
                  <div className="flex items-center gap-3">
                    <span className={`px-3 py-1 rounded-full text-xs font-mono font-bold border ${
                      result.security.risk_rating === 'CRITICAL' ? 'bg-red-50 text-red-600 border-red-200' :
                      result.security.risk_rating === 'HIGH'     ? 'bg-orange-50 text-orange-600 border-orange-200' :
                      result.security.risk_rating === 'MEDIUM'   ? 'bg-yellow-50 text-yellow-600 border-yellow-200' :
                      result.security.risk_rating === 'LOW'      ? 'bg-blue-50 text-blue-600 border-blue-200' :
                                                                    'bg-green-50 text-green-600 border-green-200'
                    }`}>
                      {result.security.risk_rating}
                    </span>
                    <span className="text-xs font-mono text-[#6B7280]">
                      {result.security.score?.total ?? 0} finding(s)
                    </span>
                  </div>
                  <p className="text-sm text-[#374151] leading-relaxed font-sans whitespace-pre-wrap">
                    {result.security.expert_analysis}
                  </p>
                </div>
              )}

              {/* Visualization result */}
              {result.visualization && (
                <div className="p-5 rounded-2xl bg-white border border-[#E5E5E7] shadow-sm space-y-2">
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-2">
                      <Palette className="w-4 h-4 text-[#2563EB]" />
                      <span className="text-[10px] font-mono font-bold text-[#2563EB] uppercase tracking-wider">
                        Visualization Agent
                      </span>
                    </div>
                    <a href="/agents/visualization-agent" className="text-[10px] font-mono text-[#9CA3AF] hover:text-[#2563EB] flex items-center gap-1 transition-colors">
                      View full <ExternalLink className="w-3 h-3" />
                    </a>
                  </div>
                  <p className="text-sm text-[#374151] leading-relaxed font-sans whitespace-pre-wrap">
                    {result.visualization.narrative}
                  </p>
                  {result.visualization.language_breakdown?.length > 0 && (
                    <div className="flex flex-wrap gap-2 pt-1">
                      {result.visualization.language_breakdown.slice(0, 8).map((l, i) => (
                        <span
                          key={i}
                          className="flex items-center gap-1.5 px-2 py-0.5 rounded-full bg-[#FAFAFA] border border-[#E5E5E7] text-[10px] font-mono text-[#6B7280]"
                        >
                          <span className="w-2 h-2 rounded-full shrink-0" style={{ backgroundColor: l.color }} />
                          {l.language} · {l.lines.toLocaleString()} lines
                        </span>
                      ))}
                    </div>
                  )}
                </div>
              )}

              {/* Navigate back */}
              <div className="flex justify-center pt-2 pb-4">
                <button
                  onClick={handleNewRepo}
                  className="flex items-center gap-2 px-6 py-2.5 rounded-full text-sm font-semibold text-white bg-[#2563EB] hover:bg-[#1D4ED8] transition-colors"
                >
                  <RefreshCw className="w-4 h-4" />
                  Analyze another repo
                </button>
              </div>
            </motion.div>
          )}

          {/* Prompt when page opened without a result */}
          {!result && (
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              transition={{ delay: 0.4 }}
              className="text-center space-y-3"
            >
              <p className="text-sm font-mono text-[#9CA3AF]">No analysis loaded yet.</p>
              <button
                onClick={handleNewRepo}
                className="inline-flex items-center gap-2 px-5 py-2.5 rounded-full text-sm font-semibold text-white bg-[#2563EB] hover:bg-[#1D4ED8] transition-colors"
              >
                <Loader2 className="w-4 h-4" />
                Analyze a repo first
              </button>
            </motion.div>
          )}
        </motion.section>
      </div>


    </main>
  );
}
