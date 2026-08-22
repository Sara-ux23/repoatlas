'use client';

import React, { useState, useRef } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import {
  Video, RefreshCw, Maximize2, Monitor, Sparkles, FolderGit2,
  Terminal, Shield, Layers, FileCode
} from 'lucide-react';
import type { ManagerResponse } from '../lib/api';
import { CropAgent } from './CropAgent';

const BASE_URL = (import.meta as any).env?.VITE_API_URL || 'https://repoatlas.onrender.com';

interface ProductVideoPlayerProps {
  repoUrl: string;
  analysisResult?: ManagerResponse | null;
  onSelectFile?: (filePath: string) => void;
}

export function ProductVideoPlayer({ repoUrl, analysisResult, onSelectFile }: ProductVideoPlayerProps) {
  const [activeTab, setActiveTab] = useState<'actual_ui' | 'walkthrough'>('actual_ui');
  const [iframeKey, setIframeKey] = useState(0);
  const containerRef = useRef<HTMLDivElement>(null);

  const repoDisplayName = repoUrl
    ? repoUrl.replace('https://github.com/', '').replace('http://github.com/', '')
    : 'Repository';

  const handleFullscreen = () => {
    if (containerRef.current?.requestFullscreen) {
      containerRef.current.requestFullscreen();
    }
  };

  const handleReloadUI = () => {
    setIframeKey((k) => k + 1);
  };

  if (!repoUrl) {
    return (
      <div className="flex flex-col items-center justify-center py-16 gap-4 text-center">
        <Video className="w-8 h-8 text-[#4B5563]" />
        <p className="text-sm text-[#8B949E]">Load a repository first to view its project UI.</p>
      </div>
    );
  }

  const repoUiUrl = `${BASE_URL}/video/repo-ui-html?repo_url=${encodeURIComponent(repoUrl)}`;

  return (
    <motion.div
      initial={{ opacity: 0, y: 16 }}
      animate={{ opacity: 1, y: 0 }}
      className="mt-4 max-w-4xl mx-auto space-y-4"
    >
      {/* Header strip & Tab selector */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
        <div className="flex items-center gap-2.5">
          <div className="w-8 h-8 rounded-lg bg-[#2563EB]/10 flex items-center justify-center">
            <Monitor className="w-4 h-4 text-[#2563EB]" />
          </div>
          <div>
            <p className="text-sm font-semibold text-[#111114]">Target Repository Project UI</p>
            <p className="text-xs text-[#6B7280] font-mono">{repoDisplayName}</p>
          </div>
        </div>

        {/* View Mode Toggle Buttons */}
        <div className="flex items-center gap-1.5 p-1 rounded-xl bg-[#F1F5F9] border border-[#CBD5E1]">
          <button
            onClick={() => setActiveTab('actual_ui')}
            className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-semibold font-mono transition-all ${
              activeTab === 'actual_ui'
                ? 'bg-[#2563EB] text-white shadow-sm'
                : 'text-[#64748B] hover:text-[#0F172A]'
            }`}
          >
            <Monitor className="w-3.5 h-3.5" />
            <span>Actual Repo UI</span>
          </button>

          <button
            onClick={() => setActiveTab('walkthrough')}
            className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-semibold font-mono transition-all ${
              activeTab === 'walkthrough'
                ? 'bg-[#2563EB] text-white shadow-sm'
                : 'text-[#64748B] hover:text-[#0F172A]'
            }`}
          >
            <Sparkles className="w-3.5 h-3.5" />
            <span>AI Walkthrough</span>
          </button>
        </div>
      </div>

      {/* Main Container Card */}
      <div
        ref={containerRef}
        className="relative rounded-2xl border border-[#334155] bg-[#0F172A] overflow-hidden shadow-2xl aspect-video flex flex-col justify-between select-none"
      >
        {/* Header Bar */}
        <div className="relative z-10 p-3.5 border-b border-slate-700/80 bg-slate-900/90 backdrop-blur-md flex items-center justify-between">
          <div className="flex items-center gap-2">
            <span className="w-2.5 h-2.5 rounded-full bg-emerald-400 animate-pulse" />
            <span className="text-xs font-mono text-[#E2E8F0] font-bold truncate max-w-[280px]">
              {repoDisplayName} · {activeTab === 'actual_ui' ? 'Live Project Interface' : 'AI Analysis Walkthrough'}
            </span>
          </div>

          <div className="flex items-center gap-2">
            {activeTab === 'actual_ui' && (
              <button
                onClick={handleReloadUI}
                className="flex items-center gap-1 px-2.5 py-1 rounded-lg bg-slate-800 hover:bg-slate-700 text-[11px] font-mono text-slate-300 transition-colors"
                title="Reload interface"
              >
                <RefreshCw className="w-3 h-3" />
                <span>Reload</span>
              </button>
            )}
            <button
              onClick={handleFullscreen}
              className="p-1.5 rounded-lg bg-slate-800 hover:bg-slate-700 text-white transition-colors"
              title="Fullscreen"
            >
              <Maximize2 className="w-3.5 h-3.5" />
            </button>
          </div>
        </div>

        {/* Content Body */}
        <div className="relative z-10 flex-1 w-full h-full bg-[#0F172A] overflow-hidden">
          <AnimatePresence mode="wait">
            {activeTab === 'actual_ui' ? (
              <motion.div
                key={`ui-${iframeKey}`}
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                exit={{ opacity: 0 }}
                className="w-full h-full bg-white"
              >
                <iframe
                  key={iframeKey}
                  src={repoUiUrl}
                  title={`${repoDisplayName} Project UI`}
                  className="w-full h-full border-0"
                  sandbox="allow-scripts allow-forms allow-same-origin"
                />
              </motion.div>
            ) : (
              <motion.div
                key="walkthrough"
                initial={{ opacity: 0, scale: 0.98 }}
                animate={{ opacity: 1, scale: 1 }}
                exit={{ opacity: 0 }}
                className="w-full h-full p-6 flex flex-col items-center justify-center space-y-4 text-center font-mono"
              >
                <div className="w-12 h-12 rounded-2xl bg-[#2563EB] text-white flex items-center justify-center shadow-lg shadow-[#2563EB]/40">
                  <Sparkles className="w-6 h-6" />
                </div>
                <div className="space-y-1 max-w-md">
                  <h3 className="text-base font-bold text-white">Repository AI Overview</h3>
                  <p className="text-xs text-slate-400">
                    {analysisResult?.executive_summary ??
                      `Analyzed ${repoDisplayName}. Extracted architecture components, AST tree, and security ratings.`}
                  </p>
                </div>
                <div className="flex gap-2 pt-2">
                  <button
                    onClick={() => setActiveTab('actual_ui')}
                    className="px-4 py-2 rounded-xl bg-[#2563EB] hover:bg-[#1D4ED8] text-white text-xs font-semibold transition-all shadow-md flex items-center gap-1.5"
                  >
                    <Monitor className="w-3.5 h-3.5" />
                    Open Actual Repo UI
                  </button>
                </div>
              </motion.div>
            )}
          </AnimatePresence>
        </div>

        {/* Bottom Strip */}
        <div className="relative z-10 px-4 py-2.5 bg-slate-900/90 border-t border-slate-800 flex items-center justify-between text-[11px] font-mono text-slate-400">
          <div className="flex items-center gap-2">
            <FolderGit2 className="w-3.5 h-3.5 text-[#38BDF8]" />
            <span className="truncate">{repoUrl}</span>
          </div>
          <span className="text-emerald-400 font-semibold">Live Repo UI Environment</span>
        </div>

        {/* Crop Agent Overlay */}
        <CropAgent containerRef={containerRef} repoUrl={repoUrl} onSelectFile={onSelectFile} />
      </div>
    </motion.div>
  );
}
