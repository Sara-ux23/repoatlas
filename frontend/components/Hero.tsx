import React, { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Github, Sparkles, Play, ArrowRight, CheckCircle, Loader2, X, AlertCircle } from 'lucide-react';
import { MascotOrb } from './MascotOrb';
import { DemoModal } from './DemoModal';
import { heroVariants } from '../lib/animations';
import { analyzeRepo, clearLocalSession, saveLocalAnalysis, ManagerResponse } from '../lib/api';
import { useRepo } from '../lib/repoContext';
import { useAuth } from '../lib/authContext';
import { AnalyzingLoader } from './AnalyzingLoader';

interface HeroProps {
  onAnalyze?: (url: string, result: ManagerResponse) => void;
  onSignInClick?: () => void;
  hideRepoInput?: boolean; // when true, hides the repo URL input bar entirely
}

export const Hero: React.FC<HeroProps> = ({ onAnalyze, onSignInClick, hideRepoInput }) => {
  const { setRepoPath, setAnalysisResult } = useRepo();
  const { user } = useAuth();
  const [repoUrl, setRepoUrl] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [showDemoModal, setShowDemoModal] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [statusMsg, setStatusMsg] = useState('');
  const [analyzedSuccess, setAnalyzedSuccess] = useState(false);
  const [result, setResult] = useState<ManagerResponse | null>(null);

  // Load from localStorage on mount
  React.useEffect(() => {
    const savedUrl = localStorage.getItem('repoatlas_url');
    const savedResult = localStorage.getItem('repoatlas_result');
    if (savedUrl && !repoUrl) setRepoUrl(savedUrl);
    if (savedResult && !result) {
      try {
        setResult(JSON.parse(savedResult));
        setAnalyzedSuccess(true);
      } catch { /* ignore */ }
    }
  }, []);

  const sampleRepos = [
    'Sara-ux23/Feedback-Form',
    'gabrielecirulli/2048',
    'shofiahmed69/Fake-Headline-Generator',
    'Sara-ux23/Fower_classify',
  ];

  const normaliseUrl = (raw: string): string => {
    const t = raw.trim();
    if (t.startsWith('http://') || t.startsWith('https://')) return t;
    if (t.includes('/') && !t.includes(' ')) return `https://github.com/${t}`;
    return t;
  };

  const handleAnalyzeSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!repoUrl.trim()) return;
    const url = normaliseUrl(repoUrl);
    setIsLoading(true);
    setError(null);
    setAnalyzedSuccess(false);
    setStatusMsg('Checking cache…');
    try {
      // Only wipe the local session when the user switches to a genuinely different repo.
      // Never call clearSession() here — the backend handles git pull vs re-clone itself.
      const currentRepoUrl = sessionStorage.getItem('repoatlas_url');
      if (currentRepoUrl && currentRepoUrl !== url) {
        clearLocalSession();
      }
      const data = await analyzeRepo({ repo_path: url, query: 'full analysis' });
      setStatusMsg(data.cached ? (data.incremental ? 'Refreshing new commits…' : 'Loading from cache…') : 'Mapping codebase…');
      setResult(data);
      setAnalyzedSuccess(true);
      setStatusMsg('');
      setRepoPath(url);
      setAnalysisResult(data);
      saveLocalAnalysis(url, data);
      if (onAnalyze) onAnalyze(url, data);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Analysis failed. Is the backend running?');
      setStatusMsg('');
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <section id="product" className="relative pt-32 pb-20 md:pt-40 md:pb-28 overflow-hidden bg-white">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 relative z-10">

        {/* Marketing content — logged-out only */}
        {!user && (
          <div className="grid grid-cols-1 lg:grid-cols-12 gap-12 items-center">

            {/* Left Hero Content */}
            <div className="lg:col-span-7 space-y-6 text-left">
              {/* Pill Badge */}
              <motion.div custom={0} initial="hidden" animate="visible" variants={heroVariants}
                className="inline-flex items-center gap-3 px-6 py-2.5 rounded-full bg-white border border-[#E5E5E7] shadow-md hover:border-[#2563EB]/40 transition-all">
                <span className="relative flex h-3.5 w-3.5 items-center justify-center shrink-0">
                  <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-[#4ADE80] opacity-75" />
                  <span className="relative inline-flex rounded-full h-3 w-3 bg-emerald-500" />
                </span>
                <span className="text-sm font-mono text-[#2563EB] font-semibold tracking-wide">
                  Now supporting Python, JS/TS, Go & Rust
                </span>
              </motion.div>

              {/* Headline */}
              <motion.h1 custom={1} initial="hidden" animate="visible" variants={heroVariants}
                className="text-4xl sm:text-5xl md:text-6xl xl:text-7xl font-extrabold tracking-tight text-[#111114] leading-[1.1]">
                <span className="text-[#2563EB]">See your codebase.</span>{' '}Not just search it.
              </motion.h1>

              {/* Subheadline */}
              <motion.p custom={2} initial="hidden" animate="visible" variants={heroVariants}
                className="text-lg md:text-xl text-[#6B7280] max-w-2xl leading-relaxed font-sans">
                Paste a GitHub repo. RepoAtlas AI's agents explore it, trace how features actually work, and hand you an interactive visual map — architecture, dependencies, and execution flow, explained in plain English.
              </motion.p>

              {/* CTA Buttons */}
              <motion.div custom={3} initial="hidden" animate="visible" variants={heroVariants}
                className="flex flex-wrap items-center gap-4 pt-2">
                <button
                  onClick={onSignInClick || (() => { window.location.href = '/auth?signin=1'; })}
                  className="px-7 py-3.5 rounded-full font-semibold text-white bg-[#2563EB] shadow-sm hover:shadow-md transition-all duration-300 flex items-center gap-2.5 text-base cursor-pointer">
                  <Sparkles className="w-5 h-5 text-white" />
                  Login here
                  <ArrowRight className="w-4 h-4" />
                </button>
                <button onClick={() => setShowDemoModal(true)}
                  className="px-6 py-3.5 rounded-full font-semibold text-[#111114] bg-white border border-[#E5E5E7] hover:bg-[#FAFAFA] transition-all duration-300 flex items-center gap-2.5 text-base">
                  <div className="w-7 h-7 rounded-full bg-[#2563EB]/10 flex items-center justify-center">
                    <Play className="w-3.5 h-3.5 text-[#2563EB] fill-[#2563EB]" />
                  </div>
                  Watch Demo
                </button>
              </motion.div>
            </div>

            {/* Right Mascot */}
            <div className="lg:col-span-5 flex justify-center lg:justify-end">
              <MascotOrb size="hero" showChips={false} />
            </div>
          </div>
        )}

        {/* Repo input bar — hidden on auth page */}
        {!hideRepoInput && (
        <motion.div id="hero-analyzer" custom={4} initial="hidden" animate="visible" variants={heroVariants}
          className={user ? '' : 'mt-16 md:mt-20 max-w-4xl mx-auto'}>
          <div className="p-3 md:p-4 rounded-2xl bg-white border border-[#E5E5E7] shadow-lg relative overflow-hidden">
            <form onSubmit={handleAnalyzeSubmit} className="flex flex-col sm:flex-row items-center gap-3">
              <div className="relative flex-1 w-full flex items-center">
                <Github className="absolute left-4 w-5 h-5 text-[#6B7280]" />
                <input type="text" value={repoUrl} onChange={(e) => setRepoUrl(e.target.value)}
                  placeholder="github.com/your-org/your-repo"
                  className="w-full pl-12 pr-4 py-3.5 rounded-xl bg-[#FAFAFA] border border-[#E5E5E7] text-[#111114] placeholder-[#9CA3AF] font-mono text-sm focus:outline-none focus:border-[#2563EB] transition-all" />
              </div>
              <button type="submit" disabled={isLoading}
                className="w-full sm:w-auto px-8 py-3.5 rounded-xl font-bold text-white bg-[#2563EB] hover:bg-[#1D4ED8] disabled:opacity-50 transition-all flex items-center justify-center gap-2 shrink-0">
                {isLoading
                  ? <><Loader2 className="w-5 h-5 animate-spin" /><span>{statusMsg || 'Analyzing…'}</span></>
                  : <><Sparkles className="w-4 h-4" /><span>Analyze Repo</span></>}
              </button>
            </form>

            {/* Sample repos */}
            <div className="mt-3 px-2 flex items-center flex-wrap gap-2 text-xs text-[#6B7290] font-mono">
              <span>Try example:</span>
              {sampleRepos.map((repo) => (
                <button key={repo} type="button" onClick={() => setRepoUrl(`https://github.com/${repo}`)}
                  className="px-2.5 py-1 rounded-md bg-[#FAFAFA] border border-[#E5E5E7] hover:border-[#2563EB]/40 hover:text-[#2563EB] transition-colors">
                  {repo}
                </button>
              ))}
            </div>

            {/* Error */}
            <AnimatePresence>
              {error && (
                <motion.div initial={{ opacity: 0, height: 0 }} animate={{ opacity: 1, height: 'auto' }} exit={{ opacity: 0, height: 0 }}
                  className="mt-3 flex items-center justify-between p-3 rounded-xl bg-red-50 border border-red-200 text-red-700 text-xs">
                  <div className="flex items-center gap-2"><AlertCircle className="w-4 h-4" /><span>{error}</span></div>
                  <button onClick={() => setError(null)} className="text-red-400 hover:text-red-600"><X className="w-4 h-4" /></button>
                </motion.div>
              )}
            </AnimatePresence>

            {/* Success */}
            <AnimatePresence>
              {analyzedSuccess && result && (
                <motion.div initial={{ opacity: 0, height: 0 }} animate={{ opacity: 1, height: 'auto' }} exit={{ opacity: 0, height: 0 }}
                  className="mt-4 p-4 rounded-xl bg-[#FAFAFA] border border-[#E5E5E7] text-left text-sm">
                  <div className="flex items-center justify-between mb-2">
                    <div className="flex items-center gap-2 text-[#4ADE80] font-semibold">
                      <CheckCircle className="w-4 h-4" /><span>Architecture Graph & AST Traces Mapped!</span>
                    </div>
                    <button onClick={() => setAnalyzedSuccess(false)} className="text-[#6B7280] hover:text-[#111114]">
                      <X className="w-4 h-4" />
                    </button>
                  </div>
                  <p className="text-[#6B7280] font-mono text-xs">
                    Target: <span className="text-[#111114]">{repoUrl}</span> · Agents: {result.agents_run.join(', ')}
                  </p>
                </motion.div>
              )}
            </AnimatePresence>
          </div>
        </motion.div>
        )}

        {/* ── Analyzing loader ── */}
        <AnalyzingLoader visible={isLoading} done={analyzedSuccess} />
      </div>

      {/* Demo Modal — logged-out only */}
      {!user && showDemoModal && <DemoModal onClose={() => setShowDemoModal(false)} />}
    </section>
  );
};
