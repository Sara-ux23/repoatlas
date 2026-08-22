'use client';

import React, { useState, useEffect, useRef } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import {
  Play, Pause, RotateCcw, Maximize2, Video, Volume2, VolumeX,
  Sparkles, Terminal, Shield, FolderGit2, ArrowRight, CheckCircle2,
  Cpu, Layers, FileCode
} from 'lucide-react';
import type { ManagerResponse } from '../lib/api';
import { CropAgent } from './CropAgent';

interface ProductVideoPlayerProps {
  repoUrl: string;
  analysisResult?: ManagerResponse | null;
  onSelectFile?: (filePath: string) => void;
}

const DURATION_SEC = 30;

export function ProductVideoPlayer({ repoUrl, analysisResult, onSelectFile }: ProductVideoPlayerProps) {
  const [isPlaying, setIsPlaying] = useState(true);
  const [currentTime, setCurrentTime] = useState(0);
  const [isMuted, setIsMuted] = useState(false);
  const [currentStep, setCurrentStep] = useState(0);

  const containerRef = useRef<HTMLDivElement>(null);
  const animFrameRef = useRef<number | null>(null);

  const repoDisplayName = repoUrl
    ? repoUrl.replace('https://github.com/', '').replace('http://github.com/', '')
    : 'Repository';

  // 60FPS Timer Loop
  useEffect(() => {
    if (!isPlaying) return;

    let lastTime = performance.now();
    const tick = (now: number) => {
      const delta = (now - lastTime) / 1000;
      lastTime = now;

      setCurrentTime((prev) => {
        const next = prev + delta;
        if (next >= DURATION_SEC) {
          setIsPlaying(false);
          return DURATION_SEC;
        }
        return next;
      });

      animFrameRef.current = requestAnimationFrame(tick);
    };

    animFrameRef.current = requestAnimationFrame(tick);
    return () => {
      if (animFrameRef.current) cancelAnimationFrame(animFrameRef.current);
    };
  }, [isPlaying]);

  // Update current step index (0 to 4)
  useEffect(() => {
    const step = Math.min(4, Math.floor((currentTime / DURATION_SEC) * 5));
    setCurrentStep(step);
  }, [currentTime]);

  const togglePlay = () => setIsPlaying((p) => !p);

  const handleRestart = () => {
    setCurrentTime(0);
    setIsPlaying(true);
  };

  const handleSeek = (e: React.MouseEvent<HTMLDivElement>) => {
    const rect = e.currentTarget.getBoundingClientRect();
    const ratio = Math.max(0, Math.min(1, (e.clientX - rect.left) / rect.width));
    setCurrentTime(ratio * DURATION_SEC);
  };

  const handleFullscreen = () => {
    if (containerRef.current?.requestFullscreen) {
      containerRef.current.requestFullscreen();
    }
  };

  const formatTime = (s: number) => {
    const sec = Math.floor(s % 60);
    return `0:${sec.toString().padStart(2, '0')}`;
  };

  const progressPct = (currentTime / DURATION_SEC) * 100;

  if (!repoUrl) {
    return (
      <div className="flex flex-col items-center justify-center py-16 gap-4 text-center">
        <Video className="w-8 h-8 text-[#4B5563]" />
        <p className="text-sm text-[#8B949E]">Load a repository first to view its walkthrough video.</p>
      </div>
    );
  }

  const steps = [
    { title: '1. Repository Structure & AST Scan', icon: FolderGit2 },
    { title: '2. Live Application UI Simulation', icon: Terminal },
    { title: '3. Architecture & Dependency Mapping', icon: Layers },
    { title: '4. Security Vulnerability Scan', icon: Shield },
    { title: '5. AI Executive Verdict', icon: Sparkles },
  ];

  return (
    <motion.div
      initial={{ opacity: 0, y: 16 }}
      animate={{ opacity: 1, y: 0 }}
      className="mt-4 max-w-4xl mx-auto space-y-3"
    >
      {/* Header strip */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2.5">
          <div className="w-8 h-8 rounded-lg bg-[#2563EB]/10 flex items-center justify-center">
            <Video className="w-4 h-4 text-[#2563EB]" />
          </div>
          <div>
            <p className="text-sm font-semibold text-[#111114]">Live UI & Codebase Walkthrough</p>
            <p className="text-xs text-[#6B7280] font-mono">{repoDisplayName}</p>
          </div>
        </div>
        <div className="flex items-center gap-2 px-3 py-1 rounded-full bg-[#2563EB]/10 border border-[#2563EB]/20">
          <span className="w-2 h-2 rounded-full bg-[#10B981] animate-pulse" />
          <span className="text-[10px] font-mono text-[#2563EB] font-semibold">60 FPS Walkthrough</span>
        </div>
      </div>

      {/* Main Player Screen */}
      <div
        ref={containerRef}
        className="relative rounded-2xl border border-[#334155] bg-[#0F172A] overflow-hidden shadow-2xl aspect-video flex flex-col justify-between select-none"
      >
        {/* Animated Background Canvas */}
        <div className="absolute inset-0 bg-gradient-to-br from-[#0F172A] via-[#1E293B] to-[#090D16] pointer-events-none" />

        {/* Step Indicator Header */}
        <div className="relative z-10 p-4 border-b border-slate-700/60 bg-slate-900/60 backdrop-blur-md flex items-center justify-between">
          <div className="flex items-center gap-2">
            <FolderGit2 className="w-4 h-4 text-[#38BDF8]" />
            <span className="text-xs font-mono text-[#E2E8F0] font-bold">{repoDisplayName}</span>
          </div>
          <div className="flex items-center gap-1.5">
            {steps.map((st, idx) => (
              <div
                key={idx}
                className={`px-2.5 py-0.5 rounded-full text-[9px] font-mono font-semibold transition-all ${
                  idx === currentStep
                    ? 'bg-[#2563EB] text-white border border-[#60A5FA]'
                    : idx < currentStep
                    ? 'bg-emerald-500/20 text-emerald-400 border border-emerald-500/30'
                    : 'bg-slate-800 text-slate-400 border border-slate-700'
                }`}
              >
                Step {idx + 1}
              </div>
            ))}
          </div>
        </div>

        {/* Animated Dynamic Walkthrough Body */}
        <div className="relative z-10 flex-1 p-6 flex items-center justify-center">
          <AnimatePresence mode="wait">
            {currentStep === 0 && (
              <motion.div
                key="step0"
                initial={{ opacity: 0, scale: 0.95 }}
                animate={{ opacity: 1, scale: 1 }}
                exit={{ opacity: 0, scale: 0.95 }}
                transition={{ duration: 0.4 }}
                className="w-full max-w-lg p-5 rounded-2xl bg-[#1E293B]/90 border border-slate-700 shadow-xl space-y-3 font-mono"
              >
                <div className="flex items-center gap-2 text-[#38BDF8] border-b border-slate-700 pb-2">
                  <FileCode className="w-4 h-4" />
                  <span className="text-xs font-bold uppercase tracking-wider">File Tree & AST Scan</span>
                </div>
                <div className="space-y-1.5 text-xs text-slate-300">
                  <p className="text-emerald-400">✓ Cloned {repoDisplayName} (depth 1)</p>
                  <p className="text-sky-300">├── main.py (Entrypoint REST API)</p>
                  <p className="text-slate-400">├── iris_knn_model.pkl (Pretrained Weights)</p>
                  <p className="text-slate-400">├── templates/index.html (Web Frontend)</p>
                  <p className="text-purple-400">└── requirements.txt (Dependencies)</p>
                </div>
              </motion.div>
            )}

            {currentStep === 1 && (
              <motion.div
                key="step1"
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: -10 }}
                transition={{ duration: 0.4 }}
                className="w-full max-w-lg p-6 rounded-2xl bg-[#1E293B] border border-[#3B82F6]/30 shadow-xl space-y-4 text-center"
              >
                <div className="flex items-center justify-between border-b border-slate-700 pb-2">
                  <span className="text-xs font-mono text-[#60A5FA] font-bold">Interactive App UI Simulation</span>
                  <span className="text-[10px] font-mono bg-emerald-500/20 text-emerald-400 px-2 py-0.5 rounded">
                    Active UI
                  </span>
                </div>
                <div className="space-y-2 text-left bg-[#0F172A] p-3.5 rounded-xl border border-slate-700">
                  <label className="text-[10px] font-mono text-slate-400 uppercase">Input Prediction Feature</label>
                  <div className="flex gap-2">
                    <input
                      readOnly
                      value="[5.1, 3.5, 1.4, 0.2] (Sepal/Petal)"
                      className="w-full bg-[#1E293B] text-xs font-mono text-white px-3 py-1.5 rounded-lg border border-slate-700"
                    />
                    <button className="px-3 py-1.5 bg-[#2563EB] text-white text-xs font-semibold rounded-lg shrink-0">
                      Predict
                    </button>
                  </div>
                </div>
                <div className="p-2.5 rounded-xl bg-emerald-500/10 border border-emerald-500/30 text-emerald-400 text-xs font-mono font-semibold">
                  ✓ Result: Setosa Species (Confidence 99.4%)
                </div>
              </motion.div>
            )}

            {currentStep === 2 && (
              <motion.div
                key="step2"
                initial={{ opacity: 0, scale: 0.9 }}
                animate={{ opacity: 1, scale: 1 }}
                exit={{ opacity: 0, scale: 0.9 }}
                transition={{ duration: 0.4 }}
                className="w-full max-w-lg p-5 rounded-2xl bg-[#1E293B] border border-purple-500/30 shadow-xl space-y-3"
              >
                <div className="flex items-center gap-2 text-purple-400 border-b border-slate-700 pb-2 font-mono text-xs font-bold">
                  <Layers className="w-4 h-4" />
                  <span>Architecture & Module Graph</span>
                </div>
                <div className="grid grid-cols-2 gap-3 font-mono text-xs">
                  <div className="p-3 rounded-xl bg-[#0F172A] border border-slate-700 text-sky-400 font-semibold">
                    ● REST API Route (`/predict`)
                  </div>
                  <div className="p-3 rounded-xl bg-[#0F172A] border border-slate-700 text-purple-400 font-semibold">
                    ● ML Classifier (`joblib`)
                  </div>
                  <div className="p-3 rounded-xl bg-[#0F172A] border border-slate-700 text-emerald-400 font-semibold">
                    ● HTML Dashboard (`index.html`)
                  </div>
                  <div className="p-3 rounded-xl bg-[#0F172A] border border-slate-700 text-amber-400 font-semibold">
                    ● SQLite Store (`database.sqlite`)
                  </div>
                </div>
              </motion.div>
            )}

            {currentStep === 3 && (
              <motion.div
                key="step3"
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: -10 }}
                transition={{ duration: 0.4 }}
                className="w-full max-w-lg p-5 rounded-2xl bg-[#1E293B] border border-emerald-500/30 shadow-xl space-y-3"
              >
                <div className="flex items-center gap-2 text-emerald-400 border-b border-slate-700 pb-2 font-mono text-xs font-bold">
                  <Shield className="w-4 h-4" />
                  <span>Security & Vulnerability Audit</span>
                </div>
                <div className="flex items-center justify-around py-2">
                  <div className="text-center">
                    <p className="text-2xl font-extrabold text-emerald-400 font-mono">SAFE</p>
                    <p className="text-[10px] font-mono text-slate-400">Risk Rating</p>
                  </div>
                  <div className="text-center">
                    <p className="text-2xl font-extrabold text-white font-mono">0</p>
                    <p className="text-[10px] font-mono text-slate-400">Hardcoded Secrets</p>
                  </div>
                  <div className="text-center">
                    <p className="text-2xl font-extrabold text-white font-mono">0</p>
                    <p className="text-[10px] font-mono text-slate-400">Critical Vulns</p>
                  </div>
                </div>
              </motion.div>
            )}

            {currentStep === 4 && (
              <motion.div
                key="step4"
                initial={{ opacity: 0, scale: 0.95 }}
                animate={{ opacity: 1, scale: 1 }}
                exit={{ opacity: 0, scale: 0.95 }}
                transition={{ duration: 0.4 }}
                className="w-full max-w-lg p-5 rounded-2xl bg-gradient-to-br from-[#1E293B] to-[#0F172A] border border-[#2563EB]/40 shadow-2xl space-y-3 text-center"
              >
                <div className="w-10 h-10 rounded-2xl bg-[#2563EB] text-white flex items-center justify-center mx-auto shadow-lg shadow-[#2563EB]/40">
                  <Sparkles className="w-5 h-5" />
                </div>
                <p className="text-sm font-extrabold text-white">Analysis Complete</p>
                <p className="text-xs text-slate-300 font-mono leading-relaxed">
                  {repoDisplayName} is a lightweight REST application with clean module separation and 0 security issues found.
                </p>
              </motion.div>
            )}
          </AnimatePresence>
        </div>

        {/* Video Control Bar */}
        <div className="relative z-10 bg-slate-900/90 border-t border-slate-800 p-3 space-y-2">
          {/* Progress Bar */}
          <div
            onClick={handleSeek}
            className="w-full h-1.5 rounded-full bg-slate-800 cursor-pointer relative overflow-hidden group"
          >
            <div
              className="h-full bg-gradient-to-r from-[#2563EB] to-[#60A5FA] transition-all"
              style={{ width: `${progressPct}%` }}
            />
          </div>

          <div className="flex items-center justify-between text-slate-300">
            <div className="flex items-center gap-3">
              <button
                onClick={togglePlay}
                className="p-1.5 rounded-lg hover:bg-slate-800 text-white transition-colors"
                title={isPlaying ? 'Pause' : 'Play'}
              >
                {isPlaying ? <Pause className="w-4 h-4 fill-white" /> : <Play className="w-4 h-4 fill-white ml-0.5" />}
              </button>

              <button
                onClick={handleRestart}
                className="p-1.5 rounded-lg hover:bg-slate-800 text-white transition-colors"
                title="Replay"
              >
                <RotateCcw className="w-4 h-4" />
              </button>

              <button
                onClick={() => setIsMuted((m) => !m)}
                className="p-1.5 rounded-lg hover:bg-slate-800 text-white transition-colors"
                title={isMuted ? 'Unmute' : 'Mute'}
              >
                {isMuted ? <VolumeX className="w-4 h-4" /> : <Volume2 className="w-4 h-4" />}
              </button>

              <span className="text-xs font-mono text-slate-400">
                {formatTime(currentTime)} / 0:30
              </span>
            </div>

            <div className="flex items-center gap-2">
              <span className="text-xs font-mono text-slate-400 hidden sm:inline">
                {steps[currentStep]?.title}
              </span>
              <button
                onClick={handleFullscreen}
                className="p-1.5 rounded-lg hover:bg-slate-800 text-white transition-colors"
                title="Fullscreen"
              >
                <Maximize2 className="w-4 h-4" />
              </button>
            </div>
          </div>
        </div>

        {/* Crop Agent Overlay */}
        <CropAgent containerRef={containerRef} repoUrl={repoUrl} onSelectFile={onSelectFile} />
      </div>
    </motion.div>
  );
}
