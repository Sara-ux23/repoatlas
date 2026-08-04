'use client';

import React, { useState, useRef } from 'react';
import { motion, useInView } from 'framer-motion';
import { Palette, Folder, FileCode, ChevronRight, ChevronDown, ArrowRight, Play, Pause, Volume2, VolumeX, Network, Activity, PlayCircle } from 'lucide-react';
import { Navbar } from '../../../components/Navbar';
import { Footer } from '../../../components/Footer';

/* ─────────────────────────────────────────────
   Section 1: Structure Diagram Component
───────────────────────────────────────────── */
interface TreeNode {
  name: string;
  type: 'file' | 'folder';
  children?: TreeNode[];
}

const FOLDER_TREE: TreeNode[] = [
  {
    name: 'src/',
    type: 'folder',
    children: [
      { name: 'main.go', type: 'file' },
      {
        name: 'auth/',
        type: 'folder',
        children: [
          { name: 'jwt_verifier.go', type: 'file' },
          { name: 'session_store.go', type: 'file' },
        ],
      },
      {
        name: 'controllers/',
        type: 'folder',
        children: [
          { name: 'user_controller.ts', type: 'file' },
          { name: 'agent_controller.ts', type: 'file' },
        ],
      },
      {
        name: 'services/',
        type: 'folder',
        children: [
          { name: 'TokenService.ts', type: 'file' },
          { name: 'ASTParserService.ts', type: 'file' },
        ],
      },
      {
        name: 'repositories/',
        type: 'folder',
        children: [
          { name: 'UserRepository.ts', type: 'file' },
        ],
      },
    ],
  },
];

function TreeItem({ item, depth = 0 }: { item: TreeNode; depth?: number }) {
  const [isOpen, setIsOpen] = useState(true);

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
            <span className="font-semibold text-[#111114]">{item.name}</span>
          </>
        ) : (
          <>
            <span className="w-3.5" />
            <FileCode className="w-3.5 h-3.5 text-[#6B7280]" />
            <span className="text-[#374151]">{item.name}</span>
          </>
        )}
      </div>

      {item.type === 'folder' && isOpen && item.children && (
        <div>
          {item.children.map((child) => (
            <TreeItem key={child.name} item={child} depth={depth + 1} />
          ))}
        </div>
      )}
    </div>
  );
}

const GRAPH_NODES = [
  { id: 'main', label: 'main.go' },
  { id: 'middleware', label: 'AuthMiddleware' },
  { id: 'controller', label: 'UserController' },
  { id: 'service', label: 'UserService' },
  { id: 'repo', label: 'UserRepository' },
];

function StructureSection() {
  const ref = useRef<HTMLDivElement>(null);
  const inView = useInView(ref, { once: true });

  return (
    <div ref={ref} className="p-4 rounded-xl bg-[#FAFAFA] border border-[#E5E5E7] space-y-3">
      <div className="flex items-center justify-between">
        <span className="text-xs font-mono font-bold text-[#2563EB] uppercase tracking-wider">
          Structure Diagram
        </span>
        <span className="text-[10px] font-mono text-[#9CA3AF]">Tree & Dependency Map</span>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
        {/* Collapsible Folder Tree */}
        <motion.div
          initial={{ opacity: 0, y: 10 }}
          animate={inView ? { opacity: 1, y: 0 } : { opacity: 0, y: 10 }}
          transition={{ duration: 0.4 }}
          className="p-3 rounded-lg bg-white border border-[#E5E5E7] shadow-xs"
        >
          <span className="text-[10px] font-mono font-bold text-[#6B7280] block mb-2 px-2 uppercase">Directory Tree</span>
          {FOLDER_TREE.map((node) => (
            <TreeItem key={node.name} item={node} />
          ))}
        </motion.div>

        {/* Node Dependency Graph */}
        <motion.div
          initial={{ opacity: 0, y: 10 }}
          animate={inView ? { opacity: 1, y: 0 } : { opacity: 0, y: 10 }}
          transition={{ duration: 0.4, delay: 0.15 }}
          className="p-3 rounded-lg bg-white border border-[#E5E5E7] shadow-xs flex flex-col"
        >
          <span className="text-[10px] font-mono font-bold text-[#6B7280] block mb-3 uppercase">Dependency Graph Root</span>
          <div className="space-y-1.5 flex-1 flex flex-col justify-center">
            {GRAPH_NODES.map((node, idx) => (
              <React.Fragment key={node.id}>
                <motion.div
                  initial={{ opacity: 0, scale: 0.9 }}
                  animate={inView ? { opacity: 1, scale: 1 } : { opacity: 0, scale: 0.9 }}
                  transition={{ duration: 0.3, delay: 0.2 + idx * 0.08 }}
                  className="flex items-center gap-2 px-3 py-1.5 rounded-md bg-[#2563EB]/8 border border-[#2563EB]/20 text-xs font-mono text-[#2563EB]"
                >
                  <span className="w-1.5 h-1.5 rounded-full bg-[#2563EB]" />
                  <span className="font-semibold">{node.label}</span>
                </motion.div>
                {idx < GRAPH_NODES.length - 1 && (
                  <div className="flex justify-center my-0.5">
                    <ArrowRight className="w-3 h-3 text-[#9CA3AF] rotate-90" />
                  </div>
                )}
              </React.Fragment>
            ))}
          </div>
        </motion.div>
      </div>
    </div>
  );
}

/* ─────────────────────────────────────────────
   Section 2: Execution Flow Animation Component
───────────────────────────────────────────── */
const FLOW_STEPS = [
  { id: 1, name: 'authenticateSession()', type: 'API Gate', time: '0ms' },
  { id: 2, name: 'verifyToken()', type: 'JWT Guard', time: '+2ms' },
  { id: 3, name: 'queryUserRecord()', type: 'DB Layer', time: '+6ms' },
  { id: 4, name: 'renderDashboard()', type: 'UI Core', time: '+11ms' },
];

function ExecutionFlowSection() {
  const ref = useRef<HTMLDivElement>(null);
  const inView = useInView(ref, { once: true });

  return (
    <div ref={ref} className="p-4 rounded-xl bg-[#FAFAFA] border border-[#E5E5E7] space-y-3">
      <div className="flex items-center justify-between">
        <span className="text-xs font-mono font-bold text-[#2563EB] uppercase tracking-wider">
          Execution Flow Animation
        </span>
        <span className="text-[10px] font-mono text-[#9CA3AF]">Sequential Call Sequence</span>
      </div>

      <div className="p-3 rounded-lg bg-white border border-[#E5E5E7] shadow-xs">
        <div className="grid grid-cols-1 sm:grid-cols-4 gap-2 items-center">
          {FLOW_STEPS.map((step, idx) => (
            <React.Fragment key={step.id}>
              <motion.div
                initial={{ opacity: 0, x: -10 }}
                animate={inView ? { opacity: 1, x: 0 } : { opacity: 0, x: -10 }}
                transition={{ duration: 0.35, delay: idx * 0.15 }}
                className="p-2.5 rounded-lg bg-[#FAFAFA] border border-[#E5E5E7] relative"
              >
                <div className="flex items-center justify-between mb-1">
                  <span className="text-[9px] font-mono text-[#2563EB] font-bold uppercase">{step.type}</span>
                  <span className="text-[9px] font-mono text-[#9CA3AF]">{step.time}</span>
                </div>
                <div className="text-[11px] font-mono font-bold text-[#111114] truncate" title={step.name}>
                  {step.name}
                </div>
                {idx < FLOW_STEPS.length - 1 && (
                  <div className="absolute top-1/2 -right-3 -translate-y-1/2 hidden sm:block z-10">
                    <motion.div
                      initial={{ scale: 0 }}
                      animate={inView ? { scale: 1 } : { scale: 0 }}
                      transition={{ delay: idx * 0.15 + 0.2 }}
                    >
                      <ArrowRight className="w-3.5 h-3.5 text-[#2563EB]" />
                    </motion.div>
                  </div>
                )}
              </motion.div>
            </React.Fragment>
          ))}
        </div>
      </div>
    </div>
  );
}

/* ─────────────────────────────────────────────
   Section 3: Product Walkthrough Video Component
───────────────────────────────────────────── */
function ProductWalkthroughSection() {
  const [isPlaying, setIsPlaying] = useState(false);
  const [isMuted, setIsMuted] = useState(true);
  const [progress, setProgress] = useState(30);
  const videoRef = useRef<HTMLVideoElement>(null);

  const togglePlay = () => {
    if (videoRef.current) {
      if (isPlaying) {
        videoRef.current.pause();
      } else {
        videoRef.current.play();
      }
      setIsPlaying(!isPlaying);
    }
  };

  return (
    <div className="p-4 rounded-xl bg-[#FAFAFA] border border-[#E5E5E7] space-y-3">
      <div className="flex items-center justify-between">
        <span className="text-xs font-mono font-bold text-[#2563EB] uppercase tracking-wider">
          Product Walkthrough Video
        </span>
        <span className="text-[10px] font-mono text-[#9CA3AF]">Product Demo in Action</span>
      </div>

      <div className="rounded-lg bg-slate-950 border border-[#E5E5E7] overflow-hidden relative group shadow-md">
        <div className="relative aspect-video bg-gradient-to-br from-slate-950 via-slate-900 to-slate-950 flex items-center justify-center overflow-hidden">
          <video
            ref={videoRef}
            src="https://commondatastorage.googleapis.com/gtv-videos-bucket/sample/ForBiggerBlazes.mp4"
            className="w-full h-full object-cover"
            loop
            muted={isMuted}
            onTimeUpdate={() => {
              if (videoRef.current) {
                const pct = (videoRef.current.currentTime / videoRef.current.duration) * 100;
                setProgress(pct || 0);
              }
            }}
          />

          {!isPlaying && (
            <button
              onClick={togglePlay}
              className="absolute w-12 h-12 rounded-full bg-[#2563EB] text-white flex items-center justify-center shadow-lg hover:scale-105 transition-transform"
            >
              <Play className="w-5 h-5 fill-current ml-0.5" />
            </button>
          )}
        </div>

        {/* Video Control Bar */}
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

          <span className="text-[9px] text-slate-400">PRODUCT DEMO</span>
        </div>
      </div>
    </div>
  );
}

/* ─────────────────────────────────────────────
   Main page
───────────────────────────────────────────── */
const SECTIONS = [
  { id: 'structure', title: 'Structure Diagram', subtitle: 'Tree & Dep Map', icon: Network },
  { id: 'flow', title: 'Execution Flow', subtitle: 'Call Sequence Stream', icon: Activity },
  { id: 'video', title: 'Product Walkthrough', subtitle: 'Interactive Video Demo', icon: PlayCircle },
];

export default function VisualizationAgentPage() {
  const [activeTab, setActiveTab] = useState<string>('structure');

  return (
    <main className="min-h-screen bg-[#FAFAFA] text-[#111114] selection:bg-[#2563EB]/20 selection:text-[#2563EB] overflow-x-hidden flex flex-col">
      <Navbar />
      
      <div className="flex-1 flex flex-col md:flex-row items-start justify-center pt-32 pb-24 px-4 sm:px-6 lg:px-8 max-w-5xl mx-auto w-full gap-6">
        {/* ── Left Sidebar Section Tab Buttons ── */}
        <div className="w-full md:w-64 shrink-0 flex flex-col gap-3">
          <span className="text-xs font-mono font-bold text-[#6B7280] uppercase tracking-wider px-1 mb-1">
            Visualizations
          </span>
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
                  <span className="font-mono text-xs font-bold uppercase tracking-wider">
                    {sec.title}
                  </span>
                  <Icon className={`w-4 h-4 ${isActive ? 'text-white' : 'text-[#2563EB]'}`} />
                </div>
                <span className={`text-[10px] font-mono ${isActive ? 'text-blue-100' : 'text-[#9CA3AF]'}`}>
                  {sec.subtitle}
                </span>
              </button>
            );
          })}
        </div>

        {/* ── Main Output Card Container ── */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.4 }}
          className="p-8 rounded-2xl bg-white border border-[#E5E5E7] shadow-lg space-y-6 relative overflow-hidden flex-1 w-full"
        >
          {/* Watermark */}
          <div className="absolute top-0 right-0 p-8 opacity-5 pointer-events-none">
            <Palette className="w-48 h-48 text-[#2563EB]" />
          </div>

          {/* ── Card Header (untouched) ── */}
          <div className="flex items-center gap-3">
            <div className="p-3 rounded-xl bg-[#2563EB] text-white shadow-lg">
              <Palette className="w-6 h-6" />
            </div>
            <div>
              <span className="text-xs font-mono text-[#2563EB] uppercase tracking-wider">
                Pipeline Stage 06
              </span>
              <h3 className="text-2xl font-bold text-[#111114]">Visualization Agent</h3>
              <span className="text-xs font-mono text-[#9CA3AF] block font-semibold mt-0.5">Diagram Synthesizer</span>
            </div>
          </div>

          {/* ── Active Visualization Output ── */}
          <div className="min-h-[340px]">
            {activeTab === 'structure' && <StructureSection />}
            {activeTab === 'flow' && <ExecutionFlowSection />}
            {activeTab === 'video' && <ProductWalkthroughSection />}
          </div>

          {/* ── Footer (untouched) ── */}
          <div className="flex items-center justify-between pt-4 border-t border-[#E5E5E7] text-xs font-mono text-[#9CA3AF]">
            <span>Status: <span className="text-green-600">Active Stream</span></span>
            <span>Latency: <span className="text-[#2563EB]">&lt; 14ms</span></span>
          </div>
        </motion.div>
      </div>

      <Footer />
    </main>
  );
}

