'use client';

import React, { useState, useRef, useEffect } from 'react';
import { motion, useInView } from 'framer-motion';
import { Brain, Wrench, Copy, Check, Shield } from 'lucide-react';
import { Navbar } from '../../../components/Navbar';

import type { SecurityResult, SecurityFinding } from '../../../lib/api';
import { useRepo } from '../../../lib/repoContext';

const SEVERITY_STYLES: Record<string, string> = {
  critical: 'bg-red-50    text-red-600    border border-red-200',
  high:     'bg-orange-50 text-orange-600 border border-orange-200',
  medium:   'bg-yellow-50 text-yellow-600 border border-yellow-200',
  low:      'bg-green-50  text-green-600  border border-green-200',
  Critical: 'bg-red-50    text-red-600    border border-red-200',
  High:     'bg-orange-50 text-orange-600 border border-orange-200',
  Medium:   'bg-yellow-50 text-yellow-600 border border-yellow-200',
  Low:      'bg-green-50  text-green-600  border border-green-200',
};

const SEGMENT_COLORS: Record<string, string> = {
  secrets:           '#8B5CF6',
  vulnerabilities:   '#EF4444',
  sensitive_files:   '#F97316',
  dependencies:      '#EAB308',
  misconfigurations: '#3B82F6',
};

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

interface Segment { label: string; pct: number; color: string; catKey: string; }

function buildSegments(findings: Record<string, SecurityFinding[]> | null): Segment[] {
  if (!findings) return [{ label: 'Secure', pct: 100, color: '#22C55E', catKey: '' }];
  const cats = Object.entries(findings).filter(([, v]) => v.length > 0);
  if (cats.length === 0) return [{ label: 'Secure', pct: 100, color: '#22C55E', catKey: '' }];
  const total = cats.reduce((s, [, v]) => s + v.length, 0);
  const segs: Segment[] = cats.map(([key, items]) => ({
    label: key.replace(/_/g, ' '),
    pct: Math.round((items.length / total) * 100),
    color: SEGMENT_COLORS[key] ?? '#6B7280',
    catKey: key,
  }));
  const sum = segs.reduce((s, seg) => s + seg.pct, 0);
  if (sum < 100 && segs.length > 0) segs[0].pct += 100 - sum;
  return segs.filter((s) => s.pct > 0);
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

function buildArcs(segments: Segment[]) {
  let cursor = 0;
  return segments.map((s) => {
    const span = (s.pct / 100) * 360 - GAP_DEG;
    const start = cursor;
    cursor += (s.pct / 100) * 360;
    return { ...s, start, span };
  });
}

function DonutChart({ segments, activeIdx, onHover }: {
  segments: Segment[];
  activeIdx: number | null;
  onHover: (i: number | null) => void;
}) {
  const ref = useRef<SVGSVGElement>(null);
  const arcs = buildArcs(segments);
  const center = activeIdx !== null ? segments[activeIdx] : segments[0];
  return (
    <div className="flex flex-col items-center gap-4">
      <svg ref={ref} width="140" height="140" viewBox="0 0 140 140" className="select-none">
        {arcs.map((arc, i) => {
          const isActive = activeIdx === i;
          const isDimmed = activeIdx !== null && activeIdx !== i;
          return (
            <path
              key={arc.label}
              d={arcPath(arc.start, arc.span)}
              fill={arc.color}
              className="transition-all duration-200 ease-out cursor-pointer"
              style={{
                opacity: isDimmed ? 0.25 : 1,
                transform: isActive ? 'scale(1.04)' : 'scale(1)',
                transformOrigin: `${CX}px ${CY}px`,
              }}
              onMouseEnter={() => onHover(i)}
              onMouseLeave={() => onHover(null)}
              onClick={() => onHover(activeIdx === i ? null : i)}
            />
          );
        })}
        <text x={CX} y={CY - 5} textAnchor="middle" style={{ fontSize: 15, fill: '#111114', fontWeight: 700, fontFamily: 'sans-serif' }}>
          {center?.pct ?? 0}%
        </text>
        <text x={CX} y={CY + 11} textAnchor="middle" style={{ fontSize: 8, fill: '#9CA3AF', fontFamily: 'monospace' }}>
          {center?.label?.split(' ')[0] ?? ''}
        </text>
      </svg>
      <div className="flex flex-wrap justify-center gap-x-4 gap-y-1.5">
        {segments.map((s, i) => (
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

function getRemediationSnippet(title: string, cat: string, file: string): { snippet: string; description: string } {
  const titleLower = title.toLowerCase();
  const catLower = cat.toLowerCase();

  if (titleLower.includes('gitignore') || catLower.includes('gitignore')) {
    return {
      description: 'Create a .gitignore file in the root directory to prevent tracking sensitive secrets, environment variables, logs, and build artifacts.',
      snippet: `# Environment & Secrets
.env
.env.local
*.pem

# Dependencies & Build output
node_modules/
dist/
build/
.next/

# Logs & OS metadata
*.log
.DS_Store`,
    };
  }

  if (titleLower.includes('secret') || titleLower.includes('key') || titleLower.includes('token') || catLower.includes('secret')) {
    return {
      description: 'Move hardcoded credentials to environment variables and access them dynamically via process.env or os.getenv.',
      snippet: `// Recommended Environment Variable Access:
const API_KEY = process.env.NEXT_PUBLIC_API_KEY;
if (!API_KEY) {
  throw new Error("Missing NEXT_PUBLIC_API_KEY environment variable");
}`,
    };
  }

  if (titleLower.includes('cors') || catLower.includes('cors') || titleLower.includes('wildcard')) {
    return {
      description: 'Restrict Cross-Origin Resource Sharing (CORS) header configuration to specific trusted domain origins.',
      snippet: `// FastAPI / Express Secure CORS Middleware:
app.add_middleware(
    CORSMiddleware,
    allow_origins=["https://yourdomain.com"],
    allow_credentials=True,
    allow_methods=["GET", "POST"],
    allow_headers=["*"],
)`,
    };
  }

  if (catLower.includes('dependencies') || titleLower.includes('package') || titleLower.includes('dependency')) {
    return {
      description: 'Update the vulnerable dependency package to the latest patched security release.',
      snippet: `# Fix Node.js dependencies:
npm audit fix --force

# Fix Python dependencies:
pip install --upgrade -r requirements.txt`,
    };
  }

  return {
    description: 'Enforce strict schema validation, input sanitization, and HTTPS transport security.',
    snippet: `# General Security Check:
1. Validate inputs using Zod or Pydantic schemas
2. Enforce HTTPS headers in production
3. Set HttpOnly and SameSite flags on session cookies`,
  };
}

function ThreatItemWithFix({ t }: { t: { title: string; severity: string; file: string; desc: string; cat: string } }) {
  const [showFix, setShowFix] = useState(false);
  const [copied, setCopied] = useState(false);

  const fixData = getRemediationSnippet(t.title, t.cat, t.file);

  const handleCopy = () => {
    navigator.clipboard.writeText(fixData.snippet);
    setCopied(true);
    setTimeout(() => setCopied(false), 1500);
  };

  return (
    <div className="p-3.5 rounded-xl bg-white border border-[#E5E5E7] shadow-2xs space-y-2">
      <div className="flex items-start justify-between gap-3">
        <div className="flex items-start gap-2.5 min-w-0">
          <div className="shrink-0 mt-1 w-2.5 h-2.5 rounded-full" style={{ backgroundColor: SEGMENT_COLORS[t.cat] ?? '#6B7280' }} />
          <div className="min-w-0 space-y-0.5">
            <div className="flex items-center gap-2 flex-wrap">
              <span className="text-xs font-bold text-[#111114] font-sans">{t.title}</span>
              <span className={`text-[9px] font-mono font-bold px-2 py-0.5 rounded ${SEVERITY_STYLES[t.severity] ?? SEVERITY_STYLES['low']}`}>
                {t.severity}
              </span>
            </div>
            {t.file && <p className="text-[10px] font-mono text-[#6B7280] truncate">{t.file}</p>}
            {t.desc && <p className="text-[11px] text-[#374151] leading-relaxed font-sans">{t.desc}</p>}
          </div>
        </div>

        <button
          onClick={() => setShowFix(!showFix)}
          className="shrink-0 flex items-center gap-1.5 px-2.5 py-1 rounded-lg bg-[#EFF6FF] text-[#2563EB] hover:bg-[#2563EB] hover:text-white transition-colors text-[10px] font-mono font-bold border border-[#BFDBFE]"
        >
          <Wrench className="w-3 h-3" />
          <span>{showFix ? 'Hide Snippet' : '1-Click Remediation'}</span>
        </button>
      </div>

      {showFix && (
        <div className="mt-2 pt-2 border-t border-[#F1F5F9] space-y-2 font-mono text-xs">
          <p className="text-[11px] font-sans text-[#475569] leading-relaxed">
            <strong className="text-[#0F172A] font-mono">Remediation Guidance: </strong>
            {fixData.description}
          </p>

          <div className="relative rounded-lg bg-[#0F172A] p-3 text-slate-100 text-[11px] font-mono border border-slate-800">
            <div className="flex items-center justify-between pb-2 mb-2 border-b border-slate-800 text-[10px] text-slate-400">
              <span>Remediation Code Snippet</span>
              <button
                onClick={handleCopy}
                className="flex items-center gap-1 px-2 py-0.5 rounded bg-slate-800 hover:bg-slate-700 text-slate-200 transition-colors"
              >
                {copied ? <Check className="w-3 h-3 text-emerald-400" /> : <Copy className="w-3 h-3" />}
                <span>{copied ? 'Copied!' : 'Copy Code'}</span>
              </button>
            </div>
            <pre className="whitespace-pre overflow-x-auto text-[#38BDF8] leading-relaxed">{fixData.snippet}</pre>
          </div>
        </div>
      )}
    </div>
  );
}

function ThreatList({ findings, activeCategory }: {
  findings: Record<string, SecurityFinding[]> | null;
  activeCategory: string | null;
}) {
  if (!findings) {
    return (
      <div className="h-[220px] flex items-center justify-center">
        <p className="text-xs font-mono text-[#9CA3AF]">No findings — analyze a repo first.</p>
      </div>
    );
  }
  const allThreats: { title: string; severity: string; file: string; desc: string; cat: string }[] = [];
  Object.entries(findings).forEach(([cat, items]) => {
    items.forEach((item) => {
      allThreats.push({
        title: (item.type ?? item.package ?? cat) as string,
        severity: (item.severity ?? 'info') as string,
        file: (item.file ?? item.package ?? '') as string,
        desc: (item.reason ?? '') as string,
        cat,
      });
    });
  });
  const filtered = activeCategory ? allThreats.filter((t) => t.cat === activeCategory) : allThreats;
  return (
    <div className="max-h-[340px] overflow-y-auto pr-1">
      <div className="space-y-2.5">
        {filtered.length === 0 && (
          <p className="text-center text-xs font-mono text-[#9CA3AF] py-12">No threats in this category.</p>
        )}
        {filtered.map((t, idx) => (
          <ThreatItemWithFix key={idx} t={t} />
        ))}
      </div>
    </div>
  );
}

function RadarBackground() {
  return (
    <div className="absolute inset-0 overflow-hidden pointer-events-none z-0 min-h-full w-full transform-gpu">
      <div className="absolute top-[45%] left-1/2 -translate-x-1/2 -translate-y-1/2 w-[950px] h-[950px] rounded-full border border-[#E2E8F0] flex items-center justify-center pointer-events-none">
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
      <div className="absolute top-[45%] left-1/2 -translate-x-1/2 -translate-y-1/2 w-[360px] h-[360px] rounded-full border border-[#2563EB]/25 bg-[#2563EB]/5 animate-ping opacity-25 pointer-events-none" />
      <div
        className="absolute top-[45%] left-1/2 -translate-x-1/2 -translate-y-1/2 w-[950px] h-[950px] rounded-full animate-spin pointer-events-none transform-gpu will-change-transform"
        style={{ animationDuration: '14s', background: 'conic-gradient(from 0deg, transparent 0deg, transparent 260deg, rgba(37, 99, 235, 0.06) 320deg, rgba(37, 99, 235, 0.18) 360deg)' }}
      />
      {[
        { top: '22%', left: '1.5%', color: '#EF4444', label: 'CRITICAL' },
        { top: '38%', right: '1.5%', color: '#F97316', label: 'HIGH' },
        { top: '64%', left: '1.5%', color: '#EAB308', label: 'MEDIUM' },
        { top: '76%', right: '2%', color: '#22C55E', label: 'SECURE' },
        { top: '18%', right: '8%', color: '#8B5CF6', label: 'SECRET' },
      ].map((node, i) => (
        <div key={i} className="absolute flex items-center gap-1.5 pointer-events-none" style={{ top: node.top, left: (node as any).left, right: (node as any).right }}>
          <div className="w-2.5 h-2.5 rounded-full relative animate-pulse" style={{ backgroundColor: node.color, boxShadow: `0 0 8px ${node.color}` }}>
            <div className="absolute inset-0 rounded-full animate-ping opacity-75" style={{ border: `1.5px solid ${node.color}` }} />
          </div>
          <span className="text-[9px] font-mono font-bold tracking-wider text-[#64748B] bg-white/95 px-1.5 py-0.5 rounded border border-[#E2E8F0]">
            {node.label}
          </span>
        </div>
      ))}
    </div>
  );
}

function isRepoMatch(resultPath: string | undefined, targetRepo: string | null): boolean {
  if (!resultPath || !targetRepo) return false;
  const p1 = resultPath.toLowerCase().replace(/^https?:\/\/github\.com\//, '').replace(/\.git$/, '').replace(/\/$/, '').trim();
  const p2 = targetRepo.toLowerCase().replace(/^https?:\/\/github\.com\//, '').replace(/\.git$/, '').replace(/\/$/, '').trim();
  return p1 === p2 || p1.includes(p2) || p2.includes(p1);
}

function isSecurityValid(s: any): boolean {
  if (!s || typeof s !== 'object') return false;
  return Boolean(s.findings || s.score || s.risk_rating || s.report);
}

export default function SecurityAgentPage() {
  const { repoPath, analysisResult, setAnalysisResult } = useRepo();
  const [activeIdx, setActiveIdx] = useState<number | null>(null);
  const [security, setSecurity] = useState<SecurityResult | null>(null);

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
          const raw = sessionStorage.getItem('repoatlas_result') || localStorage.getItem('repoatlas_result');
          if (raw) {
            const parsed = JSON.parse(raw);
            if (!activeRepo || isRepoMatch(parsed.repo_path || parsed.repo_url, activeRepo)) {
              result = parsed;
            }
          }
        }

        let secData = result ? (result.security || (result as any).security_result) : null;

        if (!isSecurityValid(secData) && activeRepo) {
          const { analyzeRepo, saveLocalAnalysis } = await import('../../../lib/api');
          const data = await analyzeRepo({ repo_path: activeRepo, query: 'full analysis' });
          if (data) {
            saveLocalAnalysis(activeRepo, data);
            secData = data.security || data.security_result;
            setAnalysisResult(data);
          }
        }

        if (secData) {
          setSecurity(secData as SecurityResult);
        }
      } catch (err) {
        console.error('Security load error:', err);
      }
    }
    loadData();
  }, [analysisResult, activeRepo, setAnalysisResult]);

  const segments = buildSegments(security?.findings ?? null);
  const activeCategory = activeIdx !== null ? (segments[activeIdx]?.catKey ?? null) : null;
  const findingsCount = activeCategory
    ? (security?.findings?.[activeCategory]?.length ?? 0)
    : (security?.score?.total ?? 0);

  return (
    <main className="min-h-screen bg-[#FAFAFA] text-[#111114] selection:bg-[#2563EB]/20 selection:text-[#2563EB] overflow-x-hidden flex flex-col relative">
      <Navbar />
      <RadarBackground />

      <div className="flex-1 flex items-center justify-center pt-32 pb-24 px-4 sm:px-6 lg:px-8 max-w-4xl mx-auto w-full relative z-10">
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.4 }}
          className="p-8 rounded-2xl bg-white border border-[#E5E5E7] shadow-lg space-y-6 relative overflow-hidden w-full"
        >
          <div className="absolute top-0 right-0 p-8 opacity-5 pointer-events-none">
            <Brain className="w-48 h-48 text-[#2563EB]" />
          </div>

          <div className="flex items-center gap-3">
            <div className="p-3 rounded-xl bg-[#2563EB] text-white shadow-lg">
              <Brain className="w-6 h-6" />
            </div>
            <div>
              <h3 className="text-2xl font-bold text-[#111114]">Security Agent</h3>
              <span className="text-xs font-mono text-[#9CA3AF] block font-semibold mt-0.5">Vulnerability Scanner</span>
            </div>
          </div>

          {security?.risk_rating && (
            <div className="p-4.5 rounded-2xl bg-gradient-to-r from-[#F8FAFC] via-[#F1F5F9] to-[#EFF6FF] border border-[#CBD5E1]/80 shadow-xs flex items-center gap-4 flex-wrap sm:flex-nowrap">
              <div className="flex items-center gap-2 shrink-0">
                <Shield className={`w-4.5 h-4.5 ${
                  security.risk_rating === 'CRITICAL' || security.risk_rating === 'HIGH' ? 'text-red-500' :
                  security.risk_rating === 'MEDIUM' ? 'text-amber-500' : 'text-emerald-500'
                }`} />
                <span className={`px-3 py-1 rounded-full text-xs font-mono font-extrabold uppercase tracking-wider shadow-2xs border ${
                  security.risk_rating === 'CRITICAL' ? 'bg-red-500 text-white border-red-600' :
                  security.risk_rating === 'HIGH'     ? 'bg-orange-500 text-white border-orange-600' :
                  security.risk_rating === 'MEDIUM'   ? 'bg-amber-500 text-white border-amber-600' :
                  security.risk_rating === 'LOW'      ? 'bg-blue-500 text-white border-blue-600' :
                                                        'bg-emerald-500 text-white border-emerald-600'
                }`}>
                  {security.risk_rating} RISK LEVEL
                </span>
              </div>

              {security.expert_analysis && (
                <div className="flex-1 min-w-0 font-sans">
                  <p className="text-xs sm:text-[13px] text-[#1E293B] leading-relaxed font-medium">
                    <span className="font-bold text-[#2563EB] font-mono uppercase text-[11px] tracking-wider mr-1.5">
                      Security Assessment:
                    </span>
                    {extractShortExecutiveSummary(security.expert_analysis)}
                  </p>
                </div>
              )}
            </div>
          )}

          <div className="space-y-4">
            <div className="flex items-center justify-between">
              <span className="text-xs font-mono font-bold text-[#2563EB]">Security Posture</span>
              <span className="text-[10px] font-mono text-[#9CA3AF]">hover segment to filter</span>
            </div>

            <DonutChart segments={segments} activeIdx={activeIdx} onHover={setActiveIdx} />

            <div className="border-t border-[#E5E5E7]" />

            <div className="flex items-center justify-between">
              <span className="text-xs font-mono font-bold text-[#2563EB]">
                {activeCategory ? `${activeCategory.replace(/_/g, ' ')} — Threats` : 'All Threats'}
              </span>
              <span className="text-[10px] font-mono text-[#9CA3AF]">{findingsCount} finding(s)</span>
            </div>

            <ThreatList findings={security?.findings ?? null} activeCategory={activeCategory} />
          </div>

          <div className="flex items-center justify-between pt-4 border-t border-[#E5E5E7] text-xs font-mono text-[#9CA3AF]">
            <span>Status: <span className="text-green-600">Active Stream</span></span>
            <span>Latency: <span className="text-[#2563EB]">&lt; 14ms</span></span>
          </div>
        </motion.div>
      </div>


    </main>
  );
}
