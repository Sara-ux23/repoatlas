'use client';

import React, { useState, useMemo } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import {
  BookOpen, Compass, Search, Shield, Palette, Bot, Layers,
  Terminal, ChevronRight, ChevronDown, ArrowRight, Check, Copy, ExternalLink,
  Activity, Menu, X, Layout, Sparkles, Sliders, Type, Grid, Eye, CheckCircle2,
  FileText, Cpu, AlertTriangle, HelpCircle, Flame, ShieldAlert, Monitor, DynamicIcon
} from 'lucide-react';
import { Navbar } from '../../components/Navbar';
import { Footer } from '../../components/Footer';
import { useAuth } from '../../lib/authContext';

/* ─────────────────────────────────────────────
   Sidebar Nav Structure
───────────────────────────────────────────── */
const NAV_SECTIONS = [
  {
    group: 'Getting Started',
    icon: BookOpen,
    items: [
      { id: 'introduction', label: 'Introduction' },
      { id: 'quickstart', label: 'Quickstart' },
      { id: 'authentication', label: 'Authentication' },
      { id: 'installation', label: 'Installation' },
    ],
  },
  {
    group: 'UI/UX & Design System',
    icon: Layout,
    items: [
      { id: 'uiux-overview', label: 'UI/UX Philosophy & Principles' },
      { id: 'design-system', label: 'Visual Tokens & Color System' },
      { id: 'component-specs', label: 'Component Library Specs' },
      { id: 'ux-architecture', label: 'Information Architecture & A11y' },
    ],
  },
  {
    group: 'Agents',
    icon: Bot,
    items: [
      { id: 'explorer-agent', label: 'Explorer Agent' },
      { id: 'trace-agent', label: 'Trace Agent' },
      { id: 'security-agent', label: 'Security Agent' },
      { id: 'visualization-agent', label: 'Visualization Agent' },
      { id: 'manager-agent', label: 'Manager Agent' },
    ],
  },
  {
    group: 'API Reference',
    icon: Terminal,
    items: [
      { id: 'api-overview', label: 'Overview' },
      { id: 'api-endpoints', label: 'Endpoints' },
      { id: 'api-webhooks', label: 'Webhooks' },
      { id: 'api-errors', label: 'Error Codes' },
    ],
  },
  {
    group: 'Guides',
    icon: Layers,
    items: [
      { id: 'guide-ci', label: 'CI/CD Integration' },
      { id: 'guide-github', label: 'GitHub App Setup' },
      { id: 'guide-security', label: 'Security Policies' },
    ],
  },
];

/* ─────────────────────────────────────────────
   Code Block Component
───────────────────────────────────────────── */
function CodeBlock({ code, lang = 'bash' }: { code: string; lang?: string }) {
  const [copied, setCopied] = useState(false);
  const handleCopy = () => {
    navigator.clipboard.writeText(code);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };
  return (
    <div className="relative rounded-xl border border-[#E5E5E7] bg-slate-950 overflow-hidden my-4 shadow-sm">
      <div className="flex items-center justify-between px-4 py-2 bg-slate-900/80 border-b border-slate-800">
        <span className="text-xs font-mono text-slate-400 uppercase tracking-wider">{lang}</span>
        <button
          onClick={handleCopy}
          className="flex items-center gap-1.5 text-xs font-mono text-slate-400 hover:text-white transition-colors"
        >
          {copied ? <Check className="w-3.5 h-3.5 text-green-400" /> : <Copy className="w-3.5 h-3.5" />}
          {copied ? 'Copied!' : 'Copy'}
        </button>
      </div>
      <pre className="px-5 py-4 text-sm text-slate-200 font-mono overflow-x-auto whitespace-pre leading-relaxed">{code}</pre>
    </div>
  );
}

/* ─────────────────────────────────────────────
   Badge Component
───────────────────────────────────────────── */
function Badge({ label, color = 'blue' }: { label: string; color?: 'blue' | 'green' | 'red' | 'yellow' | 'purple' }) {
  const colors = {
    blue: 'bg-[#2563EB]/10 text-[#2563EB] border-[#2563EB]/20',
    green: 'bg-emerald-50 text-emerald-700 border-emerald-200',
    red: 'bg-rose-50 text-rose-700 border-rose-200',
    yellow: 'bg-amber-50 text-amber-700 border-amber-200',
    purple: 'bg-purple-50 text-purple-700 border-purple-200',
  };
  return (
    <span className={`inline-block px-2.5 py-0.5 rounded-full text-[10px] font-mono font-bold uppercase tracking-wider border ${colors[color]}`}>
      {label}
    </span>
  );
}

/* ─────────────────────────────────────────────
   Endpoint Row Component
───────────────────────────────────────────── */
function EndpointRow({ method, path, desc }: { method: 'GET' | 'POST' | 'DELETE' | 'PUT'; path: string; desc: string }) {
  const methodColors: Record<string, string> = {
    GET: 'bg-emerald-50 text-emerald-700 border-emerald-200',
    POST: 'bg-[#2563EB]/10 text-[#2563EB] border-[#2563EB]/20',
    DELETE: 'bg-rose-50 text-rose-700 border-rose-200',
    PUT: 'bg-amber-50 text-amber-700 border-amber-200',
  };
  return (
    <div className="flex items-start gap-3 p-3.5 rounded-xl border border-[#E5E5E7] bg-[#FAFAFA] hover:border-[#2563EB]/40 transition-all duration-200">
      <span className={`text-[10px] font-mono font-bold uppercase border px-2 py-0.5 rounded-md shrink-0 mt-0.5 ${methodColors[method]}`}>{method}</span>
      <div>
        <code className="text-sm font-mono text-[#111114] font-semibold">{path}</code>
        <p className="text-xs text-[#6B7280] mt-1 leading-relaxed">{desc}</p>
      </div>
    </div>
  );
}

/* ─────────────────────────────────────────────
   Agents Metadata
───────────────────────────────────────────── */
const AGENTS = [
  { id: 'explorer-agent', label: 'Explorer Agent', icon: Compass, color: '#2563EB', stage: '01', subtitle: 'AST Scanner — maps repo structure, parses imports, generates dependency graphs.', href: '/agents/explorer-agent' },
  { id: 'trace-agent', label: 'Trace Agent', icon: Search, color: '#7C3AED', stage: '02', subtitle: 'Call Chain Tracker — walks real execution stack frames across API → Service → DB.', href: '/agents/trace-agent' },
  { id: 'security-agent', label: 'Security Agent', icon: Shield, color: '#DC2626', stage: '03', subtitle: 'Threat Detector — scores posture, flags CVEs, detects injection & auth flaws.', href: '/agents/security-agent' },
  { id: 'visualization-agent', label: 'Visualization Agent', icon: Palette, color: '#059669', stage: '06', subtitle: 'Diagram Synthesizer — renders structure diagrams, execution flows & walkthroughs.', href: '/agents/visualization-agent' },
  { id: 'manager-agent', label: 'Manager Agent', icon: Bot, color: '#D97706', stage: '07', subtitle: 'Swarm Router — orchestrates all agents, assigns tasks, aggregates results.', href: '/agents/manager-agent' },
];

/* ─────────────────────────────────────────────
   Interactive Color Swatch Component for Design System Docs
───────────────────────────────────────────── */
function ColorSwatch({ name, hex, usage, lightText = false }: { name: string; hex: string; usage: string; lightText?: boolean }) {
  const [copied, setCopied] = useState(false);
  const copyHex = () => {
    navigator.clipboard.writeText(hex);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };
  return (
    <div
      onClick={copyHex}
      className="group relative cursor-pointer overflow-hidden rounded-xl border border-[#E5E5E7] bg-white p-3 transition-all hover:shadow-md hover:-translate-y-0.5"
    >
      <div
        className="h-16 w-full rounded-lg shadow-inner flex items-end justify-between p-2 mb-2.5 transition-transform group-hover:scale-[1.02]"
        style={{ backgroundColor: hex }}
      >
        <span className={`text-[10px] font-mono font-bold uppercase px-1.5 py-0.5 rounded bg-black/20 backdrop-blur-sm ${lightText ? 'text-white' : 'text-white'}`}>
          {hex}
        </span>
        {copied && (
          <span className="text-[10px] font-mono font-bold uppercase px-1.5 py-0.5 rounded bg-emerald-500 text-white">
            Copied!
          </span>
        )}
      </div>
      <div>
        <h4 className="text-xs font-bold text-[#111114]">{name}</h4>
        <p className="text-[11px] text-[#6B7280] mt-0.5 leading-snug">{usage}</p>
      </div>
    </div>
  );
}

/* ─────────────────────────────────────────────
   Section Content Renderer
───────────────────────────────────────────── */
function SectionContent({ activeId }: { activeId: string }) {
  const variants = {
    initial: { opacity: 0, y: 12 },
    animate: { opacity: 1, y: 0 },
    exit: { opacity: 0, y: -8 },
  };

  /* -------------------------------------------------------------
     GETTING STARTED: Introduction
  ------------------------------------------------------------- */
  if (activeId === 'introduction') return (
    <motion.div key="introduction" variants={variants} initial="initial" animate="animate" exit="exit" transition={{ duration: 0.25 }} className="space-y-6">
      <div>
        <Badge label="Getting Started" />
        <h1 className="text-3xl font-extrabold text-[#111114] mt-3 mb-2 tracking-tight">Introduction to RepoAtlas AI</h1>
        <p className="text-[#6B7280] leading-relaxed text-base">RepoAtlas AI is a multi-agent code intelligence platform that lets your engineering team understand, secure, trace, and visualize any codebase in real time — powered by a swarm of specialized AI agents.</p>
      </div>
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
        {[
          { icon: Compass, title: 'Explore', desc: 'Map your full repo structure, AST, and dependency graph instantly.' },
          { icon: Search, title: 'Trace', desc: 'Walk execution stack frames from API entry to database calls.' },
          { icon: Shield, title: 'Secure', desc: 'Detect CVEs, injection flaws, and auth vulnerabilities automatically.' },
          { icon: Palette, title: 'Visualize', desc: 'Generate live diagrams, flow animations, and walkthroughs.' },
        ].map((f) => (
          <div key={f.title} className="p-4 rounded-xl border border-[#E5E5E7] bg-white hover:border-[#2563EB]/40 transition-all">
            <div className="p-2 rounded-lg bg-[#2563EB]/8 w-fit mb-3">
              <f.icon className="w-4 h-4 text-[#2563EB]" />
            </div>
            <h3 className="font-bold text-[#111114] text-sm mb-1">{f.title}</h3>
            <p className="text-xs text-[#6B7280] leading-relaxed">{f.desc}</p>
          </div>
        ))}
      </div>
      <div className="p-5 rounded-xl border border-[#2563EB]/20 bg-[#2563EB]/5">
        <p className="text-sm text-[#2563EB] font-mono font-semibold mb-1 flex items-center gap-1.5">
          <Sparkles className="w-4 h-4" /> How the Agent Swarm Operates
        </p>
        <p className="text-sm text-[#374151] leading-relaxed">When you connect a repository, the <strong>Manager Agent</strong> orchestrates a pipeline of specialized agents — each scanning, tracing, and analyzing in parallel — then aggregates results into a unified intelligence layer.</p>
      </div>
    </motion.div>
  );

  /* -------------------------------------------------------------
     GETTING STARTED: Quickstart
  ------------------------------------------------------------- */
  if (activeId === 'quickstart') return (
    <motion.div key="quickstart" variants={variants} initial="initial" animate="animate" exit="exit" transition={{ duration: 0.25 }} className="space-y-6">
      <div>
        <Badge label="Getting Started" />
        <h1 className="text-3xl font-extrabold text-[#111114] mt-3 mb-2 tracking-tight">Quickstart</h1>
        <p className="text-[#6B7280] leading-relaxed">Get up and running with RepoAtlas AI in under 5 minutes.</p>
      </div>
      {[
        { step: '01', title: 'Install the CLI', content: <CodeBlock lang="bash" code={`npm install -g @repoatlas/cli\nrepoatlas --version`} /> },
        { step: '02', title: 'Authenticate', content: <CodeBlock lang="bash" code={`repoatlas auth login\n# Opens browser OAuth — paste your API key when prompted`} /> },
        { step: '03', title: 'Connect a Repository', content: <CodeBlock lang="bash" code={`cd your-project/\nrepoatlas init\n# Scans repo and registers all agents`} /> },
        { step: '04', title: 'Run your first analysis', content: <CodeBlock lang="bash" code={`repoatlas run --agent explorer\n# Output: dependency graph, entry points, AST summary`} /> },
      ].map((s) => (
        <div key={s.step} className="flex gap-4">
          <div className="shrink-0 w-8 h-8 rounded-full bg-[#2563EB] text-white text-xs font-mono font-bold flex items-center justify-center shadow-sm">{s.step}</div>
          <div className="flex-1 min-w-0">
            <h3 className="font-bold text-[#111114] text-sm mb-1">{s.title}</h3>
            {s.content}
          </div>
        </div>
      ))}
    </motion.div>
  );

  /* -------------------------------------------------------------
     GETTING STARTED: Authentication
  ------------------------------------------------------------- */
  if (activeId === 'authentication') return (
    <motion.div key="auth" variants={variants} initial="initial" animate="animate" exit="exit" transition={{ duration: 0.25 }} className="space-y-6">
      <div>
        <Badge label="Getting Started" />
        <h1 className="text-3xl font-extrabold text-[#111114] mt-3 mb-2 tracking-tight">Authentication</h1>
        <p className="text-[#6B7280] leading-relaxed">RepoAtlas uses Bearer token authentication. All requests must include your API key in the Authorization header.</p>
      </div>
      <div className="p-4 rounded-xl border border-amber-200 bg-amber-50/80">
        <p className="text-sm text-amber-900 font-semibold mb-1 flex items-center gap-1.5">
          <AlertTriangle className="w-4 h-4 text-amber-700" /> Keep your API key secret
        </p>
        <p className="text-xs text-amber-800 leading-relaxed">Never commit your API key to version control. Use environment variables or a secure secrets manager.</p>
      </div>
      <h3 className="font-bold text-[#111114] text-sm">Using the API Key</h3>
      <CodeBlock lang="bash" code={`curl https://api.repoatlas.ai/v1/analyze \\\n  -H "Authorization: Bearer ra_live_xxxxxxxxxxxx" \\\n  -H "Content-Type: application/json"`} />
      <h3 className="font-bold text-[#111114] text-sm">Environment Variable Setup</h3>
      <CodeBlock lang="bash" code={`export REPOATLAS_API_KEY="ra_live_xxxxxxxxxxxx"\nrepoatlas run --agent trace`} />
      <h3 className="font-bold text-[#111114] text-sm">Token Scopes & Permissions</h3>
      <div className="space-y-2">
        {[
          { scope: 'repo:read', desc: 'Read repository metadata, AST tree, and structure' },
          { scope: 'agents:run', desc: 'Execute agent analysis pipelines' },
          { scope: 'reports:write', desc: 'Save and export analysis reports' },
          { scope: 'webhooks:manage', desc: 'Create and manage event webhooks' },
        ].map((s) => (
          <div key={s.scope} className="flex items-start gap-3 p-3 rounded-lg border border-[#E5E5E7] bg-white">
            <code className="text-xs font-mono text-[#2563EB] bg-[#2563EB]/8 px-2 py-0.5 rounded font-semibold shrink-0">{s.scope}</code>
            <p className="text-xs text-[#6B7280]">{s.desc}</p>
          </div>
        ))}
      </div>
    </motion.div>
  );

  /* -------------------------------------------------------------
     GETTING STARTED: Installation
  ------------------------------------------------------------- */
  if (activeId === 'installation') return (
    <motion.div key="install" variants={variants} initial="initial" animate="animate" exit="exit" transition={{ duration: 0.25 }} className="space-y-6">
      <div>
        <Badge label="Getting Started" />
        <h1 className="text-3xl font-extrabold text-[#111114] mt-3 mb-2 tracking-tight">Installation</h1>
        <p className="text-[#6B7280] leading-relaxed">Install the RepoAtlas CLI or SDK for your preferred environment.</p>
      </div>
      <h3 className="font-bold text-[#111114] text-sm">CLI (npm)</h3>
      <CodeBlock lang="bash" code="npm install -g @repoatlas/cli" />
      <h3 className="font-bold text-[#111114] text-sm">JavaScript / TypeScript SDK</h3>
      <CodeBlock lang="bash" code="npm install @repoatlas/sdk" />
      <CodeBlock lang="typescript" code={`import { RepoAtlasClient } from '@repoatlas/sdk';\n\nconst client = new RepoAtlasClient({\n  apiKey: process.env.REPOATLAS_API_KEY,\n});\n\nconst result = await client.agents.explorer.run({\n  repoUrl: 'https://github.com/your-org/your-repo',\n});`} />
      <h3 className="font-bold text-[#111114] text-sm">Python SDK</h3>
      <CodeBlock lang="bash" code="pip install repoatlas" />
      <CodeBlock lang="python" code={`from repoatlas import RepoAtlasClient\n\nclient = RepoAtlasClient(api_key="ra_live_xxx")\nresult = client.agents.explorer.run(repo_url="https://github.com/org/repo")`} />
    </motion.div>
  );

  /* =============================================================
     NEW UI/UX SECTION 1: UI/UX Philosophy & Principles (20 Years Experience)
  ============================================================= */
  if (activeId === 'uiux-overview') return (
    <motion.div key="uiux-overview" variants={variants} initial="initial" animate="animate" exit="exit" transition={{ duration: 0.25 }} className="space-y-6">
      <div>
        <Badge label="UI/UX & Design System" color="purple" />
        <h1 className="text-3xl font-extrabold text-[#111114] mt-3 mb-2 tracking-tight">UI/UX Philosophy & Design Architecture</h1>
        <p className="text-[#6B7280] leading-relaxed">Authored by Lead UI/UX Architect (20+ Years in Tech). Design guidelines powering RepoAtlas AI’s enterprise developer experience.</p>
      </div>

      <div className="p-5 rounded-2xl bg-gradient-to-br from-slate-900 to-slate-950 text-white shadow-md">
        <div className="flex items-center gap-2 mb-2">
          <Sparkles className="w-5 h-5 text-[#2563EB]" />
          <h3 className="text-base font-bold font-sans">Core UX Design Manifesto</h3>
        </div>
        <p className="text-xs text-slate-300 leading-relaxed font-sans">
          Developers process thousands of lines of complex logic daily. Our UX architecture eliminates friction by transforming dense structural code metadata into intuitive visual maps, instant execution traces, and predictable keyboard-first navigation patterns.
        </p>
      </div>

      <h3 className="font-bold text-[#111114] text-base pt-2">The 4 Pillars of Developer Ergonomics</h3>
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        {[
          {
            icon: Eye,
            title: '1. Visual Rhythm & Contrast Tiering',
            desc: 'Strict visual hierarchy using curated neutral slate backgrounds, vibrant signal colors (#2563EB primary), and 4.5:1 WCAG text contrast to prevent eye fatigue during prolonged debug sessions.',
          },
          {
            icon: Sliders,
            title: '2. Progressive Disclosure of Complexity',
            desc: 'Expose high-level dependency topologies first; allow sub-second drill-down into specific file ASTs, call stacks, and vulnerability CVE records without leaving the context window.',
          },
          {
            icon: Cpu,
            title: '3. Real-Time Telemetry & Micro-Feedback',
            desc: 'Subtle 150-250ms spring animations (powered by Framer Motion) provide tactile visual affordance whenever AI agents parse code, update call chains, or finish security audits.',
          },
          {
            icon: Layout,
            title: '4. Consistent Spatial Grid System',
            desc: 'An 8px baseline spatial grid ensures pixel-perfect alignment across all dashboards, sidebars, modal dialogs, and code viewer panels across mobile and desktop displays.',
          },
        ].map((p) => (
          <div key={p.title} className="p-4.5 rounded-xl border border-[#E5E5E7] bg-white hover:border-[#2563EB]/40 hover:shadow-sm transition-all">
            <div className="p-2 rounded-lg bg-[#2563EB]/10 text-[#2563EB] w-fit mb-3">
              <p.icon className="w-4 h-4" />
            </div>
            <h4 className="font-bold text-[#111114] text-sm mb-1">{p.title}</h4>
            <p className="text-xs text-[#6B7280] leading-relaxed">{p.desc}</p>
          </div>
        ))}
      </div>

      <div className="p-4 rounded-xl border border-[#E5E5E7] bg-[#FAFAFA]">
        <h4 className="text-xs font-mono font-bold text-[#111114] uppercase tracking-wider mb-2">User Journey Topology</h4>
        <div className="flex flex-col sm:flex-row items-center justify-between gap-2 text-xs font-mono text-[#374151] pt-2">
          <div className="p-2.5 rounded-lg bg-white border border-[#E5E5E7] w-full text-center font-semibold">1. Connect Repo</div>
          <ChevronRight className="w-4 h-4 text-[#9CA3AF] shrink-0 hidden sm:block" />
          <div className="p-2.5 rounded-lg bg-[#2563EB]/10 border border-[#2563EB]/20 text-[#2563EB] w-full text-center font-bold">2. Swarm Agent Scan</div>
          <ChevronRight className="w-4 h-4 text-[#9CA3AF] shrink-0 hidden sm:block" />
          <div className="p-2.5 rounded-lg bg-white border border-[#E5E5E7] w-full text-center font-semibold">3. Interactive Visual Map</div>
          <ChevronRight className="w-4 h-4 text-[#9CA3AF] shrink-0 hidden sm:block" />
          <div className="p-2.5 rounded-lg bg-emerald-50 text-emerald-700 border border-emerald-200 w-full text-center font-semibold">4. Automated Action</div>
        </div>
      </div>
    </motion.div>
  );

  /* =============================================================
     NEW UI/UX SECTION 2: Visual Tokens & Color System
  ============================================================= */
  if (activeId === 'design-system') return (
    <motion.div key="design-system" variants={variants} initial="initial" animate="animate" exit="exit" transition={{ duration: 0.25 }} className="space-y-6">
      <div>
        <Badge label="UI/UX & Design System" color="purple" />
        <h1 className="text-3xl font-extrabold text-[#111114] mt-3 mb-2 tracking-tight">Visual Design Tokens & Color Architecture</h1>
        <p className="text-[#6B7280] leading-relaxed">Comprehensive palette, typography scale, and elevation tokens built for maximum visual clarity and contrast compliance.</p>
      </div>

      <h3 className="font-bold text-[#111114] text-base">1. Brand & Semantic Color Tokens</h3>
      <p className="text-xs text-[#6B7280] -mt-4">Click any swatch to copy its hex color to your clipboard.</p>
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
        <ColorSwatch name="Primary Royal Blue" hex="#2563EB" usage="Brand identity, main CTAs, selected states" lightText />
        <ColorSwatch name="Dark Royal Blue" hex="#1D4ED8" usage="Button hover states, active indicators" lightText />
        <ColorSwatch name="Trace Violet" hex="#7C3AED" usage="Trace agent execution telemetry" lightText />
        <ColorSwatch name="Security Red" hex="#DC2626" usage="Critical vulnerabilities & error flags" lightText />
        <ColorSwatch name="Manager Amber" hex="#D97706" usage="Orchestration status & warning toasts" lightText />
        <ColorSwatch name="Success Emerald" hex="#059669" usage="Passed checks & clean build verification" lightText />
        <ColorSwatch name="Canvas Slate 950" hex="#020617" usage="Dark code viewer backgrounds" lightText />
        <ColorSwatch name="Surface Off-White" hex="#FAFAFA" usage="Page canvas background layer" />
      </div>

      <h3 className="font-bold text-[#111114] text-base pt-2">2. Typography Scale Specs</h3>
      <div className="space-y-3 rounded-xl border border-[#E5E5E7] p-4 bg-white">
        <div className="border-b border-[#E5E5E7] pb-3">
          <span className="text-[10px] font-mono text-[#9CA3AF] uppercase">Display Header (36px / Bold / Tracking-tight)</span>
          <p className="text-2xl font-extrabold text-[#111114] tracking-tight">RepoAtlas AI Intelligence</p>
        </div>
        <div className="border-b border-[#E5E5E7] pb-3">
          <span className="text-[10px] font-mono text-[#9CA3AF] uppercase">Section Header (24px / Bold)</span>
          <p className="text-xl font-bold text-[#111114]">Agent Swarm Telemetry Pipeline</p>
        </div>
        <div className="border-b border-[#E5E5E7] pb-3">
          <span className="text-[10px] font-mono text-[#9CA3AF] uppercase">Body Standard (14px / Regular / Leading-relaxed)</span>
          <p className="text-sm text-[#374151] leading-relaxed">The AST scanner parses syntax trees and constructs dependency models automatically.</p>
        </div>
        <div>
          <span className="text-[10px] font-mono text-[#9CA3AF] uppercase">Monospace Code (13px / Fira Code / JetBrains Mono)</span>
          <p className="text-xs font-mono text-[#2563EB] bg-[#2563EB]/8 p-2 rounded mt-1">{"const swarm = new AgentSwarm({ maxParallel: 5 });"}</p>
        </div>
      </div>

      <h3 className="font-bold text-[#111114] text-base pt-2">3. Elevation, Radius & Border Tokens</h3>
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
        <div className="p-4 rounded-lg border border-[#E5E5E7] bg-white shadow-sm">
          <code className="text-xs font-mono text-[#2563EB]">rounded-lg (8px)</code>
          <p className="text-xs text-[#6B7280] mt-1">Small badges, inputs & code chips</p>
        </div>
        <div className="p-4 rounded-xl border border-[#E5E5E7] bg-white shadow-md">
          <code className="text-xs font-mono text-[#2563EB]">rounded-xl (12px)</code>
          <p className="text-xs text-[#6B7280] mt-1">Cards, code blocks & sidebar groups</p>
        </div>
        <div className="p-4 rounded-2xl border border-[#E5E5E7] bg-white shadow-lg">
          <code className="text-xs font-mono text-[#2563EB]">rounded-2xl (16px)</code>
          <p className="text-xs text-[#6B7280] mt-1">Main page container & modal dialogs</p>
        </div>
      </div>
    </motion.div>
  );

  /* =============================================================
     NEW UI/UX SECTION 3: Component Library Specs
  ============================================================= */
  if (activeId === 'component-specs') return (
    <motion.div key="component-specs" variants={variants} initial="initial" animate="animate" exit="exit" transition={{ duration: 0.25 }} className="space-y-6">
      <div>
        <Badge label="UI/UX & Design System" color="purple" />
        <h1 className="text-3xl font-extrabold text-[#111114] mt-3 mb-2 tracking-tight">Component Library Specifications</h1>
        <p className="text-[#6B7280] leading-relaxed">Interactive specs and UI component variants used across the RepoAtlas platform.</p>
      </div>

      <h3 className="font-bold text-[#111114] text-base">1. Button Hierarchy & Interactive States</h3>
      <div className="flex flex-wrap items-center gap-3 p-5 rounded-xl border border-[#E5E5E7] bg-white">
        <button className="px-4 py-2 rounded-full text-xs font-semibold text-white bg-[#2563EB] hover:bg-[#1D4ED8] shadow-sm transition-all flex items-center gap-1.5">
          Primary Action <ArrowRight className="w-3.5 h-3.5" />
        </button>
        <button className="px-4 py-2 rounded-full text-xs font-semibold text-[#374151] bg-[#F3F4F6] hover:bg-[#E5E7EB] transition-all">
          Secondary Action
        </button>
        <button className="px-4 py-2 rounded-full text-xs font-semibold text-[#2563EB] bg-[#2563EB]/10 border border-[#2563EB]/20 hover:bg-[#2563EB]/20 transition-all">
          Subtle Outline
        </button>
        <button className="p-2 rounded-lg text-[#6B7280] hover:text-[#111114] hover:bg-[#F3F4F6] transition-all">
          <Copy className="w-4 h-4" />
        </button>
      </div>

      <h3 className="font-bold text-[#111114] text-base pt-2">2. Status Indicator Badges</h3>
      <div className="flex flex-wrap gap-2.5 p-4 rounded-xl border border-[#E5E5E7] bg-[#FAFAFA]">
        <Badge label="Information" color="blue" />
        <Badge label="Success Verification" color="green" />
        <Badge label="Warning Threshold" color="yellow" />
        <Badge label="Critical Vulnerability" color="red" />
        <Badge label="Swarm Active" color="purple" />
      </div>

      <h3 className="font-bold text-[#111114] text-base pt-2">3. Interactive Data Card Pattern</h3>
      <div className="p-5 rounded-xl border border-[#E5E5E7] bg-white hover:border-[#2563EB]/40 hover:shadow-md transition-all">
        <div className="flex items-center justify-between mb-3">
          <div className="flex items-center gap-3">
            <div className="p-2.5 rounded-lg bg-[#7C3AED]/10 text-[#7C3AED]">
              <Search className="w-5 h-5" />
            </div>
            <div>
              <h4 className="font-bold text-[#111114] text-sm">Trace Agent Component Spec</h4>
              <p className="text-xs text-[#6B7280]">Call Chain Tracking Engine</p>
            </div>
          </div>
          <Badge label="Stage 02" color="purple" />
        </div>
        <p className="text-xs text-[#374151] leading-relaxed mb-3">
          Monitors call frames from ingress router to database layer and flags asynchronous unhandled exceptions.
        </p>
        <div className="flex items-center justify-between text-xs font-mono text-[#6B7280] pt-2 border-t border-[#E5E5E7]">
          <span>Latency Target: &lt;150ms</span>
          <span className="text-[#059669] font-bold">100% Operational</span>
        </div>
      </div>
    </motion.div>
  );

  /* =============================================================
     NEW UI/UX SECTION 4: Information Architecture & Accessibility
  ============================================================= */
  if (activeId === 'ux-architecture') return (
    <motion.div key="ux-architecture" variants={variants} initial="initial" animate="animate" exit="exit" transition={{ duration: 0.25 }} className="space-y-6">
      <div>
        <Badge label="UI/UX & Design System" color="purple" />
        <h1 className="text-3xl font-extrabold text-[#111114] mt-3 mb-2 tracking-tight">Information Architecture & Accessibility (A11y)</h1>
        <p className="text-[#6B7280] leading-relaxed">Enterprise compliance guidelines ensuring seamless keyboard accessibility, screen reader support, and responsive visual flow.</p>
      </div>

      <div className="space-y-4">
        <h3 className="font-bold text-[#111114] text-base">WCAG 2.1 Level AA Accessibility Matrix</h3>
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          {[
            {
              title: 'Keyboard Navigation & Focus Rings',
              desc: 'All interactive sidebar controls, search inputs, tabs, and buttons feature visible focus outline rings (2px solid #2563EB) for complete mouseless control.',
            },
            {
              title: 'ARIA Roles & Landmark Semantics',
              desc: 'Uses explicit semantic markup (<nav>, <main>, <header>, <footer>) along with aria-expanded, aria-[#2563EB], and role="region" bindings.',
            },
            {
              title: 'Contrast Ratio Compliance',
              desc: 'Guarantees minimum 4.5:1 text contrast for body copy (#374151 on #FAFAFA) and 7:1 contrast for primary navigation elements.',
            },
            {
              title: 'Screen Reader Toast Notifications',
              desc: 'Copy-to-clipboard toasts and swarm execution notifications use live region announcements (aria-live="polite").',
            },
          ].map((item) => (
            <div key={item.title} className="p-4 rounded-xl border border-[#E5E5E7] bg-white">
              <div className="flex items-center gap-2 text-emerald-600 font-bold text-xs mb-1.5">
                <CheckCircle2 className="w-4 h-4" /> WCAG AA Compliant
              </div>
              <h4 className="font-bold text-[#111114] text-sm mb-1">{item.title}</h4>
              <p className="text-xs text-[#6B7280] leading-relaxed">{item.desc}</p>
            </div>
          ))}
        </div>
      </div>

      <h3 className="font-bold text-[#111114] text-base pt-2">Motion Choreography & Spring Tokens</h3>
      <CodeBlock
        lang="typescript"
        code={`// Framer Motion Standard Transition Spec\nexport const pageTransitionVariants = {\n  initial: { opacity: 0, y: 12 },\n  animate: { opacity: 1, y: 0, transition: { duration: 0.25, ease: [0.16, 1, 0.3, 1] } },\n  exit: { opacity: 0, y: -8, transition: { duration: 0.15 } }\n};`}
      />
    </motion.div>
  );

  /* -------------------------------------------------------------
     AGENTS SECTIONS
  ------------------------------------------------------------- */
  const agentDoc = AGENTS.find((a) => a.id === activeId);
  if (agentDoc) {
    const Icon = agentDoc.icon;
    const sdkName = agentDoc.id.replace('-agent', '').replace(/-/g, '');
    return (
      <motion.div key={agentDoc.id} variants={variants} initial="initial" animate="animate" exit="exit" transition={{ duration: 0.25 }} className="space-y-6">
        <div className="flex items-start gap-4">
          <div className="p-3 rounded-xl shrink-0 shadow-sm" style={{ backgroundColor: `${agentDoc.color}18` }}>
            <Icon className="w-6 h-6" style={{ color: agentDoc.color }} />
          </div>
          <div>
            <Badge label={`Pipeline Stage ${agentDoc.stage}`} />
            <h1 className="text-3xl font-extrabold text-[#111114] mt-2 mb-1 tracking-tight">{agentDoc.label}</h1>
            <p className="text-[#6B7280] leading-relaxed">{agentDoc.subtitle}</p>
          </div>
        </div>
        <h3 className="font-bold text-[#111114] text-sm">Invoke via CLI</h3>
        <CodeBlock lang="bash" code={`repoatlas run --agent ${agentDoc.id.replace('-agent', '')}`} />
        <h3 className="font-bold text-[#111114] text-sm">Invoke via SDK</h3>
        <CodeBlock lang="typescript" code={`const result = await client.agents.${sdkName}.run({\n  repoUrl: 'https://github.com/your-org/repo',\n  branch: 'main',\n});\n\nconsole.log(result.output);`} />
        <h3 className="font-bold text-[#111114] text-sm">API Endpoint</h3>
        <EndpointRow method="POST" path={`/v1/agents/${agentDoc.id}/run`} desc={`Trigger a ${agentDoc.label} analysis pipeline on the specified repository.`} />
        <div className="p-4 rounded-xl border border-[#E5E5E7] bg-[#FAFAFA]">
          <p className="text-xs font-mono font-bold text-[#6B7280] uppercase tracking-wider mb-3">Response Schema Fields</p>
          <div className="space-y-2">
            {['run_id', 'status', 'output', 'duration_ms', 'created_at'].map((field) => (
              <div key={field} className="flex items-center gap-2">
                <code className="text-xs font-mono text-[#2563EB] font-semibold">{field}</code>
                <span className="text-xs text-[#9CA3AF]">string</span>
              </div>
            ))}
          </div>
        </div>
        <a href={agentDoc.href} className="inline-flex items-center gap-2 text-sm text-[#2563EB] font-semibold hover:underline">
          Open Live Agent Demo <ExternalLink className="w-3.5 h-3.5" />
        </a>
      </motion.div>
    );
  }

  /* -------------------------------------------------------------
     API REFERENCE SECTIONS
  ------------------------------------------------------------- */
  if (activeId === 'api-overview') return (
    <motion.div key="api-overview" variants={variants} initial="initial" animate="animate" exit="exit" transition={{ duration: 0.25 }} className="space-y-6">
      <div>
        <Badge label="API Reference" />
        <h1 className="text-3xl font-extrabold text-[#111114] mt-3 mb-2 tracking-tight">API Overview</h1>
        <p className="text-[#6B7280] leading-relaxed">The RepoAtlas REST API gives you programmatic access to all agents, analysis results, and reports.</p>
      </div>
      <div className="grid grid-cols-2 gap-3">
        {[
          { label: 'Base URL', value: 'https://api.repoatlas.ai/v1' },
          { label: 'Protocol', value: 'HTTPS only' },
          { label: 'Auth', value: 'Bearer Token' },
          { label: 'Format', value: 'JSON' },
        ].map((item) => (
          <div key={item.label} className="p-3.5 rounded-xl border border-[#E5E5E7] bg-white">
            <p className="text-[10px] font-mono text-[#9CA3AF] uppercase tracking-wider">{item.label}</p>
            <p className="text-sm font-mono font-bold text-[#111114] mt-0.5">{item.value}</p>
          </div>
        ))}
      </div>
      <CodeBlock lang="bash" code={`curl https://api.repoatlas.ai/v1/health\n# { "status": "ok", "version": "1.4.2" }`} />
    </motion.div>
  );

  if (activeId === 'api-endpoints') return (
    <motion.div key="api-endpoints" variants={variants} initial="initial" animate="animate" exit="exit" transition={{ duration: 0.25 }} className="space-y-6">
      <div>
        <Badge label="API Reference" />
        <h1 className="text-3xl font-extrabold text-[#111114] mt-3 mb-2 tracking-tight">Endpoints</h1>
        <p className="text-[#6B7280] leading-relaxed">Full list of available API endpoints.</p>
      </div>
      <h3 className="font-bold text-[#111114] text-sm">Repositories</h3>
      <div className="space-y-2">
        <EndpointRow method="GET" path="/v1/repos" desc="List all connected repositories" />
        <EndpointRow method="POST" path="/v1/repos" desc="Connect a new repository" />
        <EndpointRow method="DELETE" path="/v1/repos/:id" desc="Disconnect a repository" />
      </div>
      <h3 className="font-bold text-[#111114] text-sm">Agents</h3>
      <div className="space-y-2">
        <EndpointRow method="GET" path="/v1/agents" desc="List all available agents" />
        <EndpointRow method="POST" path="/v1/agents/:name/run" desc="Trigger an agent pipeline run" />
        <EndpointRow method="GET" path="/v1/agents/:name/runs/:run_id" desc="Get the status and output of a run" />
      </div>
      <h3 className="font-bold text-[#111114] text-sm">Reports</h3>
      <div className="space-y-2">
        <EndpointRow method="GET" path="/v1/reports" desc="List all generated reports" />
        <EndpointRow method="GET" path="/v1/reports/:id" desc="Fetch a specific report" />
        <EndpointRow method="DELETE" path="/v1/reports/:id" desc="Delete a report" />
      </div>
    </motion.div>
  );

  if (activeId === 'api-webhooks') return (
    <motion.div key="webhooks" variants={variants} initial="initial" animate="animate" exit="exit" transition={{ duration: 0.25 }} className="space-y-6">
      <div>
        <Badge label="API Reference" />
        <h1 className="text-3xl font-extrabold text-[#111114] mt-3 mb-2 tracking-tight">Webhooks</h1>
        <p className="text-[#6B7280] leading-relaxed">Subscribe to real-time events from agent runs using webhooks.</p>
      </div>
      <h3 className="font-bold text-[#111114] text-sm">Register a Webhook</h3>
      <CodeBlock lang="bash" code={`curl -X POST https://api.repoatlas.ai/v1/webhooks \\\n  -H "Authorization: Bearer ra_live_xxx" \\\n  -H "Content-Type: application/json" \\\n  -d '{"url":"https://yourapp.com/hooks","events":["run.completed","run.failed"]}'`} />
      <h3 className="font-bold text-[#111114] text-sm">Event Types</h3>
      <div className="space-y-2">
        {['run.started', 'run.completed', 'run.failed', 'security.alert', 'report.ready'].map((evt) => (
          <div key={evt} className="flex items-center gap-3 p-3 rounded-lg border border-[#E5E5E7] bg-white">
            <Activity className="w-3.5 h-3.5 text-[#2563EB] shrink-0" />
            <code className="text-xs font-mono text-[#111114] font-semibold">{evt}</code>
          </div>
        ))}
      </div>
    </motion.div>
  );

  if (activeId === 'api-errors') return (
    <motion.div key="errors" variants={variants} initial="initial" animate="animate" exit="exit" transition={{ duration: 0.25 }} className="space-y-6">
      <div>
        <Badge label="API Reference" />
        <h1 className="text-3xl font-extrabold text-[#111114] mt-3 mb-2 tracking-tight">Error Codes</h1>
        <p className="text-[#6B7280] leading-relaxed">Standard HTTP error codes returned by the RepoAtlas API.</p>
      </div>
      <div className="space-y-2">
        {[
          { code: '400', label: 'Bad Request', desc: 'Invalid request body or missing required fields.', color: 'red' as const },
          { code: '401', label: 'Unauthorized', desc: 'Missing or invalid API key.', color: 'red' as const },
          { code: '403', label: 'Forbidden', desc: 'Insufficient token scopes for this action.', color: 'yellow' as const },
          { code: '404', label: 'Not Found', desc: 'Resource does not exist.', color: 'yellow' as const },
          { code: '429', label: 'Rate Limited', desc: 'Too many requests. Retry after the Retry-After header.', color: 'yellow' as const },
          { code: '500', label: 'Internal Error', desc: 'Unexpected server error. Contact support.', color: 'red' as const },
        ].map((e) => (
          <div key={e.code} className="flex items-start gap-3 p-3 rounded-lg border border-[#E5E5E7] bg-white">
            <Badge label={e.code} color={e.color} />
            <div>
              <p className="text-xs font-bold text-[#111114]">{e.label}</p>
              <p className="text-xs text-[#6B7280]">{e.desc}</p>
            </div>
          </div>
        ))}
      </div>
    </motion.div>
  );

  /* -------------------------------------------------------------
     GUIDES SECTIONS
  ------------------------------------------------------------- */
  if (activeId === 'guide-ci') return (
    <motion.div key="guide-ci" variants={variants} initial="initial" animate="animate" exit="exit" transition={{ duration: 0.25 }} className="space-y-6">
      <div>
        <Badge label="Guides" />
        <h1 className="text-3xl font-extrabold text-[#111114] mt-3 mb-2 tracking-tight">CI/CD Integration</h1>
        <p className="text-[#6B7280] leading-relaxed">Run RepoAtlas agents automatically on every pull request using GitHub Actions.</p>
      </div>
      <h3 className="font-bold text-[#111114] text-sm">GitHub Actions Workflow</h3>
      <CodeBlock lang="yaml" code={`name: RepoAtlas Analysis\non:\n  pull_request:\n    branches: [main]\n\njobs:\n  analyze:\n    runs-on: ubuntu-latest\n    steps:\n      - uses: actions/checkout@v4\n      - name: Run RepoAtlas\n        uses: repoatlas/action@v1\n        with:\n          api-key: \${{ secrets.REPOATLAS_API_KEY }}\n          agents: explorer,security,trace\n          fail-on: critical`} />
      <div className="p-4 rounded-xl border border-emerald-200 bg-emerald-50">
        <p className="text-sm text-emerald-800 font-semibold mb-1">✅ Pro Tip</p>
        <p className="text-xs text-emerald-700">Use <code>fail-on: critical</code> to block merges when critical security vulnerabilities are detected.</p>
      </div>
    </motion.div>
  );

  if (activeId === 'guide-github') return (
    <motion.div key="guide-github" variants={variants} initial="initial" animate="animate" exit="exit" transition={{ duration: 0.25 }} className="space-y-6">
      <div>
        <Badge label="Guides" />
        <h1 className="text-3xl font-extrabold text-[#111114] mt-3 mb-2 tracking-tight">GitHub App Setup</h1>
        <p className="text-[#6B7280] leading-relaxed">Install the RepoAtlas GitHub App to get automatic PR comments, status checks, and inline annotations.</p>
      </div>
      {[
        'Go to GitHub Marketplace and install the RepoAtlas AI app.',
        'Grant access to your organization or specific repositories.',
        'Add REPOATLAS_API_KEY to your repository secrets.',
        'Open any PR — RepoAtlas will post analysis as a status check within seconds.',
      ].map((step, i) => (
        <div key={i} className="flex gap-3 items-start p-3 rounded-lg border border-[#E5E5E7] bg-white">
          <span className="w-6 h-6 rounded-full bg-[#2563EB] text-white text-xs font-bold flex items-center justify-center shrink-0">{i + 1}</span>
          <p className="text-sm text-[#374151] leading-relaxed pt-0.5">{step}</p>
        </div>
      ))}
    </motion.div>
  );

  if (activeId === 'guide-security') return (
    <motion.div key="guide-security" variants={variants} initial="initial" animate="animate" exit="exit" transition={{ duration: 0.25 }} className="space-y-6">
      <div>
        <Badge label="Guides" />
        <h1 className="text-3xl font-extrabold text-[#111114] mt-3 mb-2 tracking-tight">Security Policies</h1>
        <p className="text-[#6B7280] leading-relaxed">Configure custom thresholds, ignore rules, and alerting policies for the Security Agent.</p>
      </div>
      <h3 className="font-bold text-[#111114] text-sm">Policy Config File (.repoatlas.yml)</h3>
      <CodeBlock lang="yaml" code={`security:\n  fail_on:\n    - severity: critical\n    - severity: high\n  ignore:\n    - CVE-2021-44228  # Already patched\n  alert_channels:\n    - type: slack\n      webhook: \${{ secrets.SLACK_WEBHOOK }}\n    - type: email\n      to: security@yourcompany.com`} />
    </motion.div>
  );

  return null;
}

/* ─────────────────────────────────────────────
   Sidebar Navigation Component
───────────────────────────────────────────── */
function Sidebar({
  activeId,
  onSelect,
  searchQuery,
}: {
  activeId: string;
  onSelect: (id: string) => void;
  searchQuery: string;
}) {
  const [openGroups, setOpenGroups] = useState<Set<string>>(
    new Set(NAV_SECTIONS.map((s) => s.group))
  );

  const toggleGroup = (group: string) => {
    setOpenGroups((prev) => {
      const next = new Set(prev);
      next.has(group) ? next.delete(group) : next.add(group);
      return next;
    });
  };

  const filteredSections = useMemo(() => {
    if (!searchQuery.trim()) return NAV_SECTIONS;
    const q = searchQuery.toLowerCase();
    return NAV_SECTIONS.map((sec) => ({
      ...sec,
      items: sec.items.filter(
        (item) =>
          item.label.toLowerCase().includes(q) || item.id.toLowerCase().includes(q)
      ),
    })).filter((sec) => sec.items.length > 0);
  }, [searchQuery]);

  return (
    <nav className="w-64 shrink-0 flex flex-col gap-1">
      {filteredSections.map((section) => {
        const Icon = section.icon;
        const isOpen = openGroups.has(section.group) || Boolean(searchQuery.trim());
        return (
          <div key={section.group} className="mb-2">
            <button
              onClick={() => toggleGroup(section.group)}
              className="w-full flex items-center justify-between px-3 py-2 rounded-lg text-xs font-mono font-bold text-[#6B7280] uppercase tracking-wider hover:bg-[#F3F4F6] hover:text-[#111114] transition-colors"
            >
              <div className="flex items-center gap-2">
                <Icon className="w-4 h-4 text-[#2563EB]" />
                {section.group}
              </div>
              {isOpen ? <ChevronDown className="w-3.5 h-3.5 text-[#9CA3AF]" /> : <ChevronRight className="w-3.5 h-3.5 text-[#9CA3AF]" />}
            </button>
            <AnimatePresence>
              {isOpen && (
                <motion.div
                  initial={{ height: 0, opacity: 0 }}
                  animate={{ height: 'auto', opacity: 1 }}
                  exit={{ height: 0, opacity: 0 }}
                  transition={{ duration: 0.2 }}
                  className="overflow-hidden"
                >
                  <div className="ml-3 border-l-2 border-[#E5E5E7] pl-3 flex flex-col gap-0.5 py-1">
                    {section.items.map((item) => {
                      const isActive = activeId === item.id;
                      return (
                        <button
                          key={item.id}
                          onClick={() => onSelect(item.id)}
                          className={`w-full text-left px-3 py-2 rounded-lg text-xs font-medium transition-all duration-150 flex items-center justify-between ${
                            isActive
                              ? 'bg-[#2563EB] text-white font-semibold shadow-sm'
                              : 'text-[#374151] hover:bg-[#F3F4F6] hover:text-[#111114]'
                          }`}
                        >
                          <span className="truncate">{item.label}</span>
                          {isActive && <ChevronRight className="w-3.5 h-3.5 text-white shrink-0" />}
                        </button>
                      );
                    })}
                  </div>
                </motion.div>
              )}
            </AnimatePresence>
          </div>
        );
      })}
    </nav>
  );
}

/* ─────────────────────────────────────────────
   Main Docs Page Component
───────────────────────────────────────────── */
export default function DocsPage() {
  const { user } = useAuth();
  const [activeId, setActiveId] = useState('uiux-overview');
  const [mobileSidebarOpen, setMobileSidebarOpen] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');

  const allItems = useMemo(() => NAV_SECTIONS.flatMap((s) => s.items), []);
  const idx = allItems.findIndex((i) => i.id === activeId);
  const prev = allItems[idx - 1];
  const next = allItems[idx + 1];

  return (
    <main className="min-h-screen bg-[#FAFAFA] text-[#111114] selection:bg-[#2563EB]/20 selection:text-[#2563EB] flex flex-col font-sans">
      <Navbar hideAgents={!user} hideAuthButtons />

      <div className="flex-1 max-w-7xl mx-auto w-full px-4 sm:px-6 lg:px-8 pt-28 pb-24">

        {/* Documentation Header Banner */}
        <div className="mb-8 p-6 rounded-2xl border border-[#E5E5E7] bg-white shadow-sm flex flex-col md:flex-row items-start md:items-center justify-between gap-4">
          <div>
            <div className="flex items-center gap-2 mb-1">
              <Badge label="Official Documentation & UI/UX Specs" color="blue" />
              <span className="text-xs font-mono text-[#9CA3AF]">v1.4.2</span>
            </div>
            <h1 className="text-2xl font-extrabold text-[#111114]">RepoAtlas Documentation Hub</h1>
            <p className="text-xs text-[#6B7280] mt-1">Explore agent pipelines, API contracts, guides, and enterprise UI/UX design architecture.</p>
          </div>

          {/* Quick Search */}
          <div className="relative w-full md:w-72">
            <Search className="w-4 h-4 text-[#9CA3AF] absolute left-3.5 top-1/2 -translate-y-1/2" />
            <input
              type="text"
              placeholder="Search docs & UI specs..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="w-full pl-9 pr-4 py-2 rounded-xl text-xs bg-[#FAFAFA] border border-[#E5E5E7] focus:outline-none focus:border-[#2563EB] focus:ring-2 focus:ring-[#2563EB]/20 transition-all font-mono"
            />
            {searchQuery && (
              <button onClick={() => setSearchQuery('')} className="absolute right-3 top-1/2 -translate-y-1/2 text-xs text-[#9CA3AF] hover:text-[#111114]">
                <X className="w-3.5 h-3.5" />
              </button>
            )}
          </div>
        </div>

        {/* Mobile Sidebar Toggle */}
        <div className="flex items-center justify-between gap-3 mb-6 lg:hidden">
          <button
            onClick={() => setMobileSidebarOpen(!mobileSidebarOpen)}
            className="flex items-center gap-2 px-4 py-2 rounded-xl border border-[#E5E5E7] bg-white text-xs font-semibold text-[#374151] shadow-sm"
          >
            {mobileSidebarOpen ? <X className="w-4 h-4 text-[#2563EB]" /> : <Menu className="w-4 h-4 text-[#2563EB]" />}
            {mobileSidebarOpen ? 'Close Navigation' : 'Browse Topics'}
          </button>
          <span className="text-xs text-[#6B7280] font-mono">
            Topic: <strong className="text-[#111114]">{allItems.find((i) => i.id === activeId)?.label}</strong>
          </span>
        </div>

        <div className="flex gap-8 items-start">
          {/* Desktop Sidebar */}
          <div className="hidden lg:block sticky top-28 self-start bg-white p-4 rounded-2xl border border-[#E5E5E7] shadow-sm">
            <Sidebar activeId={activeId} onSelect={setActiveId} searchQuery={searchQuery} />
          </div>

          {/* Mobile Sidebar Overlay */}
          <AnimatePresence>
            {mobileSidebarOpen && (
              <motion.div
                initial={{ opacity: 0, x: -20 }}
                animate={{ opacity: 1, x: 0 }}
                exit={{ opacity: 0, x: -20 }}
                className="fixed inset-0 top-20 z-40 bg-white/95 backdrop-blur-md p-6 lg:hidden overflow-y-auto"
              >
                <Sidebar
                  activeId={activeId}
                  onSelect={(id) => { setActiveId(id); setMobileSidebarOpen(false); }}
                  searchQuery={searchQuery}
                />
              </motion.div>
            )}
          </AnimatePresence>

          {/* Main Content Card */}
          <div className="flex-1 min-w-0">
            <div className="bg-white rounded-2xl border border-[#E5E5E7] shadow-sm p-6 sm:p-8 min-h-[620px]">
              <AnimatePresence mode="wait">
                <SectionContent activeId={activeId} />
              </AnimatePresence>
            </div>

            {/* Pagination Controls */}
            <div className="flex items-center justify-between mt-6 px-1">
              <div>
                {prev ? (
                  <button
                    onClick={() => setActiveId(prev.id)}
                    className="flex items-center gap-2 text-xs text-[#374151] hover:text-[#2563EB] transition-colors font-semibold py-2 px-3 rounded-lg border border-[#E5E5E7] bg-white shadow-sm"
                  >
                    <ArrowRight className="w-3.5 h-3.5 rotate-180 text-[#2563EB]" />
                    <span>Previous: <strong className="text-[#111114]">{prev.label}</strong></span>
                  </button>
                ) : <div />}
              </div>
              <div>
                {next ? (
                  <button
                    onClick={() => setActiveId(next.id)}
                    className="flex items-center gap-2 text-xs text-[#374151] hover:text-[#2563EB] transition-colors font-semibold py-2 px-3 rounded-lg border border-[#E5E5E7] bg-white shadow-sm"
                  >
                    <span>Next: <strong className="text-[#111114]">{next.label}</strong></span>
                    <ArrowRight className="w-3.5 h-3.5 text-[#2563EB]" />
                  </button>
                ) : <div />}
              </div>
            </div>
          </div>
        </div>
      </div>

      <Footer />
    </main>
  );
}
