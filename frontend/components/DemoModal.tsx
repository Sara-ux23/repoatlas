import React, { useState, useEffect, useRef } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { X, Terminal, Shield, GitBranch, BarChart2, CheckCircle, Loader2, ChevronRight, ChevronLeft, Play, Pause } from 'lucide-react';

/* ── Types ── */
interface Step {
  id: number;
  label: string;
  icon: React.ReactNode;
  color: string;
  bg: string;
}

interface DemoModalProps {
  onClose: () => void;
}

/* ── Demo steps definition ── */
const STEPS: Step[] = [
  { id: 0, label: 'Explorer Agent',     icon: <Terminal className="w-4 h-4" />,  color: '#2563EB', bg: '#EFF6FF' },
  { id: 1, label: 'Trace Agent',        icon: <GitBranch className="w-4 h-4" />, color: '#7C3AED', bg: '#F5F3FF' },
  { id: 2, label: 'Security Agent',     icon: <Shield className="w-4 h-4" />,    color: '#DC2626', bg: '#FEF2F2' },
  { id: 3, label: 'Visualization',      icon: <BarChart2 className="w-4 h-4" />, color: '#059669', bg: '#ECFDF5' },
];

/* ── Per-step log lines ── */
const LOGS: Record<number, string[]> = {
  0: [
    '$ git clone https://github.com/facebook/react.git',
    '✓ Cloned 142 files across 18 directories',
    '→ Parsing AST nodes... 3,420 found',
    '→ Detected languages: JavaScript (78%), TypeScript (18%), CSS (4%)',
    '→ Entry points: src/index.js, packages/react/index.js',
    '→ Module graph: 94 internal imports resolved',
    '✓ Explorer complete — folder tree ready',
  ],
  1: [
    '$ trace --entry src/ReactDOM.js --depth 6',
    '→ Tracing call chain from ReactDOM.render()',
    '  └─ scheduleUpdateOnFiber()',
    '     └─ performSyncWorkOnRoot()',
    '        └─ renderWithHooks()',
    '           └─ reconcileChildren()',
    '→ 6 commit authors found in last 90 days',
    '✓ Trace complete — 42 execution paths mapped',
  ],
  2: [
    '$ scan --severity HIGH,CRITICAL',
    '→ Scanning 142 files for vulnerabilities...',
    '⚠  [MEDIUM] Prototype pollution risk in utils/merge.js:88',
    '⚠  [LOW]    Unescaped user input in dev/warnings.js:34',
    '✓  No HIGH or CRITICAL issues found',
    '→ Dependency audit: 0 CVEs in direct deps',
    '→ Risk rating: LOW  •  Score: 12 / 100',
    '✓ Security scan complete',
  ],
  3: [
    '$ viz --output graph,heatmap,contributors',
    '→ Building dependency graph... 94 nodes, 138 edges',
    '→ Generating commit heatmap (365 days)...',
    '→ Contributor activity: 6 active, 23 total',
    '→ Language breakdown chart ready',
    '→ Rendering interactive D3 visualizations...',
    '✓ Visualization complete — 4 charts generated',
  ],
};

/* ── Terminal panel ── */
function TerminalPanel({ step, visibleLines }: { step: number; visibleLines: number }) {
  const endRef = useRef<HTMLDivElement>(null);
  useEffect(() => { endRef.current?.scrollIntoView({ behavior: 'smooth' }); }, [visibleLines]);

  const lines = LOGS[step] ?? [];
  const done = visibleLines >= lines.length;

  return (
    <div className="rounded-xl bg-[#0D1117] border border-[#30363D] overflow-hidden h-full flex flex-col">
      {/* Title bar */}
      <div className="flex items-center gap-2 px-4 py-2.5 border-b border-[#30363D] bg-[#161B22]">
        <span className="w-3 h-3 rounded-full bg-[#FF5F57]" />
        <span className="w-3 h-3 rounded-full bg-[#FFBD2E]" />
        <span className="w-3 h-3 rounded-full bg-[#28C840]" />
        <span className="ml-2 text-xs text-[#8B949E] font-mono">repoatlas — agent terminal</span>
      </div>
      {/* Log lines */}
      <div className="flex-1 overflow-y-auto p-4 font-mono text-xs space-y-1 min-h-0">
        <AnimatePresence>
          {lines.slice(0, visibleLines).map((line, i) => (
            <motion.div
              key={i}
              initial={{ opacity: 0, x: -8 }}
              animate={{ opacity: 1, x: 0 }}
              transition={{ duration: 0.2 }}
              className={
                line.startsWith('✓') ? 'text-[#3FB950]' :
                line.startsWith('⚠') ? 'text-[#F0883E]' :
                line.startsWith('$') ? 'text-[#79C0FF]' :
                'text-[#E6EDF3]'
              }
            >
              {line}
            </motion.div>
          ))}
        </AnimatePresence>
        {/* Blinking cursor */}
        {!done && (
          <span className="inline-block w-2 h-3.5 bg-[#58A6FF] animate-pulse align-middle" />
        )}
        <div ref={endRef} />
      </div>
    </div>
  );
}

/* ── Viz panel (right side preview per step) ── */
function VizPanel({ step }: { step: number }) {
  if (step === 0) return (
    <div className="h-full rounded-xl bg-[#F8FAFC] border border-[#E5E5E7] p-4 overflow-hidden">
      <p className="text-xs font-semibold text-[#374151] mb-3">📁 Folder Structure</p>
      {['src/', '  ├─ index.js', '  ├─ ReactDOM.js', '  ├─ hooks/', '  │   ├─ useEffect.js', '  │   └─ useState.js', '  └─ utils/', 'packages/', '  ├─ react/', '  └─ react-dom/'].map((line, i) => (
        <motion.p key={i} initial={{ opacity: 0 }} animate={{ opacity: 1 }} transition={{ delay: i * 0.07 }}
          className="font-mono text-xs text-[#374151] leading-relaxed">{line}</motion.p>
      ))}
    </div>
  );

  if (step === 1) return (
    <div className="h-full rounded-xl bg-[#F8FAFC] border border-[#E5E5E7] p-4">
      <p className="text-xs font-semibold text-[#374151] mb-3">🔍 Call Chain</p>
      {['ReactDOM.render()', '└─ scheduleUpdateOnFiber()', '   └─ performSyncWorkOnRoot()', '      └─ renderWithHooks()', '         └─ reconcileChildren()', '            └─ commitMutationEffects()'].map((line, i) => (
        <motion.p key={i} initial={{ opacity: 0, x: 10 }} animate={{ opacity: 1, x: 0 }} transition={{ delay: i * 0.1 }}
          className="font-mono text-xs leading-relaxed"
          style={{ color: `hsl(${260 - i * 15}, 70%, 45%)` }}>{line}</motion.p>
      ))}
    </div>
  );

  if (step === 2) return (
    <div className="h-full rounded-xl bg-[#F8FAFC] border border-[#E5E5E7] p-4 space-y-2">
      <p className="text-xs font-semibold text-[#374151] mb-3">🛡️ Risk Summary</p>
      {[{ label: 'CRITICAL', count: 0, color: '#DC2626' }, { label: 'HIGH', count: 0, color: '#EA580C' }, { label: 'MEDIUM', count: 1, color: '#D97706' }, { label: 'LOW', count: 1, color: '#65A30D' }].map((r, i) => (
        <motion.div key={r.label} initial={{ opacity: 0, scaleX: 0 }} animate={{ opacity: 1, scaleX: 1 }} transition={{ delay: i * 0.12, duration: 0.4 }}
          className="flex items-center gap-3">
          <span className="text-xs font-mono w-16" style={{ color: r.color }}>{r.label}</span>
          <div className="flex-1 h-2 rounded-full bg-[#E5E5E7] overflow-hidden">
            <motion.div initial={{ width: 0 }} animate={{ width: r.count === 0 ? '4%' : '30%' }}
              transition={{ delay: i * 0.12 + 0.2, duration: 0.5 }}
              className="h-full rounded-full" style={{ background: r.color }} />
          </div>
          <span className="text-xs font-mono text-[#6B7280]">{r.count}</span>
        </motion.div>
      ))}
      <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} transition={{ delay: 0.7 }}
        className="mt-3 px-3 py-2 rounded-lg bg-emerald-50 border border-emerald-200 text-emerald-700 text-xs font-semibold flex items-center gap-2">
        <CheckCircle className="w-3.5 h-3.5" /> Risk Rating: LOW
      </motion.div>
    </div>
  );

  // step === 3
  return (
    <div className="h-full rounded-xl bg-[#F8FAFC] border border-[#E5E5E7] p-4 space-y-3">
      <p className="text-xs font-semibold text-[#374151] mb-1">📊 Language Breakdown</p>
      {[{ lang: 'JavaScript', pct: 78, color: '#F7DF1E' }, { lang: 'TypeScript', pct: 18, color: '#3178C6' }, { lang: 'CSS', pct: 4, color: '#264DE4' }].map((l, i) => (
        <div key={l.lang} className="space-y-1">
          <div className="flex justify-between text-xs text-[#6B7280]"><span>{l.lang}</span><span>{l.pct}%</span></div>
          <div className="h-2 rounded-full bg-[#E5E5E7] overflow-hidden">
            <motion.div initial={{ width: 0 }} animate={{ width: `${l.pct}%` }} transition={{ delay: i * 0.15 + 0.2, duration: 0.6 }}
              className="h-full rounded-full" style={{ background: l.color }} />
          </div>
        </div>
      ))}
      <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} transition={{ delay: 0.7 }}
        className="grid grid-cols-2 gap-2 mt-2">
        {[{ label: 'Files', val: '142' }, { label: 'AST Nodes', val: '3,420' }, { label: 'Contributors', val: '23' }, { label: 'Commits', val: '4,891' }].map(s => (
          <div key={s.label} className="rounded-lg bg-white border border-[#E5E5E7] px-3 py-2 text-center">
            <p className="text-base font-bold text-[#2563EB]">{s.val}</p>
            <p className="text-[10px] text-[#9CA3AF]">{s.label}</p>
          </div>
        ))}
      </motion.div>
    </div>
  );
}

/* ── Main DemoModal ── */
export function DemoModal({ onClose }: DemoModalProps) {
  const [step, setStep] = useState(0);
  const [visibleLines, setVisibleLines] = useState(0);
  const [playing, setPlaying] = useState(true);
  const timerRef = useRef<ReturnType<typeof setInterval> | null>(null);

  const totalLines = LOGS[step]?.length ?? 0;
  const done = visibleLines >= totalLines;

  // Auto-advance lines
  useEffect(() => {
    if (!playing) return;
    timerRef.current = setInterval(() => {
      setVisibleLines(v => {
        if (v < totalLines) return v + 1;
        clearInterval(timerRef.current!);
        return v;
      });
    }, 320);
    return () => clearInterval(timerRef.current!);
  }, [playing, step, totalLines]);

  // Reset lines when step changes
  useEffect(() => {
    setVisibleLines(0);
    setPlaying(true);
  }, [step]);

  const goNext = () => { if (step < STEPS.length - 1) setStep(s => s + 1); };
  const goPrev = () => { if (step > 0) setStep(s => s - 1); };

  return (
    <AnimatePresence>
      <motion.div
        className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-[#111114]/85 backdrop-blur-sm"
        initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
        onClick={(e) => { if (e.target === e.currentTarget) onClose(); }}
      >
        <motion.div
          initial={{ opacity: 0, scale: 0.94, y: 20 }}
          animate={{ opacity: 1, scale: 1, y: 0 }}
          exit={{ opacity: 0, scale: 0.94, y: 20 }}
          transition={{ type: 'spring', stiffness: 260, damping: 22 }}
          className="relative w-full max-w-5xl bg-white rounded-2xl border border-[#E5E5E7] shadow-2xl overflow-hidden"
          style={{ maxHeight: '90vh' }}
        >
          {/* ── Header ── */}
          <div className="flex items-center justify-between px-6 py-4 border-b border-[#E5E5E7] bg-[#FAFAFA]">
            <div className="flex items-center gap-2 text-[#111114] font-bold text-base">
              <Terminal className="w-5 h-5 text-[#2563EB]" />
              RepoAtlas AI — Live Demo  •  <span className="font-mono text-sm text-[#6B7280]">facebook/react</span>
            </div>
            <button onClick={onClose} className="text-[#9CA3AF] hover:text-[#111114] transition-colors">
              <X className="w-5 h-5" />
            </button>
          </div>

          {/* ── Step tabs ── */}
          <div className="flex border-b border-[#E5E5E7] bg-white px-6 gap-1 overflow-x-auto">
            {STEPS.map((s) => {
              const active = s.id === step;
              const completed = s.id < step;
              return (
                <button
                  key={s.id}
                  onClick={() => setStep(s.id)}
                  className={`flex items-center gap-2 px-4 py-3 text-xs font-semibold border-b-2 transition-all whitespace-nowrap ${
                    active
                      ? 'border-[#2563EB] text-[#2563EB]'
                      : completed
                      ? 'border-transparent text-[#6B7280]'
                      : 'border-transparent text-[#9CA3AF]'
                  }`}
                >
                  <span style={{ color: active ? s.color : completed ? '#6B7280' : '#D1D5DB' }}>
                    {completed ? <CheckCircle className="w-4 h-4" /> : s.icon}
                  </span>
                  {s.label}
                </button>
              );
            })}
          </div>

          {/* ── Main content ── */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4 p-6" style={{ height: '380px' }}>
            <TerminalPanel step={step} visibleLines={visibleLines} />
            <AnimatePresence mode="wait">
              <motion.div
                key={step}
                initial={{ opacity: 0, x: 20 }}
                animate={{ opacity: 1, x: 0 }}
                exit={{ opacity: 0, x: -20 }}
                transition={{ duration: 0.25 }}
                className="h-full"
              >
                <VizPanel step={step} />
              </motion.div>
            </AnimatePresence>
          </div>

          {/* ── Footer controls ── */}
          <div className="flex items-center justify-between px-6 py-4 border-t border-[#E5E5E7] bg-[#FAFAFA]">
            {/* Progress dots */}
            <div className="flex items-center gap-2">
              {STEPS.map(s => (
                <button key={s.id} onClick={() => setStep(s.id)}
                  className={`rounded-full transition-all ${s.id === step ? 'w-5 h-2.5 bg-[#2563EB]' : 'w-2.5 h-2.5 bg-[#D1D5DB] hover:bg-[#9CA3AF]'}`}
                />
              ))}
            </div>

            {/* Play/pause + nav */}
            <div className="flex items-center gap-3">
              <button
                onClick={() => setPlaying(p => !p)}
                className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-[#F4F6FA] hover:bg-[#E5E5E7] text-[#374151] text-xs font-medium transition-colors"
              >
                {playing && !done
                  ? <><Pause className="w-3.5 h-3.5" /> Pause</>
                  : <><Play className="w-3.5 h-3.5 fill-current" /> {done ? 'Replay' : 'Play'}</>
                }
              </button>
              {!playing && done && (
                <button onClick={() => { setVisibleLines(0); setPlaying(true); }}
                  className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-[#F4F6FA] hover:bg-[#E5E5E7] text-[#374151] text-xs font-medium transition-colors">
                  <Loader2 className="w-3.5 h-3.5" /> Replay
                </button>
              )}
              <button onClick={goPrev} disabled={step === 0}
                className="p-2 rounded-lg bg-[#F4F6FA] hover:bg-[#E5E5E7] text-[#374151] disabled:opacity-30 transition-colors">
                <ChevronLeft className="w-4 h-4" />
              </button>
              <button
                onClick={done ? goNext : () => { setVisibleLines(totalLines); setPlaying(false); }}
                className="flex items-center gap-1.5 px-4 py-1.5 rounded-lg bg-[#2563EB] hover:bg-[#1D4ED8] text-white text-xs font-semibold transition-colors disabled:opacity-40"
                disabled={step === STEPS.length - 1 && done}
              >
                {done && step < STEPS.length - 1 ? <>Next Agent <ChevronRight className="w-3.5 h-3.5" /></> : done ? 'Done ✓' : <>Skip <ChevronRight className="w-3.5 h-3.5" /></>}
              </button>
            </div>
          </div>
        </motion.div>
      </motion.div>
    </AnimatePresence>
  );
}
