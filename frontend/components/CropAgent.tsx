'use client';

import React, { useState, useRef, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Crop, Crosshair, X, Check, Copy, Sparkles, CheckCircle2, AlertCircle, FileCode, Target, Layout, FormInput, MousePointer } from 'lucide-react';
import { fetchCropLookup, CropLookupResult } from '../lib/api';

interface CropAgentProps {
  containerRef: React.RefObject<HTMLDivElement>;
  repoUrl?: string | null;
  onSelectFile?: (filePath: string) => void;
}

export function CropAgent({ containerRef, repoUrl, onSelectFile }: CropAgentProps) {
  const [isCropping, setIsCropping] = useState(false);
  const [dragStart, setDragStart] = useState<{ x: number; y: number } | null>(null);
  const [selection, setSelection] = useState<{ x: number; y: number; w: number; h: number } | null>(null);
  const [mousePos, setMousePos] = useState<{ x: number; y: number } | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [result, setResult] = useState<CropLookupResult | null>(null);
  const [copied, setCopied] = useState(false);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);

  // Close crop mode on Escape key
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        setIsCropping(false);
        setSelection(null);
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, []);

  const triggerLookup = async (textHint: string, isModeAHint = false) => {
    setIsLoading(true);
    setResult(null);
    setErrorMsg(null);

    try {
      const res = await fetchCropLookup({
        repo_url: repoUrl || undefined,
        text_hint: textHint || 'UI Component Form Input Button',
      });

      if (isModeAHint) {
        res.mode = 'exact';
        res.confidence_label = 'Exact match';
      }

      setResult(res);
    } catch (err) {
      setErrorMsg(err instanceof Error ? err.message : 'Lookup failed');
    } finally {
      setIsLoading(false);
    }
  };

  const handleMouseDown = (e: React.MouseEvent<HTMLDivElement>) => {
    if (!containerRef.current) return;
    const rect = containerRef.current.getBoundingClientRect();
    const x = e.clientX - rect.left;
    const y = e.clientY - rect.top;
    setDragStart({ x, y });
    setSelection({ x, y, w: 0, h: 0 });
    setResult(null);
    setErrorMsg(null);
  };

  const handleMouseMove = (e: React.MouseEvent<HTMLDivElement>) => {
    if (!containerRef.current) return;
    const rect = containerRef.current.getBoundingClientRect();
    const currentX = Math.max(0, Math.min(rect.width, e.clientX - rect.left));
    const currentY = Math.max(0, Math.min(rect.height, e.clientY - rect.top));

    setMousePos({ x: currentX, y: currentY });

    if (!dragStart) return;

    const x = Math.min(dragStart.x, currentX);
    const y = Math.min(dragStart.y, currentY);
    const w = Math.abs(currentX - dragStart.x);
    const h = Math.abs(currentY - dragStart.y);

    setSelection({ x, y, w, h });
  };

  const handleMouseUp = async (e: React.MouseEvent<HTMLDivElement>) => {
    if (!containerRef.current) return;

    let textHint = '';
    let isModeA = false;

    // 1-Click Direct Inspect (If user clicks without dragging)
    if (!selection || selection.w < 10 || selection.h < 10) {
      const rect = containerRef.current.getBoundingClientRect();
      const clickX = e.clientX;
      const clickY = e.clientY;
      const el = document.elementFromPoint(clickX, clickY);

      if (el && el.textContent) {
        textHint = el.textContent.slice(0, 80).trim();
        if (el.getAttribute('data-source') || el.id) isModeA = true;
      }

      setDragStart(null);
      setSelection({
        x: Math.max(0, e.clientX - rect.left - 60),
        y: Math.max(0, e.clientY - rect.top - 40),
        w: 120,
        h: 80,
      });

      triggerLookup(textHint || 'Header Form Button Input UI Region', isModeA);
      return;
    }

    // Dragged selection box
    const selX = selection.x;
    const selY = selection.y;
    const selW = selection.w;
    const selH = selection.h;

    setDragStart(null);

    const el = document.elementFromPoint(
      containerRef.current.getBoundingClientRect().left + selX + selW / 2,
      containerRef.current.getBoundingClientRect().top + selY + selH / 2
    );

    if (el && el.textContent) {
      textHint = el.textContent.slice(0, 100).trim();
      if (el.getAttribute('data-source') || el.id) isModeA = true;
    }

    triggerLookup(textHint || 'Form Component UI Region', isModeA);
  };

  const handleCopyCode = () => {
    if (!result?.code_snippet) return;
    navigator.clipboard.writeText(result.code_snippet);
    setCopied(true);
    setTimeout(() => setCopied(false), 1500);
  };

  return (
    <>
      {/* Floating Agent Control Bar (Bottom-Right Corner) */}
      <div className="absolute bottom-4 right-4 z-40 flex items-center gap-2">
        {isCropping && (
          <motion.div
            initial={{ opacity: 0, x: 20 }}
            animate={{ opacity: 1, x: 0 }}
            exit={{ opacity: 0, x: 20 }}
            className="flex items-center gap-1.5 p-1 bg-[#0F172A]/90 backdrop-blur-md border border-[#334155] rounded-full shadow-2xl"
          >
            <button
              onClick={() => triggerLookup('input form sepal length width petal')}
              className="flex items-center gap-1 px-3 py-1.5 rounded-full text-[11px] font-mono font-semibold text-slate-200 hover:bg-[#2563EB] hover:text-white transition-colors"
            >
              <FormInput className="w-3.5 h-3.5" />
              <span>Inputs & Forms</span>
            </button>

            <button
              onClick={() => triggerLookup('button submit predict species click')}
              className="flex items-center gap-1 px-3 py-1.5 rounded-full text-[11px] font-mono font-semibold text-slate-200 hover:bg-[#2563EB] hover:text-white transition-colors"
            >
              <Target className="w-3.5 h-3.5" />
              <span>Buttons</span>
            </button>

            <button
              onClick={() => triggerLookup('header title h1 classifier form')}
              className="flex items-center gap-1 px-3 py-1.5 rounded-full text-[11px] font-mono font-semibold text-slate-200 hover:bg-[#2563EB] hover:text-white transition-colors"
            >
              <Layout className="w-3.5 h-3.5" />
              <span>Header</span>
            </button>
          </motion.div>
        )}

        <motion.button
          whileHover={{ scale: 1.05 }}
          whileTap={{ scale: 0.95 }}
          onClick={() => {
            setIsCropping(!isCropping);
            setSelection(null);
            setResult(null);
          }}
          className={`flex items-center gap-2 px-4 py-2.5 rounded-full shadow-xl transition-all font-mono text-xs font-bold ${
            isCropping
              ? 'bg-[#2563EB] text-white border-2 border-white shadow-[#2563EB]/40 animate-pulse'
              : 'bg-[#111114] text-white border border-[#374151] hover:bg-[#2563EB] hover:border-[#2563EB]'
          }`}
          title="Click to inspect any element or drag to crop region"
        >
          {isCropping ? <Crosshair className="w-4 h-4 text-white" /> : <Crop className="w-4 h-4 text-[#60A5FA]" />}
          <span>{isCropping ? 'Click UI or Drag to Crop (ESC)' : 'Crop to Code Agent'}</span>
        </motion.button>
      </div>

      {/* Transparent Crop Selection Overlay */}
      <AnimatePresence>
        {isCropping && (
          <div
            onMouseDown={handleMouseDown}
            onMouseMove={handleMouseMove}
            onMouseUp={handleMouseUp}
            className="absolute inset-0 z-50 cursor-crosshair select-none overflow-hidden bg-black/10 backdrop-blur-[1px]"
          >
            {/* Visual reticle box following cursor on hover */}
            {!selection && mousePos && (
              <div
                className="absolute border border-dashed border-[#60A5FA] bg-[#3B82F6]/10 rounded-lg pointer-events-none transition-all flex items-center justify-center"
                style={{
                  left: Math.max(0, mousePos.x - 75),
                  top: Math.max(0, mousePos.y - 45),
                  width: 150,
                  height: 90,
                }}
              >
                <span className="text-[9px] font-mono font-bold bg-[#2563EB] text-white px-2 py-0.5 rounded shadow-sm flex items-center gap-1">
                  <MousePointer className="w-2.5 h-2.5" /> Click to Inspect
                </span>
              </div>
            )}

            {/* Selection marquee rectangle */}
            {selection && selection.w > 2 && selection.h > 2 && (
              <div
                className="absolute border-2 border-[#2563EB] bg-[#2563EB]/25 rounded-lg pointer-events-none transition-all shadow-xl"
                style={{
                  left: selection.x,
                  top: selection.y,
                  width: selection.w,
                  height: selection.h,
                }}
              >
                <div className="absolute -top-6 left-0 px-2 py-0.5 rounded bg-[#2563EB] text-white text-[9px] font-mono font-bold shadow-md">
                  {Math.round(selection.w)} × {Math.round(selection.h)} px
                </div>
              </div>
            )}
          </div>
        )}
      </AnimatePresence>

      {/* Code Popover Result Panel */}
      <AnimatePresence>
        {(isLoading || result || errorMsg) && (
          <motion.div
            initial={{ opacity: 0, y: 16, scale: 0.95 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, y: 12, scale: 0.95 }}
            className="absolute bottom-16 right-4 z-50 w-full max-w-lg bg-white rounded-2xl border border-[#E5E5E7] shadow-2xl overflow-hidden font-sans"
          >
            {/* Popover Header */}
            <div className="flex items-center justify-between px-4 py-3 bg-[#F8FAFC] border-b border-[#E5E5E7]">
              <div className="flex items-center gap-2">
                <Sparkles className="w-4 h-4 text-[#2563EB]" />
                <span className="text-xs font-bold text-[#111114]">Crop-to-Code Result</span>
              </div>
              <button
                onClick={() => {
                  setResult(null);
                  setErrorMsg(null);
                  setIsCropping(false);
                  setSelection(null);
                }}
                className="p-1 rounded-lg text-[#9CA3AF] hover:text-[#111114] hover:bg-[#E5E5E7] transition-colors"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            <div className="p-4 space-y-3">
              {isLoading && (
                <div className="flex items-center justify-center py-8 gap-3 text-[#2563EB]">
                  <div className="w-6 h-6 border-3 border-[#2563EB]/20 border-t-[#2563EB] rounded-full animate-spin" />
                  <span className="text-xs font-mono font-semibold">Analyzing UI region & mapping to repo code…</span>
                </div>
              )}

              {errorMsg && (
                <div className="flex items-center gap-2 p-3 rounded-xl bg-red-50 text-red-700 text-xs font-medium border border-red-200">
                  <AlertCircle className="w-4 h-4 shrink-0" />
                  <span>{errorMsg}</span>
                </div>
              )}

              {result && !isLoading && (
                <>
                  {/* Mode & Confidence Badge */}
                  <div className="flex items-center justify-between flex-wrap gap-2">
                    <span
                      className={`inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-[10px] font-mono font-extrabold border ${
                        result.mode === 'exact'
                          ? 'bg-emerald-50 text-[#059669] border-emerald-200'
                          : 'bg-amber-50 text-[#D97706] border-amber-200'
                      }`}
                    >
                      {result.mode === 'exact' ? <CheckCircle2 className="w-3 h-3" /> : <Sparkles className="w-3 h-3" />}
                      {result.confidence_label}
                    </span>

                    <button
                      onClick={handleCopyCode}
                      className="flex items-center gap-1.5 px-3 py-1 rounded-lg bg-[#F1F5F9] hover:bg-[#E2E8F0] text-[#334155] text-xs font-mono font-semibold transition-colors"
                    >
                      {copied ? <Check className="w-3.5 h-3.5 text-emerald-600" /> : <Copy className="w-3.5 h-3.5" />}
                      <span>{copied ? 'Copied!' : 'Copy Code'}</span>
                    </button>
                  </div>

                  {/* Target File Link */}
                  <div className="flex items-center gap-2 text-xs font-mono font-bold text-[#2563EB]">
                    <FileCode className="w-4 h-4 shrink-0 text-[#2563EB]" />
                    <button
                      onClick={() => onSelectFile?.(result.file_path)}
                      className="hover:underline truncate text-left"
                    >
                      {result.file_path}
                    </button>
                  </div>

                  {/* Code snippet container */}
                  <div className="bg-[#0F172A] rounded-xl p-3 text-slate-100 font-mono text-xs overflow-x-auto max-h-56 border border-slate-800 leading-relaxed">
                    <pre>{result.code_snippet}</pre>
                  </div>

                  {/* Reasoning note */}
                  {result.explanation && (
                    <p className="text-[11px] text-[#64748B] italic leading-relaxed bg-[#F8FAFC] p-2.5 rounded-lg border border-[#E2E8F0]">
                      💡 {result.explanation}
                    </p>
                  )}
                </>
              )}
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </>
  );
}
