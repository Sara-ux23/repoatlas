'use client';

import React, { useState, useRef, useEffect } from 'react';
import { motion, useInView } from 'framer-motion';
import {
  Palette, Folder, FileCode, ChevronRight, ChevronDown, ArrowRight,
  Play, Pause, Volume2, VolumeX, Network, Activity, PlayCircle,
  BarChart2, Users, AlertCircle,
} from 'lucide-react';
import { Navbar } from '../../../components/Navbar';
import { Footer } from '../../../components/Footer';
import { useRepo } from '../../../lib/repoContext';
import type { VizResult, LangEntry } from '../../../lib/api';
import { recordWalkthrough, getRecordingStatus } from '../../../lib/api';

/* ─────────────────────────────────────────────
   Tree types — mirrors backend {name, size, children?}
───────────────────────────────────────────── */
interface TreeNode {
  name: string;
  type: 'file' | 'folder';
  size?: number;
  children?: TreeNode[];
}

/* ─────────────────────────────────────────────
   Convert backend node {name, size, children?} → TreeNode
   The backend returns a recursive structure, not a plain dict of keys.
───────────────────────────────────────────── */
function convertBackendNode(node: Record<string, unknown>): TreeNode {
  const name = (node.name as string) || 'unknown';
  const children = node.children as Record<string, unknown>[] | undefined;
  if (Array.isArray(children)) {
    return {
      name,
      type: 'folder',
      size: (node.size as number) ?? 0,
      children: children.map((c) => convertBackendNode(c)),
    };
  }
  return { name, type: 'file', size: (node.size as number) ?? 0 };
}

/* ─────────────────────────────────────────────
   TreeItem
───────────────────────────────────────────── */
function TreeItem({ item, depth = 0 }: { item: TreeNode; depth?: number }) {
  const [isOpen, setIsOpen] = useState(depth < 2);
  const sizeKB = item.size && item.size > 0 ? `${(item.size / 1024).toFixed(1)}KB` : null;
  return (
    <div className="select-none font-mono text-xs">
      <div
        className="flex items-center gap-1.5 py-1 px-2 rounded-md hover:bg-[#2563EB]/10 cursor-pointer transition-colors"
        style={{ paddingLeft: `${depth * 12 + 8}px` }}
        onClick={() => item.type === 'folder' && setIsOpen(!isOpen)}
      >
        {item.type === 'folder' ? (
          <>
            {isOpen ? <ChevronDown className="w-3.5 h-3.5 text-[#2563EB]" /> : <ChevronRight className="w-3.5 h-3.5 text-[#9CA3AF]" />}
            <Folder className="w-3.5 h-3.5 text-[#2563EB]" />
            <span className="font-semibold text-[#111114] flex-1">{item.name}</span>
            {sizeKB && <span className="text-[9px] text-[#9CA3AF] ml-auto">{sizeKB}</span>}
          </>
        ) : (
          <>
            <span className="w-3.5" />
            <FileCode className="w-3.5 h-3.5 text-[#6B7280]" />
            <span className="text-[#374151] flex-1">{item.name}</span>
            {sizeKB && <span className="text-[9px] text-[#9CA3AF] ml-auto">{sizeKB}</span>}
          </>
        )}
      </div>
      {item.type === 'folder' && isOpen && item.children && (
        <div>
          {item.children.map((child, i) => (
            <TreeItem key={child.name + i} item={child} depth={depth + 1} />
          ))}
        </div>
      )}
    </div>
  );
}

/* ─────────────────────────────────────────────
   Language breakdown — merged by language name
───────────────────────────────────────────── */
function consolidateLangs(langs: LangEntry[]): LangEntry[] {
  const map: Record<string, LangEntry> = {};
  for (const l of langs) {
    if (map[l.language]) {
      map[l.language].lines += l.lines;
      map[l.language].files += l.files;
    } else {
      map[l.language] = { ...l };
    }
  }
  return Object.values(map).sort((a, b) => b.lines - a.lines);
}

/* ─────────────────────────────────────────────
   Structure Section
───────────────────────────────────────────── */
function StructureSection({ viz }: { viz: VizResult | null }) {
  const ref = useRef<HTMLDivElement>(null);
  const inView = useInView(ref, { once: true });

  // Properly convert the backend's {name, size, children} tree
  const treeNodes: TreeNode[] = (() => {
    if (!viz?.folder_tree) return [];
    try {
      const root = convertBackendNode(viz.folder_tree as Record<string, unknown>);
      return root.children ?? [];
    } catch {
      return [];
    }
  })();

  const depNodes = viz?.dependency_graph?.nodes?.slice(0, 10) ?? [];
  const langs = viz?.language_breakdown ? consolidateLangs(viz.language_breakdown).slice(0, 10) : [];
  const totalLines = langs.reduce((s, l) => s + l.lines, 0);

  return (
    <div ref={ref} className="space-y-4">
      {/* Language Breakdown Bar */}
      {langs.length > 0 && (
        <div className="p-4 rounded-xl bg-[#FAFAFA] border border-[#E5E5E7] space-y-3">
          <div className="flex items-center justify-between">
            <span className="text-xs font-mono font-bold text-[#2563EB] uppercase tracking-wider">Language Breakdown</span>
            <span className="text-[10px] font-mono text-[#9CA3AF]">{totalLines.toLocaleString()} total lines</span>
          </div>
          {/* Stacked bar */}
          <div className="flex rounded-full overflow-hidden h-3 w-full gap-px">
            {langs.map((l) => (
              <div
                key={l.language}
                style={{ width: `${((l.lines / totalLines) * 100).toFixed(1)}%`, backgroundColor: l.color }}
                title={`${l.language}: ${l.lines.toLocaleString()} lines`}
              />
            ))}
          </div>
          <div className="flex flex-wrap gap-2">
            {langs.map((l) => (
              <span
                key={l.language}
                className="flex items-center gap-1.5 px-2.5 py-1 rounded-full bg-white border border-[#E5E5E7] text-[10px] font-mono text-[#6B7280]"
              >
                <span className="w-2 h-2 rounded-full shrink-0" style={{ backgroundColor: l.color }} />
                {l.language} · {l.lines.toLocaleString()} lines · {l.files} files
              </span>
            ))}
          </div>
        </div>
      )}

      <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
        {/* Folder Tree */}
        <motion.div
          initial={{ opacity: 0, y: 10 }}
          animate={inView ? { opacity: 1, y: 0 } : { opacity: 0, y: 10 }}
          transition={{ duration: 0.4 }}
          className="p-3 rounded-lg bg-white border border-[#E5E5E7] shadow-sm max-h-72 overflow-y-auto"
        >
          <span className="text-[10px] font-mono font-bold text-[#6B7280] block mb-2 px-2 uppercase">Directory Tree</span>
          {treeNodes.length > 0
            ? treeNodes.map((node, i) => <TreeItem key={node.name + i} item={node} />)
            : <p className="text-[10px] font-mono text-[#9CA3AF] px-2 py-4 text-center">No tree data — analyze a repo first.</p>
          }
        </motion.div>

        {/* Dependency Graph */}
        <motion.div
          initial={{ opacity: 0, y: 10 }}
          animate={inView ? { opacity: 1, y: 0 } : { opacity: 0, y: 10 }}
          transition={{ duration: 0.4, delay: 0.15 }}
          className="p-3 rounded-lg bg-white border border-[#E5E5E7] shadow-sm flex flex-col"
        >
          <div className="flex items-center justify-between mb-3">
            <span className="text-[10px] font-mono font-bold text-[#6B7280] uppercase">Dependency Graph</span>
            {viz?.dependency_graph && (
              <span className="text-[9px] font-mono text-[#9CA3AF]">
                {viz.dependency_graph.node_count} nodes · {viz.dependency_graph.edge_count} edges
              </span>
            )}
          </div>
          {depNodes.length > 0 ? (
            <div className="space-y-1.5 flex-1 flex flex-col justify-center max-h-56 overflow-y-auto">
              {depNodes.map((node, idx) => (
                <React.Fragment key={node.id}>
                  <motion.div
                    initial={{ opacity: 0, scale: 0.9 }}
                    animate={inView ? { opacity: 1, scale: 1 } : { opacity: 0, scale: 0.9 }}
                    transition={{ duration: 0.3, delay: 0.2 + idx * 0.05 }}
                    className="flex items-center gap-2 px-3 py-1.5 rounded-md bg-[#2563EB]/8 border border-[#2563EB]/20 text-xs font-mono text-[#2563EB]"
                  >
                    <span className="w-1.5 h-1.5 rounded-full bg-[#2563EB] shrink-0" />
                    <span className="font-semibold truncate flex-1">{node.label}</span>
                    <span className="text-[9px] text-[#9CA3AF] shrink-0">{node.type}</span>
                  </motion.div>
                  {idx < depNodes.length - 1 && (
                    <div className="flex justify-center my-0.5">
                      <ArrowRight className="w-3 h-3 text-[#9CA3AF] rotate-90" />
                    </div>
                  )}
                </React.Fragment>
              ))}
            </div>
          ) : (
            <p className="text-[10px] font-mono text-[#9CA3AF] py-4 text-center">No dependency data.</p>
          )}
        </motion.div>
      </div>
    </div>
  );
}

/* ─────────────────────────────────────────────
   Contributor Activity Section
───────────────────────────────────────────── */
function ContributorSection({ viz }: { viz: VizResult | null }) {
  const ref = useRef<HTMLDivElement>(null);
  const inView = useInView(ref, { once: true });

  const activity = viz?.contributor_activity ?? [];

  // Aggregate total commits per author
  const authorTotals: Record<string, number> = {};
  for (const row of activity) {
    authorTotals[row.author] = (authorTotals[row.author] ?? 0) + row.commits;
  }
  const authors = Object.entries(authorTotals)
    .sort((a, b) => b[1] - a[1])
    .slice(0, 8);
  const maxCommits = authors[0]?.[1] ?? 1;

  // Get recent months (last 6)
  const months = [...new Set(activity.map((a) => a.month))].sort().slice(-6);

  return (
    <div ref={ref} className="space-y-4">
      {/* Top Contributors */}
      <div className="p-4 rounded-xl bg-[#FAFAFA] border border-[#E5E5E7] space-y-3">
        <div className="flex items-center gap-2">
          <Users className="w-4 h-4 text-[#2563EB]" />
          <span className="text-xs font-mono font-bold text-[#2563EB] uppercase tracking-wider">Top Contributors</span>
        </div>
        {authors.length > 0 ? (
          <div className="space-y-2">
            {authors.map(([author, count], i) => (
              <motion.div
                key={author}
                initial={{ opacity: 0, x: -10 }}
                animate={inView ? { opacity: 1, x: 0 } : { opacity: 0, x: -10 }}
                transition={{ duration: 0.3, delay: i * 0.07 }}
                className="flex items-center gap-3"
              >
                <span className="text-[10px] font-mono text-[#6B7280] w-28 truncate shrink-0">{author}</span>
                <div className="flex-1 bg-[#E5E5E7] rounded-full h-2 overflow-hidden">
                  <div
                    className="bg-[#2563EB] h-full rounded-full transition-all duration-500"
                    style={{ width: `${(count / maxCommits) * 100}%` }}
                  />
                </div>
                <span className="text-[10px] font-mono text-[#374151] font-bold w-12 text-right shrink-0">{count} commits</span>
              </motion.div>
            ))}
          </div>
        ) : (
          <p className="text-[10px] font-mono text-[#9CA3AF] py-4 text-center">No contributor data yet.</p>
        )}
      </div>

      {/* Monthly activity heatmap mini grid */}
      {months.length > 0 && (
        <div className="p-4 rounded-xl bg-[#FAFAFA] border border-[#E5E5E7] space-y-3">
          <div className="flex items-center gap-2">
            <BarChart2 className="w-4 h-4 text-[#2563EB]" />
            <span className="text-xs font-mono font-bold text-[#2563EB] uppercase tracking-wider">Monthly Activity</span>
          </div>
          <div className="overflow-x-auto">
            <table className="w-full text-[9px] font-mono">
              <thead>
                <tr>
                  <td className="pr-3 text-[#9CA3AF]">Author</td>
                  {months.map((m) => (
                    <td key={m} className="text-center text-[#9CA3AF] px-1">{m.slice(5)}</td>
                  ))}
                </tr>
              </thead>
              <tbody>
                {authors.slice(0, 5).map(([author]) => (
                  <tr key={author}>
                    <td className="pr-3 text-[#374151] truncate max-w-[80px]">{author}</td>
                    {months.map((month) => {
                      const entry = activity.find((a) => a.author === author && a.month === month);
                      const commits = entry?.commits ?? 0;
                      const opacity = commits === 0 ? 0.05 : Math.min(1, 0.2 + (commits / maxCommits) * 0.8);
                      return (
                        <td key={month} className="text-center px-1 py-0.5">
                          <div
                            className="w-5 h-5 rounded mx-auto flex items-center justify-center"
                            style={{ backgroundColor: `rgba(37, 99, 235, ${opacity})` }}
                            title={`${author} — ${month}: ${commits} commits`}
                          >
                            {commits > 0 && <span className="text-[8px] text-[#2563EB] font-bold">{commits}</span>}
                          </div>
                        </td>
                      );
                    })}
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}
    </div>
  );
}

/* ─────────────────────────────────────────────
   Real Repo Walkthrough Video Section
───────────────────────────────────────────── */
function RepoWalkthroughSection({ repoUrl }: { repoUrl?: string | null }) {
  const [recordingStatus, setRecordingStatus] = useState<'idle' | 'recording' | 'ready' | 'error'>('idle');
  const [videoUrl, setVideoUrl] = useState<string | null>(null);
  const [repoId, setRepoId] = useState<string | null>(null);
  const [isPlaying, setIsPlaying] = useState(false);
  const [isMuted, setIsMuted] = useState(true);
  const [progress, setProgress] = useState(0);
  const [errorMessage, setErrorMessage] = useState<string>('');
  const videoRef = useRef<HTMLVideoElement>(null);
  const pollRef = useRef<ReturnType<typeof setInterval> | null>(null);

  // Clean up polling on unmount
  useEffect(() => () => { if (pollRef.current) clearInterval(pollRef.current); }, []);

  const handleGenerateWalkthrough = async () => {
    if (!repoUrl) {
      setErrorMessage('No repo URL available. Please analyze a repo first.');
      setRecordingStatus('error');
      return;
    }

    try {
      setRecordingStatus('recording');
      setErrorMessage('');

      // Ask backend to start (or return cached) recording
      const res = await recordWalkthrough({
        repo_url: repoUrl,
        base_url: window.location.origin,   // e.g. http://localhost:3001
      });

      setRepoId(res.repo_id);

      if ((res.status === 'exists' || res.status === 'ready') && res.video_url) {
        setVideoUrl(`http://localhost:8000${res.video_url}`);
        setRecordingStatus('ready');
        return;
      }

      // status === 'recording' — poll every 2 s for up to 90 s
      let attempts = 0;
      pollRef.current = setInterval(async () => {
        attempts++;
        try {
          const status = await getRecordingStatus(res.repo_id);
          if (status.status === 'ready' && status.video_url) {
            clearInterval(pollRef.current!);
            setVideoUrl(`http://localhost:8000${status.video_url}`);
            setRecordingStatus('ready');
          } else if (attempts >= 45) {  // 45 × 2 s = 90 s
            clearInterval(pollRef.current!);
            setRecordingStatus('error');
            setErrorMessage('Recording timed out after 90 s. Please try again.');
          }
        } catch {
          // transient network error — keep polling
        }
      }, 2000);

    } catch (error) {
      setRecordingStatus('error');
      setErrorMessage(error instanceof Error ? error.message : 'Recording failed');
    }
  };

  const togglePlay = () => {
    if (videoRef.current) {
      if (isPlaying) { videoRef.current.pause(); } else { videoRef.current.play(); }
      setIsPlaying(!isPlaying);
    }
  };

  return (
    <div className="p-4 rounded-xl bg-[#FAFAFA] border border-[#E5E5E7] space-y-3">
      <div className="flex items-center justify-between">
        <span className="text-xs font-mono font-bold text-[#2563EB] uppercase tracking-wider">Repo Walkthrough Video</span>
        <span className="text-[10px] font-mono text-[#9CA3AF]">Real-time Screen Recording</span>
      </div>

      {recordingStatus === 'idle' && (
        <div className="rounded-lg bg-slate-950 border border-[#E5E5E7] overflow-hidden relative group shadow-md">
          <div className="relative aspect-video bg-gradient-to-br from-slate-950 via-slate-900 to-slate-950 flex items-center justify-center">
            <div className="text-center text-slate-300">
              <PlayCircle className="w-16 h-16 mx-auto mb-3 text-slate-600" />
              <p className="text-sm font-medium mb-2">Generate Real Walkthrough</p>
              <p className="text-xs text-slate-500 mb-4 max-w-sm mx-auto">
                Create a live screen recording of your repo's visualization dashboard
              </p>
              <button
                onClick={handleGenerateWalkthrough}
                className="px-6 py-3 bg-[#2563EB] text-white rounded-lg hover:bg-[#1D4ED8] transition-colors font-medium text-sm"
              >
                Generate Video Walkthrough
              </button>
            </div>
          </div>
        </div>
      )}

      {recordingStatus === 'recording' && (
        <div className="rounded-lg bg-slate-950 border border-[#E5E5E7] overflow-hidden relative shadow-md">
          <div className="relative aspect-video bg-gradient-to-br from-slate-950 via-slate-900 to-slate-950 flex items-center justify-center">
            <div className="text-center text-slate-300">
              <div className="w-16 h-16 mx-auto mb-3 border-4 border-slate-600 border-t-[#2563EB] rounded-full animate-spin"></div>
              <p className="text-sm font-medium mb-2">Recording Your Repo...</p>
              <p className="text-xs text-slate-500 max-w-sm mx-auto">
                Capturing a live walkthrough of your visualization dashboard. This may take 20-30 seconds.
              </p>
            </div>
          </div>
        </div>
      )}

      {recordingStatus === 'ready' && videoUrl && (
        <div className="rounded-lg bg-slate-950 border border-[#E5E5E7] overflow-hidden relative group shadow-md">
          <div className="relative aspect-video bg-gradient-to-br from-slate-950 via-slate-900 to-slate-950 flex items-center justify-center overflow-hidden">
            <video
              ref={videoRef}
              src={videoUrl}
              className="w-full h-full object-cover"
              loop
              muted={isMuted}
              onTimeUpdate={() => {
                if (videoRef.current) {
                  const pct = (videoRef.current.currentTime / videoRef.current.duration) * 100;
                  setProgress(pct || 0);
                }
              }}
              onEnded={() => setIsPlaying(false)}
            />
            {!isPlaying && (
              <button
                onClick={togglePlay}
                className="absolute w-14 h-14 rounded-full bg-[#2563EB] text-white flex items-center justify-center shadow-lg hover:scale-110 transition-transform"
              >
                <Play className="w-6 h-6 fill-current ml-1" />
              </button>
            )}
          </div>
          <div className="p-2.5 bg-slate-950 border-t border-slate-800 flex items-center gap-3 font-mono text-xs text-slate-300">
            <button onClick={togglePlay} className="hover:text-white transition-colors">
              {isPlaying ? <Pause className="w-3.5 h-3.5" /> : <Play className="w-3.5 h-3.5" />}
            </button>
            <div className="flex-1 bg-slate-800 h-1.5 rounded-full overflow-hidden cursor-pointer">
              <div className="bg-[#2563EB] h-full transition-all duration-150" style={{ width: `${progress}%` }} />
            </div>
            <button onClick={() => setIsMuted(!isMuted)} className="hover:text-white transition-colors">
              {isMuted ? <VolumeX className="w-3.5 h-3.5" /> : <Volume2 className="w-3.5 h-3.5" />}
            </button>
            <span className="text-[9px] text-slate-400">REAL REPO RECORDING</span>
          </div>
        </div>
      )}

      {recordingStatus === 'error' && (
        <div className="rounded-lg bg-red-950 border border-red-800 overflow-hidden relative shadow-md">
          <div className="relative aspect-video bg-gradient-to-br from-red-950 via-red-900 to-red-950 flex items-center justify-center">
            <div className="text-center text-red-300">
              <AlertCircle className="w-16 h-16 mx-auto mb-3 text-red-500" />
              <p className="text-sm font-medium mb-2">Recording Failed</p>
              <p className="text-xs text-red-400 mb-4 max-w-sm mx-auto">
                {errorMessage}
              </p>
              <button
                onClick={() => {
                  setRecordingStatus('idle');
                  setErrorMessage('');
                }}
                className="px-6 py-3 bg-red-600 text-white rounded-lg hover:bg-red-700 transition-colors font-medium text-sm"
              >
                Try Again
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

/* ─────────────────────────────────────────────
   No data state
───────────────────────────────────────────── */
function NoDataState() {
  return (
    <div className="flex flex-col items-center justify-center py-16 gap-4 text-center">
      <div className="p-4 rounded-full bg-[#F4F6FA] border border-[#E5E5E7]">
        <AlertCircle className="w-8 h-8 text-[#9CA3AF]" />
      </div>
      <div className="space-y-1">
        <p className="text-sm font-semibold text-[#374151]">No visualization data loaded</p>
        <p className="text-xs font-mono text-[#9CA3AF]">
          Go to the home page, analyze a repository, then return here.
        </p>
      </div>
      <a
        href="/"
        className="mt-2 px-5 py-2.5 rounded-full text-sm font-semibold text-white bg-[#2563EB] hover:bg-[#1D4ED8] transition-colors"
      >
        Analyze a Repo
      </a>
    </div>
  );
}

/* ─────────────────────────────────────────────
   Main page
───────────────────────────────────────────── */
const SECTIONS = [
  { id: 'structure', title: 'Structure Diagram', subtitle: 'Tree & Dep Map', icon: Network },
  { id: 'flow', title: 'Contributor Activity', subtitle: 'Authors & Monthly Stats', icon: Activity },
  { id: 'video', title: 'Product Walkthrough', subtitle: 'Interactive Video Demo', icon: PlayCircle },
];

export default function VisualizationAgentPage() {
  const { analysisResult } = useRepo();
  const [activeTab, setActiveTab] = useState<string>('structure');
  const [viz, setViz] = useState<VizResult | null>(null);
  
  // Extract repo URL for video recording
  const repoUrl = (() => {
    try {
      const result = analysisResult || (() => {
        const raw = sessionStorage.getItem('repoatlas_result') || localStorage.getItem('repoatlas_result');
        return raw ? JSON.parse(raw) : null;
      })();
      return result?.repo_path || sessionStorage.getItem('repoatlas_url') || localStorage.getItem('repoatlas_url');
    } catch {
      return null;
    }
  })();

  useEffect(() => {
    try {
      const result = analysisResult || (() => {
        const raw = sessionStorage.getItem('repoatlas_result') || localStorage.getItem('repoatlas_result');
        return raw ? JSON.parse(raw) : null;
      })();
      if (!result) return;
      if (result.visualization) setViz(result.visualization as VizResult);
    } catch { /* no session */ }
  }, [analysisResult]);

  return (
    <main className="min-h-screen bg-[#FAFAFA] text-[#111114] selection:bg-[#2563EB]/20 selection:text-[#2563EB] overflow-x-hidden flex flex-col">
      <Navbar />

      <div className="flex-1 flex flex-col md:flex-row items-start justify-center pt-32 pb-24 px-4 sm:px-6 lg:px-8 max-w-5xl mx-auto w-full gap-6">
        {/* Sidebar tabs */}
        <div className="w-full md:w-64 shrink-0 flex flex-col gap-3">
          <span className="text-xs font-mono font-bold text-[#6B7280] uppercase tracking-wider px-1 mb-1">Visualizations</span>
          {SECTIONS.map((sec) => {
            const isActive = activeTab === sec.id;
            const Icon = sec.icon;
            return (
              <button
                key={sec.id}
                onClick={() => setActiveTab(sec.id)}
                className={`p-4 rounded-xl border text-left transition-all duration-200 flex flex-col gap-1 cursor-pointer ${
                  isActive
                    ? 'bg-[#2563EB] text-white border-[#2563EB] shadow-md scale-[1.02]'
                    : 'bg-white text-[#111114] border-[#E5E5E7] hover:border-[#2563EB]/50 hover:bg-[#FAFAFA]'
                }`}
              >
                <div className="flex items-center justify-between">
                  <span className="font-mono text-xs font-bold uppercase tracking-wider">{sec.title}</span>
                  <Icon className={`w-4 h-4 ${isActive ? 'text-white' : 'text-[#2563EB]'}`} />
                </div>
                <span className={`text-[10px] font-mono ${isActive ? 'text-blue-100' : 'text-[#9CA3AF]'}`}>{sec.subtitle}</span>
              </button>
            );
          })}
        </div>

        {/* Main card */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.4 }}
          className="p-8 rounded-2xl bg-white border border-[#E5E5E7] shadow-lg space-y-6 relative overflow-hidden flex-1 w-full"
        >
          <div className="absolute top-0 right-0 p-8 opacity-5 pointer-events-none">
            <Palette className="w-48 h-48 text-[#2563EB]" />
          </div>

          <div className="flex items-center gap-3">
            <div className="p-3 rounded-xl bg-[#2563EB] text-white shadow-lg">
              <Palette className="w-6 h-6" />
            </div>
            <div>
              <span className="text-xs font-mono text-[#2563EB] uppercase tracking-wider">Pipeline Stage 06</span>
              <h3 className="text-2xl font-bold text-[#111114]">Visualization Agent</h3>
              <span className="text-xs font-mono text-[#9CA3AF] block font-semibold mt-0.5">Diagram Synthesizer</span>
            </div>
          </div>

          {/* AI Narrative */}
          {viz?.narrative && (
            <div className="p-3 rounded-xl bg-[#F0F6FF] border border-[#2563EB]/20 text-sm text-[#374151] leading-relaxed">
              {viz.narrative}
            </div>
          )}

          <div className="min-h-[340px]">
            {!viz ? (
              <NoDataState />
            ) : (
              <>
                {activeTab === 'structure' && <StructureSection viz={viz} />}
                {activeTab === 'flow' && <ContributorSection viz={viz} />}
                {activeTab === 'video' && <RepoWalkthroughSection repoUrl={repoUrl} />}
              </>
            )}
          </div>

          <div className="flex items-center justify-between pt-4 border-t border-[#E5E5E7] text-xs font-mono text-[#9CA3AF]">
            <span>Status: <span className={viz ? 'text-green-600' : 'text-orange-500'}>{viz ? 'Data Loaded' : 'No Data'}</span></span>
            <span>Latency: <span className="text-[#2563EB]">&lt; 14ms</span></span>
          </div>
        </motion.div>
      </div>

      <Footer />
    </main>
  );
}
