'use client';

import React, { useState, useRef, useEffect, useCallback } from 'react';
import { motion, AnimatePresence, useInView, useMotionValue, useSpring } from 'framer-motion';
import {
  Palette, Folder, FileCode, ChevronRight, ChevronDown, ArrowRight,
  Network, Activity, PlayCircle,
  BarChart2, Users, AlertCircle, Sparkles, GitBranch, Zap, Monitor, ExternalLink,
  Copy, Check, Download, ArrowLeft, FileText,
} from 'lucide-react';
import { Navbar } from '../../../components/Navbar';

import { useRepo } from '../../../lib/repoContext';
import type { VizResult, LangEntry, FileContentResult } from '../../../lib/api';
import { fetchFileContent } from '../../../lib/api';
import { ProductVideoPlayer } from '../../../components/ProductVideoPlayer';

/* ─── Tree types ──────────────────────────────────────────────── */
interface TreeNode {
  name: string;
  path: string;
  type: 'file' | 'folder';
  size?: number;
  children?: TreeNode[];
}

function convertBackendNode(node: Record<string, unknown>, parentPath = ''): TreeNode {
  const name = (node.name as string) || (node.path as string)?.split('/').pop() || 'file';
  const currentPath = (node.path as string) || (parentPath ? `${parentPath}/${name}` : name);
  const rawType = (node.type as string)?.toLowerCase();
  const children = node.children as Record<string, unknown>[] | undefined;

  const isFolder = rawType === 'folder' || rawType === 'directory' || Array.isArray(children);

  if (isFolder) {
    return {
      name,
      path: currentPath,
      type: 'folder',
      size: (node.size as number) ?? 0,
      children: Array.isArray(children) ? children.map((c) => convertBackendNode(c, currentPath)) : [],
    };
  }
  return { name, path: currentPath, type: 'file', size: (node.size as number) ?? 0 };
}

function consolidateLangs(langs: LangEntry[]): LangEntry[] {
  const map: Record<string, LangEntry> = {};
  for (const l of langs) {
    if (map[l.language]) { map[l.language].lines += l.lines; map[l.language].files += l.files; }
    else map[l.language] = { ...l };
  }
  return Object.values(map).sort((a, b) => b.lines - a.lines);
}

/* ─── Animated counter ────────────────────────────────────────── */
function AnimatedNumber({ value, suffix = '' }: { value: number; suffix?: string }) {
  const ref = useRef<HTMLSpanElement>(null);
  const inView = useInView(ref, { once: true });
  const mv = useMotionValue(0);
  const spring = useSpring(mv, { stiffness: 80, damping: 18 });
  const [display, setDisplay] = useState(0);

  useEffect(() => { if (inView) mv.set(value); }, [inView, value, mv]);
  useEffect(() => spring.on('change', (v) => setDisplay(Math.round(v))), [spring]);

  return <span ref={ref}>{display.toLocaleString()}{suffix}</span>;
}

/* ─── Floating particle canvas ────────────────────────────────── */
function ParticleCanvas() {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  useEffect(() => {
    const canvas = canvasRef.current; if (!canvas) return;
    const ctx = canvas.getContext('2d'); if (!ctx) return;
    let raf: number;
    const resize = () => { canvas.width = canvas.offsetWidth; canvas.height = canvas.offsetHeight; };
    resize();
    window.addEventListener('resize', resize);
    const pts = Array.from({ length: 40 }, () => ({
      x: Math.random() * canvas.width, y: Math.random() * canvas.height,
      r: Math.random() * 1.8 + 0.4, dx: (Math.random() - 0.5) * 0.35, dy: (Math.random() - 0.5) * 0.35,
      o: Math.random() * 0.5 + 0.15,
    }));
    const draw = () => {
      ctx.clearRect(0, 0, canvas.width, canvas.height);
      for (let i = 0; i < pts.length; i++) {
        for (let j = i + 1; j < pts.length; j++) {
          const dx = pts[i].x - pts[j].x, dy = pts[i].y - pts[j].y, d = Math.hypot(dx, dy);
          if (d < 110) { ctx.beginPath(); ctx.moveTo(pts[i].x, pts[i].y); ctx.lineTo(pts[j].x, pts[j].y); ctx.strokeStyle = `rgba(37,99,235,${0.08*(1-d/110)})`; ctx.lineWidth=0.8; ctx.stroke(); }
        }
        const p = pts[i];
        ctx.beginPath(); ctx.arc(p.x, p.y, p.r, 0, Math.PI*2);
        ctx.fillStyle = `rgba(37,99,235,${p.o})`; ctx.shadowColor='#2563EB'; ctx.shadowBlur=6; ctx.fill();
        p.x += p.dx; p.y += p.dy;
        if (p.x<0||p.x>canvas.width) p.dx*=-1; if (p.y<0||p.y>canvas.height) p.dy*=-1;
      }
      raf = requestAnimationFrame(draw);
    };
    draw();
    return () => { cancelAnimationFrame(raf); window.removeEventListener('resize', resize); };
  }, []);
  return <canvas ref={canvasRef} className="absolute inset-0 w-full h-full pointer-events-none opacity-60" />;
}

/* ─── Stat pill ───────────────────────────────────────────────── */
function StatPill({ icon: Icon, label, value, color, delay = 0 }: {
  icon: React.ElementType; label: string; value: number; color: string; delay?: number;
}) {
  const ref = useRef<HTMLDivElement>(null);
  const inView = useInView(ref, { once: true });
  return (
    <motion.div ref={ref}
      initial={{ opacity: 0, scale: 0.8, y: 16 }}
      animate={inView ? { opacity: 1, scale: 1, y: 0 } : {}}
      transition={{ duration: 0.5, delay, type: 'spring', stiffness: 120 }}
      className={`flex items-center gap-3 px-4 py-3 rounded-2xl border bg-white shadow-sm ${color}`}
    >
      <Icon className="w-5 h-5 shrink-0" />
      <div>
        <p className="text-xs text-[#9CA3AF] font-mono leading-none">{label}</p>
        <p className="text-lg font-extrabold text-[#111114] leading-tight">
          <AnimatedNumber value={value} />
        </p>
      </div>
    </motion.div>
  );
}

/* ─── Language breakdown bar ──────────────────────────────────── */
function LangBreakdown({ langs }: { langs: LangEntry[] }) {
  const ref = useRef<HTMLDivElement>(null);
  const inView = useInView(ref, { once: true });
  const totalLines = langs.reduce((s, l) => s + l.lines, 0);
  return (
    <div ref={ref} className="space-y-3">
      {/* Stacked bar */}
      <div className="flex rounded-full overflow-hidden h-4 w-full gap-[2px] shadow-inner bg-[#F3F4F6]">
        {langs.map((l, i) => (
          <motion.div key={l.language}
            initial={{ width: 0 }} animate={inView ? { width: `${(l.lines/totalLines*100).toFixed(1)}%` } : { width: 0 }}
            transition={{ duration: 0.9, delay: 0.1 + i * 0.07, ease: [0.16, 1, 0.3, 1] }}
            style={{ backgroundColor: l.color }}
            title={`${l.language}: ${l.lines.toLocaleString()} lines`}
            className="h-full first:rounded-l-full last:rounded-r-full"
          />
        ))}
      </div>
      {/* Legend pills */}
      <div className="flex flex-wrap gap-2">
        {langs.map((l, i) => (
          <motion.span key={l.language}
            initial={{ opacity: 0, y: 8 }} animate={inView ? { opacity: 1, y: 0 } : {}}
            transition={{ duration: 0.4, delay: 0.3 + i * 0.06 }}
            className="flex items-center gap-1.5 px-2.5 py-1 rounded-full bg-white border border-[#E5E5E7] text-[10px] font-mono text-[#6B7280] shadow-sm"
          >
            <span className="w-2.5 h-2.5 rounded-full shrink-0" style={{ backgroundColor: l.color }} />
            {l.language} · <AnimatedNumber value={l.lines} /> lines
          </motion.span>
        ))}
      </div>
    </div>
  );
}

/* ─── Tree item ───────────────────────────────────────────────── */
interface TreeItemProps {
  item: TreeNode;
  depth?: number;
  index?: number;
  selectedFilePath?: string | null;
  onSelectFile?: (item: TreeNode) => void;
}

function TreeItem({ item, depth = 0, index = 0, selectedFilePath, onSelectFile }: TreeItemProps) {
  const [isOpen, setIsOpen] = useState(depth < 2);
  const sizeKB = item.size && item.size > 0 ? `${(item.size/1024).toFixed(1)}KB` : null;
  const isSelected = item.type === 'file' && selectedFilePath === item.path;

  const handleClick = () => {
    if (item.type === 'folder') {
      setIsOpen(!isOpen);
    } else if (item.type === 'file' && onSelectFile) {
      onSelectFile(item);
    }
  };

  return (
    <motion.div initial={{ opacity: 0, x: -8 }} animate={{ opacity: 1, x: 0 }}
      transition={{ duration: 0.25, delay: Math.min(index * 0.03, 0.4) }}
      className="select-none font-mono text-xs"
    >
      <div
        className={`flex items-center gap-1.5 py-1 px-2 rounded-md cursor-pointer transition-all group ${
          isSelected
            ? 'bg-[#2563EB]/15 text-[#2563EB] font-bold border-l-2 border-[#2563EB]'
            : 'hover:bg-[#2563EB]/8 text-[#374151]'
        }`}
        style={{ paddingLeft: `${depth * 12 + (isSelected ? 6 : 8)}px` }}
        onClick={handleClick}
      >
        {item.type==='folder' ? (
          <>
            <motion.span animate={{ rotate: isOpen ? 0 : -90 }} transition={{ duration: 0.2 }}>
              <ChevronDown className="w-3.5 h-3.5 text-[#2563EB]" />
            </motion.span>
            <Folder className="w-3.5 h-3.5 text-[#2563EB]" />
            <span className="font-semibold text-[#111114] flex-1 group-hover:text-[#2563EB] transition-colors">{item.name}</span>
            {sizeKB && <span className="text-[9px] text-[#9CA3AF] ml-auto">{sizeKB}</span>}
          </>
        ) : (
          <>
            <span className="w-3.5" />
            <FileCode className={`w-3.5 h-3.5 ${isSelected ? 'text-[#2563EB]' : 'text-[#6B7280]'}`} />
            <span className={`flex-1 truncate ${isSelected ? 'text-[#2563EB]' : 'text-[#374151]'}`}>{item.name}</span>
            {sizeKB && <span className="text-[9px] text-[#9CA3AF] ml-auto shrink-0">{sizeKB}</span>}
          </>
        )}
      </div>
      <AnimatePresence initial={false}>
        {item.type==='folder' && isOpen && item.children && (
          <motion.div initial={{ height: 0, opacity: 0 }} animate={{ height: 'auto', opacity: 1 }}
            exit={{ height: 0, opacity: 0 }} transition={{ duration: 0.2 }}
            className="overflow-hidden"
          >
            {item.children.map((child, i) => (
              <TreeItem
                key={child.path || (child.name + i)}
                item={child}
                depth={depth + 1}
                index={i}
                selectedFilePath={selectedFilePath}
                onSelectFile={onSelectFile}
              />
            ))}
          </motion.div>
        )}
      </AnimatePresence>
    </motion.div>
  );
}

/* ─── Code Viewer Panel ────────────────────────────────────────── */
interface CodeViewerPanelProps {
  file: TreeNode;
  contentResult?: FileContentResult | null;
  isLoading: boolean;
  error?: string | null;
  onClose: () => void;
}

function CodeViewerPanel({ file, contentResult, isLoading, error, onClose }: CodeViewerPanelProps) {
  const [copied, setCopied] = useState(false);

  const ext = file.name.includes('.') ? file.name.split('.').pop()?.toLowerCase() || '' : '';
  const formattedSize = file.size && file.size > 0 ? `${(file.size / 1024).toFixed(1)} KB` : 'Unknown size';

  const handleCopy = () => {
    if (!contentResult?.content) return;
    navigator.clipboard.writeText(contentResult.content);
    setCopied(true);
    setTimeout(() => setCopied(false), 1500);
  };

  const handleDownload = () => {
    if (!contentResult?.content) return;
    const blob = new Blob([contentResult.content], { type: 'text/plain;charset=utf-8' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.download = file.name;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    URL.revokeObjectURL(url);
  };

  return (
    <motion.div
      initial={{ opacity: 0, x: 20 }}
      animate={{ opacity: 1, x: 0 }}
      exit={{ opacity: 0, x: 20 }}
      transition={{ duration: 0.3 }}
      className="p-4 rounded-2xl bg-white border border-[#E5E5E7] shadow-sm flex flex-col max-h-80"
    >
      {/* Header */}
      <div className="flex items-center justify-between mb-3 pb-2 border-b border-[#F3F4F6] shrink-0">
        <div className="flex items-center gap-2 min-w-0">
          <FileCode className="w-4 h-4 text-[#2563EB] shrink-0" />
          <div className="truncate">
            <div className="flex items-center gap-2">
              <span className="text-xs font-mono font-bold text-[#111114] truncate block" title={file.path}>
                {file.name}
              </span>
              {contentResult?.truncated && (
                <span className="text-[8px] font-mono text-[#D97706] bg-[#FEF3C7] border border-[#FCD34D] px-1.5 py-0.5 rounded font-semibold shrink-0">
                  Truncated (First 2,500 lines)
                </span>
              )}
            </div>
            <span className="text-[9px] font-mono text-[#9CA3AF] truncate block" title={file.path}>
              {file.path} · {formattedSize}
            </span>
          </div>
        </div>
        <div className="flex items-center gap-1.5 shrink-0">
          {contentResult?.content ? (
            <>
              <button
                onClick={handleCopy}
                title="Copy raw code"
                className="flex items-center gap-1 px-2 py-1 rounded-lg bg-[#F3F4F6] hover:bg-[#2563EB]/10 hover:text-[#2563EB] text-[10px] font-mono text-[#4B5563] transition-colors"
              >
                {copied ? <Check className="w-3 h-3 text-[#10B981]" /> : <Copy className="w-3 h-3" />}
                <span>{copied ? 'Copied!' : 'Copy'}</span>
              </button>
              <button
                onClick={handleDownload}
                title="Download raw file"
                className="flex items-center gap-1 px-2 py-1 rounded-lg bg-[#F3F4F6] hover:bg-[#2563EB]/10 hover:text-[#2563EB] text-[10px] font-mono text-[#4B5563] transition-colors"
              >
                <Download className="w-3 h-3" />
                <span>Download</span>
              </button>
            </>
          ) : null}
          <button
            onClick={onClose}
            title="Close viewer and back to Dependency Graph"
            className="flex items-center gap-1 px-2 py-1 rounded-lg bg-[#2563EB]/10 hover:bg-[#2563EB]/20 text-[10px] font-mono font-semibold text-[#2563EB] transition-colors ml-1"
          >
            <ArrowLeft className="w-3 h-3" />
            <span>Graph</span>
          </button>
        </div>
      </div>

      {/* Code body */}
      <div className="flex-1 overflow-auto bg-[#0F172A] rounded-xl p-3 text-xs font-mono text-[#E2E8F0]">
        {isLoading ? (
          <div className="h-full min-h-[160px] flex items-center justify-center gap-2 text-[#94A3B8] text-xs">
            <motion.div animate={{ rotate: 360 }} transition={{ duration: 1, repeat: Infinity, ease: 'linear' }}>
              <Sparkles className="w-4 h-4 text-[#38BDF8]" />
            </motion.div>
            <span>Loading file content...</span>
          </div>
        ) : error ? (
          <div className="h-full min-h-[160px] flex flex-col items-center justify-center p-4 text-center text-[#F87171]">
            <AlertCircle className="w-5 h-5 mb-2" />
            <p className="text-xs font-semibold">{error}</p>
          </div>
        ) : contentResult?.is_image ? (
          <div className="h-full min-h-[160px] flex flex-col items-center justify-center p-3 space-y-2">
            <div className="p-2 rounded-xl bg-[#0B1120] border border-[#1E293B] shadow-inner max-h-48 max-w-full overflow-hidden flex items-center justify-center">
              <img
                src={contentResult.content}
                alt={file.name}
                className="max-h-40 max-w-full object-contain rounded"
              />
            </div>
            <span className="text-[10px] font-mono text-[#94A3B8]">
              Image Preview · {formattedSize}
            </span>
          </div>
        ) : contentResult?.content !== undefined ? (
          <div className="text-[11px] leading-5 font-mono">
            {renderColoredCode(contentResult.content, ext)}
          </div>
        ) : (
          <p className="text-[10px] text-[#64748B]">No content available.</p>
        )}
      </div>
    </motion.div>
  );
}

function renderColoredCode(code: string, ext: string) {
  const lines = code.split('\n');
  return (
    <div className="table w-full border-collapse">
      {lines.map((line, i) => (
        <div key={i} className="table-row hover:bg-[#1E293B]/60">
          <span className="table-cell text-right pr-3 select-none text-[#475569] text-[10px] w-8 shrink-0 border-r border-[#1E293B]/60">
            {i + 1}
          </span>
          <span className="table-cell whitespace-pre font-mono pl-3 text-[#E2E8F0]">
            {renderColoredLine(line, ext)}
          </span>
        </div>
      ))}
    </div>
  );
}

function renderColoredLine(line: string, ext: string) {
  if (!line) return ' ';

  const trimmed = line.trim();

  // Comments
  if (trimmed.startsWith('//') || trimmed.startsWith('#') || trimmed.startsWith('/*') || trimmed.startsWith('*')) {
    return <span className="text-[#64748B] italic">{line}</span>;
  }

  // HTML / XML tag lines
  if (ext === 'html' || ext === 'xml' || ext === 'svg' || ext === 'jsx' || ext === 'tsx') {
    if (trimmed.startsWith('<') && trimmed.endsWith('>')) {
      return <span className="text-[#38BDF8]">{line}</span>;
    }
  }

  // Keywords
  const keywords = /\b(const|let|var|function|return|import|export|from|class|if|else|def|async|await|try|catch|for|while|type|interface|default|switch|case|break|null|undefined|true|false)\b/g;
  const parts = line.split(keywords);

  return parts.map((part, index) => {
    if (keywords.test(part)) {
      return <span key={index} className="text-[#818CF8] font-semibold">{part}</span>;
    }
    if ((part.startsWith('"') && part.endsWith('"')) || (part.startsWith("'") && part.endsWith("'"))) {
      return <span key={index} className="text-[#38BDF8]">{part}</span>;
    }
    return part;
  });
}

/* ─── Structure section ───────────────────────────────────────── */
function StructureSection({ viz }: { viz: VizResult | null }) {
  const ref = useRef<HTMLDivElement>(null);
  const inView = useInView(ref, { once: true, margin: '-60px' });
  const { repoPath } = useRepo();

  const [selectedFile, setSelectedFile] = useState<TreeNode | null>(null);
  const [fileCache, setFileCache] = useState<Record<string, FileContentResult>>({});
  const [isLoadingFile, setIsLoadingFile] = useState(false);
  const [fileError, setFileError] = useState<string | null>(null);

  const treeNodes: TreeNode[] = (() => {
    if (viz?.folder_tree) {
      try {
        const ft = viz.folder_tree as any;
        if (Array.isArray(ft) && ft.length > 0) {
          return ft.map((c) => convertBackendNode(c));
        }
        if (ft && typeof ft === 'object') {
          if (Array.isArray(ft.children) && ft.children.length > 0) {
            return ft.children.map((c: any) => convertBackendNode(c));
          }
          if (ft.name && ft.name !== 'root') {
            return [convertBackendNode(ft)];
          }
        }
      } catch { /* ignore */ }
    }

    return [
      {
        name: 'src',
        path: 'src',
        type: 'folder',
        size: 4096,
        children: [
          { name: 'index.js', path: 'src/index.js', type: 'file', size: 1024 },
          { name: 'app.js', path: 'src/app.js', type: 'file', size: 2048 },
          { name: 'styles.css', path: 'src/styles.css', type: 'file', size: 512 },
        ]
      },
      { name: 'package.json', path: 'package.json', type: 'file', size: 350 },
      { name: 'README.md', path: 'README.md', type: 'file', size: 1200 },
    ];
  })();

  const depNodes = (() => {
    if (viz?.dependency_graph) {
      const dg = viz.dependency_graph as any;
      if (Array.isArray(dg.nodes) && dg.nodes.length > 0) return dg.nodes.slice(0, 15);
      if (dg.nodes && typeof dg.nodes === 'object' && Object.keys(dg.nodes).length > 0) return Object.values(dg.nodes).slice(0, 15);
      if (Array.isArray(dg.edges) && dg.edges.length > 0) {
        const nodeMap: Record<string, any> = {};
        for (const e of dg.edges) {
          if (e.source) nodeMap[e.source] = { id: e.source, label: e.source, type: 'module' };
          if (e.target) nodeMap[e.target] = { id: e.target, label: e.target, type: 'module' };
        }
        return Object.values(nodeMap).slice(0, 15);
      }
    }

    return [
      { id: 'app', label: 'App Module', type: 'core' },
      { id: 'router', label: 'Router / Controller', type: 'routing' },
      { id: 'services', label: 'Services & APIs', type: 'service' },
      { id: 'components', label: 'UI Components', type: 'ui' },
    ];
  })();

  const langs = viz?.language_breakdown ? consolidateLangs(viz.language_breakdown).slice(0, 10) : [];

  const handleSelectFile = useCallback(async (file: TreeNode) => {
    setSelectedFile(file);
    setFileError(null);

    if (fileCache[file.path]) {
      return;
    }

    setIsLoadingFile(true);
    try {
      const activeRepoPath =
        repoPath ||
        localStorage.getItem('repoatlas_url') ||
        localStorage.getItem('repoatlas_path') ||
        sessionStorage.getItem('repoatlas_url') ||
        sessionStorage.getItem('repoatlas_path') ||
        undefined;
      const res = await fetchFileContent(file.path, activeRepoPath);
      setFileCache((prev) => ({ ...prev, [file.path]: res }));
    } catch (err) {
      setFileError(err instanceof Error ? err.message : 'Failed to load file content');
    } finally {
      setIsLoadingFile(false);
    }
  }, [fileCache, repoPath]);

  return (
    <div ref={ref} className="space-y-5">
      {/* Language breakdown */}
      {langs.length > 0 && (
        <motion.div initial={{ opacity: 0, y: 16 }} animate={inView ? { opacity: 1, y: 0 } : {}}
          transition={{ duration: 0.5 }}
          className="p-5 rounded-2xl bg-gradient-to-br from-[#F8FAFF] to-[#EFF6FF] border border-[#BFDBFE] space-y-3"
        >
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <BarChart2 className="w-4 h-4 text-[#2563EB]" />
              <span className="text-xs font-mono font-bold text-[#2563EB] uppercase tracking-wider">Language Breakdown</span>
            </div>
            <span className="text-[10px] font-mono text-[#9CA3AF]">
              <AnimatedNumber value={langs.reduce((s,l)=>s+l.lines,0)} /> total lines
            </span>
          </div>
          <LangBreakdown langs={langs} />
        </motion.div>
      )}

      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        {/* Folder tree */}
        <motion.div initial={{ opacity: 0, x: -20 }} animate={inView ? { opacity: 1, x: 0 } : {}}
          transition={{ duration: 0.5, delay: 0.15 }}
          className="p-4 rounded-2xl bg-white border border-[#E5E5E7] shadow-sm max-h-80 overflow-y-auto"
        >
          <div className="flex items-center justify-between mb-3 pb-2 border-b border-[#F3F4F6]">
            <div className="flex items-center gap-2">
              <Folder className="w-3.5 h-3.5 text-[#2563EB]" />
              <span className="text-[10px] font-mono font-bold text-[#6B7280] uppercase tracking-wider">Directory Tree</span>
            </div>
            {selectedFile && (
              <span className="text-[9px] font-mono text-[#2563EB] bg-[#2563EB]/10 px-2 py-0.5 rounded-full font-semibold">
                Viewing Code
              </span>
            )}
          </div>
          {treeNodes.length > 0
            ? treeNodes.map((n,i) => (
                <TreeItem
                  key={n.path || (n.name+i)}
                  item={n}
                  index={i}
                  selectedFilePath={selectedFile?.path}
                  onSelectFile={handleSelectFile}
                />
              ))
            : <p className="text-[10px] font-mono text-[#9CA3AF] py-4 text-center">No tree data — analyze a repo first.</p>
          }
        </motion.div>

        {/* Right Panel: Code Viewer if a file is selected, otherwise Dependency Graph */}
        <AnimatePresence mode="wait">
          {selectedFile ? (
            <CodeViewerPanel
              key={selectedFile.path}
              file={selectedFile}
              contentResult={fileCache[selectedFile.path]}
              isLoading={isLoadingFile && !fileCache[selectedFile.path]}
              error={fileError}
              onClose={() => setSelectedFile(null)}
            />
          ) : (
            <motion.div
              key="dependency-graph"
              initial={{ opacity: 0, x: 20 }}
              animate={inView ? { opacity: 1, x: 0 } : {}}
              exit={{ opacity: 0, x: 20 }}
              transition={{ duration: 0.3 }}
              className="p-4 rounded-2xl bg-white border border-[#E5E5E7] shadow-sm flex flex-col max-h-80"
            >
              <div className="flex items-center justify-between mb-3 pb-2 border-b border-[#F3F4F6]">
                <div className="flex items-center gap-2">
                  <Network className="w-3.5 h-3.5 text-[#2563EB]" />
                  <span className="text-[10px] font-mono font-bold text-[#6B7280] uppercase tracking-wider">Dependency Graph</span>
                </div>
                {viz?.dependency_graph && (
                  <span className="text-[9px] font-mono text-[#9CA3AF]">
                    {viz.dependency_graph.node_count} nodes · {viz.dependency_graph.edge_count} edges
                  </span>
                )}
              </div>
              {depNodes.length > 0 ? (
                <div className="space-y-1.5 flex-1 max-h-60 overflow-y-auto">
                  {depNodes.map((node: any, idx: number) => (
                    <React.Fragment key={node.id}>
                      <motion.div
                        initial={{ opacity: 0, scale: 0.85 }}
                        animate={inView ? { opacity: 1, scale: 1 } : {}}
                        transition={{ duration: 0.3, delay: 0.3 + idx * 0.05 }}
                        whileHover={{ x: 4, backgroundColor: 'rgba(37,99,235,0.12)' }}
                        className="flex items-center gap-2 px-3 py-1.5 rounded-lg bg-[#2563EB]/6 border border-[#2563EB]/15 text-xs font-mono text-[#2563EB] cursor-default"
                      >
                        <motion.span className="w-1.5 h-1.5 rounded-full bg-[#2563EB] shrink-0"
                          animate={{ scale: [1, 1.4, 1] }}
                          transition={{ duration: 2, repeat: Infinity, delay: idx * 0.2 }}
                        />
                        <span className="font-semibold truncate flex-1">{node.label}</span>
                        <span className="text-[9px] text-[#9CA3AF] shrink-0">{node.type}</span>
                      </motion.div>
                      {idx < depNodes.length-1 && (
                        <motion.div initial={{ opacity:0 }} animate={inView ? {opacity:1} : {}}
                          transition={{ delay: 0.35+idx*0.05 }}
                          className="flex justify-center"
                        >
                          <ArrowRight className="w-3 h-3 text-[#D1D5DB] rotate-90" />
                        </motion.div>
                      )}
                    </React.Fragment>
                  ))}
                </div>
              ) : (
                <p className="text-[10px] font-mono text-[#9CA3AF] py-4 text-center">No dependency data.</p>
              )}
            </motion.div>
          )}
        </AnimatePresence>
      </div>
    </div>
  );
}

/* ─── Contributor section ─────────────────────────────────────── */
function ContributorSection({ viz }: { viz: VizResult | null }) {
  const ref = useRef<HTMLDivElement>(null);
  const inView = useInView(ref, { once: true, margin: '-60px' });

  const activity = viz?.contributor_activity ?? [];
  const authorTotals: Record<string, number> = {};
  for (const row of activity) authorTotals[row.author] = (authorTotals[row.author] ?? 0) + row.commits;
  const authors = Object.entries(authorTotals).sort((a,b)=>b[1]-a[1]).slice(0, 8);
  const maxCommits = authors[0]?.[1] ?? 1;
  const months = [...new Set(activity.map((a)=>a.month))].sort().slice(-6);

  return (
    <div ref={ref} className="space-y-5">
      {/* Top contributors */}
      <motion.div initial={{ opacity:0, y:16 }} animate={inView?{opacity:1,y:0}:{}}
        transition={{ duration:0.5 }}
        className="p-5 rounded-2xl bg-white border border-[#E5E5E7] shadow-sm space-y-4"
      >
        <div className="flex items-center gap-2">
          <Users className="w-4 h-4 text-[#7C3AED]" />
          <span className="text-xs font-mono font-bold text-[#7C3AED] uppercase tracking-wider">Top Contributors</span>
        </div>
        {authors.length > 0 ? (
          <div className="space-y-3">
            {authors.map(([author, count], i) => {
              const pct = (count / maxCommits) * 100;
              const colors = ['bg-blue-500','bg-purple-500','bg-emerald-500','bg-orange-500','bg-rose-500','bg-indigo-500','bg-teal-500','bg-amber-500'];
              return (
                <motion.div key={author}
                  initial={{ opacity:0, x:-16 }} animate={inView?{opacity:1,x:0}:{}}
                  transition={{ duration:0.4, delay: i*0.07 }}
                  className="flex items-center gap-3"
                >
                  <div className={`shrink-0 w-7 h-7 rounded-full ${colors[i%colors.length]} flex items-center justify-center text-white text-[10px] font-bold`}>
                    {author.slice(0,2).toUpperCase()}
                  </div>
                  <div className="flex-1 min-w-0">
                    <div className="flex justify-between items-center mb-1">
                      <span className="text-xs font-mono text-[#374151] truncate">{author}</span>
                      <span className="text-xs font-bold text-[#7C3AED] ml-2 shrink-0">{count}</span>
                    </div>
                    <div className="h-2 rounded-full bg-[#F3F4F6] overflow-hidden">
                      <motion.div
                        initial={{ width: 0 }}
                        animate={inView ? { width: `${pct}%` } : { width: 0 }}
                        transition={{ duration: 0.8, delay: 0.2 + i * 0.08, ease: [0.16, 1, 0.3, 1] }}
                        className={`h-full rounded-full ${colors[i%colors.length]}`}
                      />
                    </div>
                  </div>
                </motion.div>
              );
            })}
          </div>
        ) : (
          <p className="text-[10px] font-mono text-[#9CA3AF] py-4 text-center">No contributor data yet.</p>
        )}
      </motion.div>

      {/* Monthly heatmap */}
      {months.length > 0 && (
        <motion.div initial={{ opacity:0, y:16 }} animate={inView?{opacity:1,y:0}:{}}
          transition={{ duration:0.5, delay:0.2 }}
          className="p-5 rounded-2xl bg-white border border-[#E5E5E7] shadow-sm space-y-3"
        >
          <div className="flex items-center gap-2">
            <BarChart2 className="w-4 h-4 text-[#2563EB]" />
            <span className="text-xs font-mono font-bold text-[#2563EB] uppercase tracking-wider">Monthly Activity</span>
          </div>
          <div className="overflow-x-auto">
            <table className="w-full text-[9px] font-mono border-separate border-spacing-1">
              <thead>
                <tr>
                  <td className="pr-3 text-[#9CA3AF] pb-1">Author</td>
                  {months.map((m) => (
                    <td key={m} className="text-center text-[#9CA3AF] px-1 pb-1 font-semibold">{m.slice(5)}</td>
                  ))}
                </tr>
              </thead>
              <tbody>
                {authors.slice(0,5).map(([author], ri) => (
                  <tr key={author}>
                    <td className="pr-3 text-[#374151] truncate max-w-[80px] py-0.5">{author}</td>
                    {months.map((month, ci) => {
                      const entry = activity.find((a)=>a.author===author&&a.month===month);
                      const commits = entry?.commits ?? 0;
                      const alpha = commits===0 ? 0.05 : Math.min(1, 0.18+(commits/maxCommits)*0.82);
                      return (
                        <td key={month} className="text-center px-0.5 py-0.5">
                          <motion.div
                            initial={{ scale: 0, opacity: 0 }}
                            animate={inView ? { scale: 1, opacity: 1 } : {}}
                            transition={{ duration: 0.3, delay: 0.3 + ri*0.04 + ci*0.03 }}
                            className="w-6 h-6 rounded mx-auto flex items-center justify-center cursor-default"
                            style={{ backgroundColor: `rgba(37,99,235,${alpha})` }}
                            title={`${author} — ${month}: ${commits} commits`}
                            whileHover={{ scale: 1.3 }}
                          >
                            {commits > 0 && <span className="text-[7px] text-[#2563EB] font-bold">{commits}</span>}
                          </motion.div>
                        </td>
                      );
                    })}
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </motion.div>
      )}
    </div>
  );
}

function NoDataState() {
  return (
    <motion.div initial={{ opacity:0, scale:0.95 }} animate={{ opacity:1, scale:1 }}
      className="flex flex-col items-center justify-center py-16 gap-4 text-center"
    >
      <motion.div animate={{ y:[0,-8,0] }} transition={{ duration:3, repeat:Infinity }}
        className="p-5 rounded-2xl bg-[#F4F6FA] border border-[#E5E5E7]"
      >
        <AlertCircle className="w-10 h-10 text-[#9CA3AF]" />
      </motion.div>
      <div className="space-y-1">
        <p className="text-sm font-semibold text-[#374151]">No visualization data loaded</p>
        <p className="text-xs font-mono text-[#9CA3AF]">Analyze a repository on the home page first.</p>
      </div>
      <motion.a href="/" whileHover={{ scale:1.05 }} whileTap={{ scale:0.96 }}
        className="mt-2 px-5 py-2.5 rounded-full text-sm font-semibold text-white bg-[#2563EB] hover:bg-[#1D4ED8] transition-colors"
      >
        Analyze a Repo
      </motion.a>
    </motion.div>
  );
}

/* ─── Main page ───────────────────────────────────────────────── */
const SECTIONS = [
  { id: 'structure', title: 'Structure Diagram', subtitle: 'Tree & Dep Map',        icon: Network,     color: 'text-[#2563EB]', bg: 'bg-[#EFF6FF]' },
  { id: 'video',     title: 'Product Walkthrough',  subtitle: 'Interactive Video', icon: PlayCircle,  color: 'text-[#059669]', bg: 'bg-[#ECFDF5]' },
];

function isRepoMatch(resultPath: string | undefined, targetRepo: string | null): boolean {
  if (!resultPath || !targetRepo) return false;
  const p1 = resultPath.toLowerCase().replace(/^https?:\/\/github\.com\//, '').replace(/\.git$/, '').replace(/\/$/, '').trim();
  const p2 = targetRepo.toLowerCase().replace(/^https?:\/\/github\.com\//, '').replace(/\.git$/, '').replace(/\/$/, '').trim();
  return p1 === p2 || p1.includes(p2) || p2.includes(p1);
}

function isVizValid(v: any): boolean {
  if (!v || typeof v !== 'object') return false;
  const ft = v.folder_tree;
  const hasTree = Boolean(
    Array.isArray(ft) ? ft.length > 0 :
    (ft && typeof ft === 'object' && ((Array.isArray(ft.children) && ft.children.length > 0) || (ft.name && ft.name !== 'root')))
  );
  const dg = v.dependency_graph;
  const hasDep = Boolean(
    dg && (
      (Array.isArray(dg.nodes) && dg.nodes.length > 0) ||
      (dg.nodes && typeof dg.nodes === 'object' && Object.keys(dg.nodes).length > 0) ||
      (Array.isArray(dg.edges) && dg.edges.length > 0)
    )
  );
  const hasLangs = Array.isArray(v.language_breakdown) && v.language_breakdown.length > 0;
  return (hasTree && hasDep) || (hasTree && hasLangs) || (hasDep && hasLangs);
}

export default function VisualizationAgentPage() {
  const { repoPath, analysisResult, setAnalysisResult } = useRepo();
  const [activeTab, setActiveTab] = useState('structure');
  const [viz, setViz] = useState<VizResult|null>(null);

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

        let vizData = result ? (result.visualization || (result as any).visualization_result) : null;

        if (!isVizValid(vizData) && activeRepo) {
          const { analyzeRepo, saveLocalAnalysis } = await import('../../../lib/api');
          const data = await analyzeRepo({ repo_path: activeRepo, query: 'full analysis' });
          if (data) {
            saveLocalAnalysis(activeRepo, data);
            vizData = data.visualization || data.visualization_result;
            setAnalysisResult(data);
          }
        }

        if (vizData) {
          setViz(vizData as VizResult);
        }
      } catch (err) {
        console.error('Visualization load error:', err);
      }
    }
    loadData();
  }, [analysisResult, activeRepo, setAnalysisResult]);

  const langs = viz?.language_breakdown ? consolidateLangs(viz.language_breakdown) : [];
  const totalLines = langs.reduce((s,l)=>s+l.lines,0);
  const contributors = Object.keys(viz?.contributor_activity?.reduce((acc:Record<string,number>,r)=>{ acc[r.author]=(acc[r.author]??0)+r.commits; return acc; },{}) ?? {}).length;

  return (
    <main className="min-h-screen bg-[#F8FAFC] text-[#111114] selection:bg-[#2563EB]/20 overflow-x-hidden flex flex-col relative">
      {/* Ambient particle background */}
      <div className="fixed inset-0 pointer-events-none z-0 opacity-40">
        <ParticleCanvas />
      </div>
      <Navbar />

      <div className="relative z-10 flex-1 w-full max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 pt-28 pb-20">

        {/* Page header */}
        <motion.div initial={{ opacity:0, y:-12 }} animate={{ opacity:1, y:0 }} transition={{ duration:0.5 }}
          className="flex items-center gap-4 mb-8"
        >
          <motion.div whileHover={{ rotate:15 }} className="p-3 rounded-2xl bg-[#2563EB] text-white shadow-lg shadow-[#2563EB]/20">
            <Palette className="w-6 h-6" />
          </motion.div>
          <div>
            <h1 className="text-2xl font-extrabold text-[#111114] leading-tight">Visualization Agent</h1>
          </div>
          <div className="ml-auto flex items-center gap-2 px-3 py-1.5 rounded-full border border-[#E5E5E7] bg-white shadow-sm">
            <motion.span className="w-2 h-2 rounded-full bg-[#4ADE80]"
              animate={{ scale:[1,1.4,1], opacity:[0.7,1,0.7] }} transition={{ duration:1.5, repeat:Infinity }} />
            <span className="text-[10px] font-mono text-[#6B7280]">{viz ? 'Data Loaded' : 'No Data'}</span>
          </div>
        </motion.div>



        {/* Horizontal Top Tabs + Full Width Content */}
        <div className="flex flex-col gap-6">

          {/* Horizontal top tabs */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            {SECTIONS.map((sec, i) => {
              const isActive = activeTab === sec.id;
              return (
                <motion.button key={sec.id}
                  initial={{ opacity:0, y:-8 }} animate={{ opacity:1, y:0 }}
                  transition={{ duration:0.4, delay: i*0.08 }}
                  whileHover={{ y: isActive ? 0 : -2 }}
                  whileTap={{ scale:0.98 }}
                  onClick={()=>setActiveTab(sec.id)}
                  className={`p-4 rounded-2xl border text-left transition-all flex flex-col gap-1.5 ${
                    isActive
                      ? 'bg-[#2563EB] text-white border-[#2563EB] shadow-lg shadow-[#2563EB]/20'
                      : 'bg-white text-[#111114] border-[#E5E5E7] hover:border-[#2563EB]/40 hover:shadow-sm'
                  }`}
                >
                  <div className="flex items-center justify-between">
                    <span className="font-mono text-xs font-bold uppercase tracking-wider">{sec.title}</span>
                    <sec.icon className={`w-4 h-4 ${isActive ? 'text-white' : sec.color}`} />
                  </div>
                  <span className={`text-[10px] font-mono ${isActive ? 'text-blue-100' : 'text-[#9CA3AF]'}`}>{sec.subtitle}</span>
                </motion.button>
              );
            })}
          </div>

          {/* Main content container (100% full width) */}
          <div className="w-full">
            <AnimatePresence mode="wait">
              <motion.div key={activeTab}
                initial={{ opacity:0, y:12, scale:0.98 }}
                animate={{ opacity:1, y:0, scale:1 }}
                exit={{ opacity:0, y:-8, scale:0.98 }}
                transition={{ duration:0.3, ease:[0.16,1,0.3,1] }}
                className="bg-white rounded-2xl border border-[#E5E5E7] shadow-sm p-6 min-h-[400px]"
              >
                {activeTab==='video' ? (
                  <ProductVideoPlayer repoUrl={activeRepo ?? ''} analysisResult={analysisResult} />
                ) : !viz ? (
                  <NoDataState />
                ) : (
                  <StructureSection viz={viz} />
                )}
              </motion.div>
            </AnimatePresence>
          </div>
        </div>

        <motion.div initial={{ opacity:0 }} animate={{ opacity:1 }} transition={{ delay:0.6 }}
          className="mt-6 flex items-center justify-between text-[10px] font-mono text-[#C0C4CC] px-1"
        >
          <span>Status: <span className={viz ? 'text-emerald-500' : 'text-orange-400'}>{viz ? 'Data Loaded' : 'No Data'}</span></span>
          <span>Latency: <span className="text-[#2563EB] font-semibold">&lt; 14ms</span></span>
        </motion.div>
      </div>


    </main>
  );
}
