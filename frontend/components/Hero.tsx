import React, { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Github, Sparkles, Play, ArrowRight, CheckCircle, Code2, Loader2, X, Terminal } from 'lucide-react';
import { MascotOrb } from './MascotOrb';
import { heroVariants } from '../lib/animations';

interface HeroProps {
  onAnalyze?: (url: string) => void;
}

export const Hero: React.FC<HeroProps> = ({ onAnalyze }) => {
  const [repoUrl, setRepoUrl] = useState('');
  const [isSimulating, setIsSimulating] = useState(false);
  const [showDemoModal, setShowDemoModal] = useState(false);
  const [analyzedSuccess, setAnalyzedSuccess] = useState(false);

  const handleAnalyzeSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!repoUrl.trim()) return;

    setIsSimulating(true);
    setTimeout(() => {
      setIsSimulating(false);
      setAnalyzedSuccess(true);
      if (onAnalyze) onAnalyze(repoUrl);
    }, 2000);
  };

  const sampleRepos = [
    'facebook/react',
    'vercel/next.js',
    'openai/whisper',
    'fastapi/fastapi',
  ];

  return (
    <section className="relative pt-32 pb-20 md:pt-40 md:pb-28 overflow-hidden bg-white">
      {/* Ambient background blob field removed */}

      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 relative z-10">
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-12 items-center">
          {/* Left Hero Content */}
          <div className="lg:col-span-7 space-y-6 text-left">
            {/* Pill Badge */}
            <motion.div
              custom={0}
              initial="hidden"
              animate="visible"
              variants={heroVariants}
              className="inline-flex items-center gap-3 px-6 py-2.5 rounded-full bg-white border border-[#E5E5E7] shadow-md hover:border-[#2563EB]/40 transition-all"
            >
              <span className="relative flex h-3.5 w-3.5 items-center justify-center shrink-0">
                <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-[#4ADE80] opacity-75" />
                <span className="relative inline-flex rounded-full h-3 w-3 bg-emerald-500" />
              </span>
              <span className="text-sm font-mono text-[#2563EB] font-semibold tracking-wide">
                Now supporting Python, JS/TS, Go & Rust
              </span>
            </motion.div>

            {/* Main Headline */}
            <motion.h1
              custom={1}
              initial="hidden"
              animate="visible"
              variants={heroVariants}
              className="text-4xl sm:text-5xl md:text-6xl xl:text-7xl font-extrabold tracking-tight text-[#111114] leading-[1.1]"
            >
              <span className="text-[#2563EB]">
                See your codebase.
              </span>{' '}
              Not just search it.
            </motion.h1>

            {/* Subheadline */}
            <motion.p
              custom={2}
              initial="hidden"
              animate="visible"
              variants={heroVariants}
              className="text-lg md:text-xl text-[#6B7280] max-w-2xl leading-relaxed font-sans"
            >
              Paste a GitHub repo. RepoAtlas AI's agents explore it, trace how features actually work, and hand you an interactive visual map — architecture, dependencies, and execution flow, explained in plain English.
            </motion.p>

            {/* CTA Button Row */}
            <motion.div
              custom={3}
              initial="hidden"
              animate="visible"
              variants={heroVariants}
              className="flex flex-wrap items-center gap-4 pt-2"
            >
              <a
                href="#hero-analyzer"
                className="px-7 py-3.5 rounded-full font-semibold text-white bg-[#2563EB] shadow-sm hover:shadow-md transition-all duration-300 flex items-center gap-2.5 text-base"
              >
                <Sparkles className="w-5 h-5 text-white" />
                Analyze a Repo
                <ArrowRight className="w-4 h-4" />
              </a>

              <button
                onClick={() => setShowDemoModal(true)}
                className="px-6 py-3.5 rounded-full font-semibold text-[#111114] bg-white border border-[#E5E5E7] hover:bg-[#FAFAFA] transition-all duration-300 flex items-center gap-2.5 text-base"
              >
                <div className="w-7 h-7 rounded-full bg-[#2563EB]/10 flex items-center justify-center">
                  <Play className="w-3.5 h-3.5 text-[#2563EB] fill-[#2563EB]" />
                </div>
                Watch Demo
              </button>
            </motion.div>
          </div>

          {/* Right Mascot + Orb floating display */}
          <div className="lg:col-span-5 flex justify-center lg:justify-end">
            <MascotOrb size="hero" showChips={false} />
          </div>
        </div>

        {/* Live Input Bar Mockup under hero fold line */}
        <motion.div
          id="hero-analyzer"
          custom={4}
          initial="hidden"
          animate="visible"
          variants={heroVariants}
          className="mt-16 md:mt-20 max-w-4xl mx-auto"
        >
          <div className="p-3 md:p-4 rounded-2xl bg-white border border-[#E5E5E7] shadow-lg relative overflow-hidden group">
            <form onSubmit={handleAnalyzeSubmit} className="flex flex-col sm:flex-row items-center gap-3">
              <div className="relative flex-1 w-full flex items-center">
                <Github className="absolute left-4 w-5 h-5 text-[#6B7280]" />
                <input
                  type="text"
                  value={repoUrl}
                  onChange={(e) => setRepoUrl(e.target.value)}
                  placeholder="github.com/your-org/your-repo"
                  className="w-full pl-12 pr-4 py-3.5 rounded-xl bg-[#FAFAFA] border border-[#E5E5E7] text-[#111114] placeholder-[#9CA3AF] font-mono text-sm focus:outline-none focus:border-[#2563EB] transition-all"
                />
              </div>

              <button
                type="submit"
                disabled={isSimulating}
                className="w-full sm:w-auto px-8 py-3.5 rounded-xl font-bold text-white bg-[#2563EB] hover:bg-[#1D4ED8] disabled:opacity-50 transition-all flex items-center justify-center gap-2 font-sans shrink-0"
              >
                {isSimulating ? (
                  <>
                    <Loader2 className="w-5 h-5 animate-spin" />
                    <span>Mapping AST...</span>
                  </>
                ) : (
                  <>
                    <Sparkles className="w-4 h-4" />
                    <span>Analyze Repo</span>
                  </>
                )}
              </button>
            </form>

            {/* Quick Sample Clickers */}
            <div className="mt-3 px-2 flex items-center flex-wrap gap-2 text-xs text-[#6B7290] font-mono">
              <span>Try example:</span>
              {sampleRepos.map((repo) => (
                <button
                  key={repo}
                  type="button"
                  onClick={() => setRepoUrl(`https://github.com/${repo}`)}
                  className="px-2.5 py-1 rounded-md bg-[#FAFAFA] border border-[#E5E5E7] hover:border-[#2563EB]/40 hover:text-[#2563EB] transition-colors"
                >
                  {repo}
                </button>
              ))}
            </div>

            {/* Analysis Simulation Results Alert */}
            <AnimatePresence>
              {analyzedSuccess && (
                <motion.div
                  initial={{ opacity: 0, height: 0 }}
                  animate={{ opacity: 1, height: 'auto' }}
                  exit={{ opacity: 0, height: 0 }}
                  className="mt-4 p-4 rounded-xl bg-[#FAFAFA] border border-[#E5E5E7] text-left text-sm"
                >
                  <div className="flex items-center justify-between mb-2">
                    <div className="flex items-center gap-2 text-[#4ADE80] font-semibold">
                      <CheckCircle className="w-4 h-4" />
                      <span>Architecture Graph & AST Traces Mapped!</span>
                    </div>
                    <button onClick={() => setAnalyzedSuccess(false)} className="text-[#6B7280] hover:text-[#111114]">
                      <X className="w-4 h-4" />
                    </button>
                  </div>
                  <p className="text-[#6B7280] font-mono text-xs">
                    Target: <span className="text-[#111114]">{repoUrl}</span> • Parsed 142 files, 3,420 AST nodes, 5 agent sub-routines ready below!
                  </p>
                </motion.div>
              )}
            </AnimatePresence>
          </div>
        </motion.div>
      </div>

      {/* Video Demo Modal */}
      {showDemoModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-[#111114]/80 backdrop-blur-sm">
          <div className="relative w-full max-w-4xl bg-white rounded-2xl border border-[#E5E5E7] p-6 shadow-2xl space-y-4">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2 text-[#111114] font-bold text-lg">
                <Terminal className="w-5 h-5 text-[#2563EB]" />
                RepoAtlas AI — Product Tour Walkthrough
              </div>
              <button onClick={() => setShowDemoModal(false)} className="text-[#6B7280] hover:text-[#111114]">
                <X className="w-6 h-6" />
              </button>
            </div>
            {/* Interactive Simulated Video Frame */}
            <div className="aspect-video w-full rounded-xl bg-[#FAFAFA] border border-[#E5E5E7] flex flex-col items-center justify-center relative overflow-hidden group">
              <div className="absolute inset-0 bg-white/50" />
              <MascotOrb size="md" />
              <div className="z-10 text-center space-y-2 mt-4">
                <h4 className="text-xl font-bold text-[#111114]">Live Codebase Tracing Demo</h4>
                <p className="text-sm text-[#6B7280] font-mono">Simulating 5-agent parallel extraction sequence...</p>
              </div>
            </div>
          </div>
        </div>
      )}
    </section>
  );
};
