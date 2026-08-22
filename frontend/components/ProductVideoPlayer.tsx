'use client';

import React, { useState, useEffect, useRef, useCallback } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Play, Pause, RotateCcw, Maximize2, Video, Loader2, RefreshCw, AlertCircle, Volume2, VolumeX } from 'lucide-react';
import { recordWalkthrough, getRecordingStatus, type RecordingResponse, type ManagerResponse } from '../lib/api';
import { CropAgent } from './CropAgent';

interface ProductVideoPlayerProps {
  repoUrl: string;
  analysisResult?: ManagerResponse | null;
  onSelectFile?: (filePath: string) => void;
}

type RecordingState = 'idle' | 'triggering' | 'recording' | 'ready' | 'error';

const POLL_INTERVAL_MS = 4000;
const MAX_POLLS = 45; // ~3 min timeout

export function ProductVideoPlayer({ repoUrl, analysisResult, onSelectFile }: ProductVideoPlayerProps) {
  const [state, setState] = useState<RecordingState>('idle');
  const [videoUrl, setVideoUrl] = useState<string | null>(null);
  const [errorMsg, setErrorMsg] = useState<string>('');
  const [isPlaying, setIsPlaying] = useState(false);
  const [isMuted, setIsMuted] = useState(true);
  const [progress, setProgress] = useState(0);
  const [duration, setDuration] = useState(0);
  const [pollCount, setPollCount] = useState(0);

  const containerRef = useRef<HTMLDivElement>(null);
  const videoRef = useRef<HTMLVideoElement>(null);
  const pollTimerRef = useRef<ReturnType<typeof setInterval> | null>(null);

  const stopPolling = useCallback(() => {
    if (pollTimerRef.current) {
      clearInterval(pollTimerRef.current);
      pollTimerRef.current = null;
    }
  }, []);

  // Build session_data payload from analysis result
  const buildSessionData = useCallback(() => {
    if (!analysisResult) return undefined;
    return {
      executive_summary: analysisResult.executive_summary ?? '',
      visualization: analysisResult.visualization ?? {},
      security: analysisResult.security ?? {},
      explorer: analysisResult.explorer ?? '',
      agents_run: analysisResult.agents_run ?? [],
    } as Record<string, unknown>;
  }, [analysisResult]);

  const startRecording = useCallback(async (forceRefresh = false) => {
    if (!repoUrl) return;
    setState('triggering');
    setErrorMsg('');
    setVideoUrl(null);
    setPollCount(0);
    stopPolling();

    try {
      const resp: RecordingResponse = await recordWalkthrough({
        repo_url: repoUrl,
        base_url: typeof window !== 'undefined' ? window.location.origin.replace('3000', '3001').replace('3001', '3001') : 'http://localhost:3001',
        session_data: buildSessionData(),
        force_refresh: forceRefresh,
      });


      if (resp.status === 'exists' || resp.status === 'ready') {
        setVideoUrl(resp.video_url ?? null);
        setState('ready');
        return;
      }

      // Recording kicked off — start polling
      setState('recording');
      pollTimerRef.current = setInterval(async () => {
        setPollCount(c => {
          if (c >= MAX_POLLS) {
            stopPolling();
            setState('error');
            setErrorMsg('Recording timed out. Try refreshing.');
            return c;
          }
          return c + 1;
        });

        try {
          const status: RecordingResponse = await getRecordingStatus(resp.repo_id);
          if (status.status === 'ready') {
            stopPolling();
            setVideoUrl(status.video_url ?? null);
            setState('ready');
          }
        } catch {
          // keep polling
        }
      }, POLL_INTERVAL_MS);
    } catch (err) {
      setState('error');
      setErrorMsg(err instanceof Error ? err.message : 'Failed to start recording.');
    }
  }, [repoUrl, buildSessionData, stopPolling]);

  // Do NOT auto-trigger — wait for user click so the tab loads instantly
  useEffect(() => {
    return stopPolling; // cleanup on unmount
  }, [stopPolling]);

  // Video event handlers
  const onTimeUpdate = () => {
    const v = videoRef.current;
    if (v && v.duration) setProgress((v.currentTime / v.duration) * 100);
  };
  const onLoadedMetadata = () => {
    if (videoRef.current) setDuration(videoRef.current.duration);
  };
  const onEnded = () => setIsPlaying(false);

  const togglePlay = () => {
    const v = videoRef.current;
    if (!v) return;
    if (v.paused) { v.play(); setIsPlaying(true); }
    else { v.pause(); setIsPlaying(false); }
  };

  const toggleMute = () => {
    const v = videoRef.current;
    if (!v) return;
    v.muted = !v.muted;
    setIsMuted(v.muted);
  };

  const handleSeek = (e: React.MouseEvent<HTMLDivElement>) => {
    const v = videoRef.current;
    if (!v || !v.duration) return;
    const rect = e.currentTarget.getBoundingClientRect();
    const ratio = (e.clientX - rect.left) / rect.width;
    v.currentTime = ratio * v.duration;
  };

  const handleFullscreen = () => {
    if (videoRef.current?.requestFullscreen) videoRef.current.requestFullscreen();
  };

  const restart = () => {
    const v = videoRef.current;
    if (!v) return;
    v.currentTime = 0;
    v.play();
    setIsPlaying(true);
  };

  const formatTime = (s: number) => {
    if (!s || isNaN(s)) return '0:00';
    const m = Math.floor(s / 60);
    const sec = Math.floor(s % 60);
    return `${m}:${sec.toString().padStart(2, '0')}`;
  };

  if (!repoUrl) {
    return (
      <div className="flex flex-col items-center justify-center py-16 gap-4 text-center">
        <Video className="w-8 h-8 text-[#4B5563]" />
        <p className="text-sm text-[#8B949E]">Load a repository first to record a walkthrough.</p>
      </div>
    );
  }

  const repoDisplayName = repoUrl.replace('https://github.com/', '').replace('http://github.com/', '');

  return (
    <motion.div
      initial={{ opacity: 0, y: 24 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.5, ease: 'easeOut' }}
      className="mt-10 max-w-4xl mx-auto"
    >
      {/* Section header */}
      <div className="flex items-center justify-between mb-4">
        <div className="flex items-center gap-2.5">
          <div className="w-8 h-8 rounded-lg bg-[#2563EB]/10 flex items-center justify-center">
            <Video className="w-4 h-4 text-[#2563EB]" />
          </div>
          <div>
            <p className="text-sm font-semibold text-[#111114]">Live UI Walkthrough</p>
            <p className="text-xs text-[#6B7280] font-mono">{repoDisplayName}</p>
          </div>
        </div>

        {/* Refresh button — only show when ready */}
        {state === 'ready' && (
          <button
            onClick={() => startRecording(true)}
            className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg border border-[#E5E5E7] text-xs text-[#6B7280] hover:text-[#2563EB] hover:border-[#2563EB]/40 transition-all"
          >
            <RefreshCw className="w-3.5 h-3.5" />
            Re-record
          </button>
        )}
      </div>

      {/* Player card */}
      <div ref={containerRef} className="relative rounded-2xl border border-[#E5E5E7] bg-[#0D1117] overflow-hidden shadow-xl">

        {/* ── Idle state: show start button ── */}
        <AnimatePresence mode="wait">
          {state === 'idle' && (
            <motion.div
              key="idle"
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              className="flex flex-col items-center justify-center py-20 px-6 text-center gap-5"
            >
              <div className="relative flex items-center justify-center">
                <div className="w-20 h-20 rounded-full bg-[#2563EB]/10 flex items-center justify-center">
                  <div className="w-14 h-14 rounded-full bg-[#2563EB]/15 flex items-center justify-center">
                    <Video className="w-7 h-7 text-[#2563EB]" />
                  </div>
                </div>
              </div>
              <div className="space-y-2">
                <p className="text-sm font-semibold text-white">Record a Live UI Walkthrough</p>
                <p className="text-xs text-[#8B949E] max-w-xs">
                  Capture a live Playwright walkthrough of <span className="text-white font-mono">{repoDisplayName}</span>'s interface. Takes ~2–3 minutes.
                </p>
              </div>
              <button
                onClick={() => startRecording(false)}
                className="flex items-center gap-2 px-5 py-2.5 rounded-xl bg-[#2563EB] hover:bg-[#1D4ED8] text-white text-sm font-semibold transition-colors shadow-lg"
              >
                <Play className="w-4 h-4 fill-white" />
                Start Recording
              </button>
            </motion.div>
          )}

          {/* ── Loading / Recording state ── */}
          {(state === 'triggering' || state === 'recording') && (
            <motion.div
              key="loading"
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              className="flex flex-col items-center justify-center py-20 px-6 text-center gap-5"
            >
              {/* Animated recording indicator */}
              <div className="relative flex items-center justify-center">
                <div className="w-20 h-20 rounded-full bg-[#2563EB]/10 flex items-center justify-center">
                  <div className="w-14 h-14 rounded-full bg-[#2563EB]/15 flex items-center justify-center">
                    <Loader2 className="w-7 h-7 text-[#2563EB] animate-spin" />
                  </div>
                </div>
                {/* Pulsing ring */}
                <span className="absolute inset-0 rounded-full border-2 border-[#2563EB]/30 animate-ping" />
              </div>

              <div className="space-y-2">
                <p className="text-sm font-semibold text-white">
                  {state === 'triggering' ? 'Starting UI recording…' : 'Recording your repo\'s interface…'}
                </p>
                <p className="text-xs text-[#8B949E] max-w-xs">
                  {state === 'triggering'
                    ? 'Launching headless browser and loading your repo\'s frontend.'
                    : `Capturing a live walkthrough of ${repoDisplayName}`}
                </p>
              </div>

              {/* Progress dots */}
              {state === 'recording' && (
                <div className="flex items-center gap-1.5">
                  {[0, 1, 2, 3, 4].map(i => (
                    <motion.span
                      key={i}
                      className="block w-1.5 h-1.5 rounded-full bg-[#2563EB]"
                      animate={{ opacity: [0.2, 1, 0.2] }}
                      transition={{ duration: 1.2, repeat: Infinity, delay: i * 0.2 }}
                    />
                  ))}
                  <span className="ml-2 text-xs text-[#8B949E] font-mono">
                    ~{Math.max(0, MAX_POLLS - pollCount) * (POLL_INTERVAL_MS / 1000)}s remaining
                  </span>
                </div>
              )}
            </motion.div>
          )}

          {/* ── Error state ── */}
          {state === 'error' && (
            <motion.div
              key="error"
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              className="flex flex-col items-center justify-center py-16 px-6 text-center gap-4"
            >
              <div className="w-14 h-14 rounded-full bg-red-500/10 flex items-center justify-center">
                <AlertCircle className="w-7 h-7 text-red-400" />
              </div>
              <div className="space-y-1">
                <p className="text-sm font-semibold text-white">Recording failed</p>
                <p className="text-xs text-[#8B949E]">{errorMsg}</p>
              </div>
              <button
                onClick={() => startRecording(true)}
                className="flex items-center gap-2 px-4 py-2 rounded-lg bg-[#2563EB] text-white text-xs font-semibold hover:bg-[#1D4ED8] transition-colors"
              >
                <RefreshCw className="w-3.5 h-3.5" />
                Try Again
              </button>
            </motion.div>
          )}

          {/* ── Video ready ── */}
          {state === 'ready' && videoUrl && (
            <motion.div
              key="video"
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              className="relative group"
            >
              {/* Video element */}
              <video
                ref={videoRef}
                src={videoUrl ? (videoUrl.startsWith('http') ? videoUrl : `/api${videoUrl.replace(/^\/api/, '')}`) : ''}
                className="w-full aspect-video object-cover"
                muted={isMuted}
                playsInline
                onTimeUpdate={onTimeUpdate}
                onLoadedMetadata={onLoadedMetadata}
                onEnded={onEnded}
                onClick={togglePlay}
                style={{ cursor: 'pointer' }}
              />

              {/* Big play overlay (shows when paused) */}
              <AnimatePresence>
                {!isPlaying && (
                  <motion.div
                    initial={{ opacity: 0, scale: 0.8 }}
                    animate={{ opacity: 1, scale: 1 }}
                    exit={{ opacity: 0, scale: 0.8 }}
                    transition={{ duration: 0.15 }}
                    className="absolute inset-0 flex items-center justify-center bg-black/30 cursor-pointer"
                    onClick={togglePlay}
                  >
                    <div className="w-16 h-16 rounded-full bg-white/90 shadow-2xl flex items-center justify-center hover:bg-white transition-colors">
                      <Play className="w-7 h-7 text-[#2563EB] fill-[#2563EB] ml-1" />
                    </div>
                  </motion.div>
                )}
              </AnimatePresence>

              {/* Controls bar */}
              <div className="absolute bottom-0 left-0 right-0 bg-gradient-to-t from-black/80 via-black/40 to-transparent px-4 pb-3 pt-8 opacity-0 group-hover:opacity-100 transition-opacity duration-200">

                {/* Seek bar */}
                <div
                  className="w-full h-1.5 rounded-full bg-white/20 cursor-pointer mb-3 relative"
                  onClick={handleSeek}
                >
                  <div
                    className="h-full rounded-full bg-[#2563EB] transition-all"
                    style={{ width: `${progress}%` }}
                  />
                  {/* Scrubber dot */}
                  <div
                    className="absolute top-1/2 -translate-y-1/2 w-3 h-3 rounded-full bg-white shadow-md"
                    style={{ left: `calc(${progress}% - 6px)` }}
                  />
                </div>

                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    {/* Play/Pause */}
                    <button onClick={togglePlay} className="w-8 h-8 flex items-center justify-center rounded-full hover:bg-white/10 transition-colors text-white">
                      {isPlaying
                        ? <Pause className="w-4 h-4 fill-current" />
                        : <Play className="w-4 h-4 fill-current ml-0.5" />
                      }
                    </button>

                    {/* Restart */}
                    <button onClick={restart} className="w-8 h-8 flex items-center justify-center rounded-full hover:bg-white/10 transition-colors text-white">
                      <RotateCcw className="w-3.5 h-3.5" />
                    </button>

                    {/* Mute */}
                    <button onClick={toggleMute} className="w-8 h-8 flex items-center justify-center rounded-full hover:bg-white/10 transition-colors text-white">
                      {isMuted ? <VolumeX className="w-4 h-4" /> : <Volume2 className="w-4 h-4" />}
                    </button>

                    {/* Time */}
                    <span className="text-xs text-white/70 font-mono ml-1">
                      {formatTime(videoRef.current?.currentTime ?? 0)} / {formatTime(duration)}
                    </span>
                  </div>

                  {/* Fullscreen */}
                  <button onClick={handleFullscreen} className="w-8 h-8 flex items-center justify-center rounded-full hover:bg-white/10 transition-colors text-white">
                    <Maximize2 className="w-4 h-4" />
                  </button>
                </div>
              </div>
            </motion.div>
          )}
        </AnimatePresence>

        {/* Bottom label strip */}
        {state === 'ready' && (
          <div className="flex items-center justify-between px-4 py-2.5 border-t border-white/5">
            <div className="flex items-center gap-2">
              <span className="relative flex h-2 w-2">
                <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-emerald-400 opacity-75" />
                <span className="relative inline-flex rounded-full h-2 w-2 bg-emerald-500" />
              </span>
              <span className="text-xs text-[#8B949E]">Recorded from live UI</span>
            </div>
            <span className="text-xs text-[#4B5563] font-mono">{repoDisplayName}</span>
          </div>
        )}

        {/* ── Crop to Code Agent Overlay ── */}
        <CropAgent containerRef={containerRef} repoUrl={repoUrl} onSelectFile={onSelectFile} />
      </div>
    </motion.div>
  );
}
