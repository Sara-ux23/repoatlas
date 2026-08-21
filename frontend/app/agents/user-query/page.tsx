'use client';

import React, { useState, useRef, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import {
  Sparkles, Send, Loader2, User, Bot, Trash2, Database,
  Clock, ChevronRight, GitBranch, Plus, X, PanelLeft,
} from 'lucide-react';
import { Navbar } from '../../../components/Navbar';

import {
  askUserQuery, getChatHistory, saveChatMessage, clearChatHistory,
  getAnalysisHistory, AnalysisSummary,
} from '../../../lib/api';
import { useRepo } from '../../../lib/repoContext';

/* ── Types ── */
interface Message {
  role: 'user' | 'assistant';
  content: string;
  timestamp: Date;
  persisted?: boolean;
}

/* ── Helpers ── */
function repoLabel(url: string) {
  try { return new URL(url).pathname.replace(/^\//, '').replace(/\.git$/, ''); }
  catch { return url; }
}
function timeAgo(iso: string) {
  const diff = Date.now() - new Date(iso).getTime();
  const m = Math.floor(diff / 60000);
  if (m < 1) return 'just now';
  if (m < 60) return `${m}m ago`;
  const h = Math.floor(m / 60);
  if (h < 24) return `${h}h ago`;
  return `${Math.floor(h / 24)}d ago`;
}

const WELCOME = (repo?: string): Message => ({
  role: 'assistant',
  content: repo
    ? `Chat history loaded for \`${repoLabel(repo)}\`. Ask me anything about its architecture, code patterns, or git history.`
    : "Hi! I'm your AI assistant for analyzing code repositories. Ask me anything about the currently loaded repository — architecture, code patterns, git history, or specific implementations.",
  timestamp: new Date(),
  persisted: false,
});

/* ── Sidebar ── */
function ChatSidebar({
  history, activeRepo, onSelect, onNewChat, open, onClose,
}: {
  history: AnalysisSummary[];
  activeRepo: string;
  onSelect: (item: AnalysisSummary) => void;
  onNewChat: () => void;
  open: boolean;
  onClose: () => void;
}) {
  const seen = new Set<string>();
  const unique = history.filter((h) => { if (seen.has(h.repo_url)) return false; seen.add(h.repo_url); return true; });

  return (
    <AnimatePresence>
      {open && (
        <motion.aside
          initial={{ width: 0, opacity: 0 }}
          animate={{ width: 260, opacity: 1 }}
          exit={{ width: 0, opacity: 0 }}
          transition={{ duration: 0.22, ease: 'easeInOut' }}
          className="shrink-0 border-r border-[#E5E5E7] bg-[#FAFAFA] flex flex-col overflow-hidden"
          style={{ minWidth: 0 }}
        >
          <div className="flex items-center justify-between px-4 py-3.5 border-b border-[#E5E5E7] bg-white shrink-0">
            <div className="flex items-center gap-2">
              <Clock className="w-4 h-4 text-[#2563EB]" />
              <span className="text-sm font-semibold text-[#111114]">Previous Chats</span>
            </div>
            <button onClick={onClose} className="w-6 h-6 rounded-md hover:bg-[#F3F4F6] flex items-center justify-center text-[#9CA3AF] hover:text-[#374151] transition-colors">
              <X className="w-3.5 h-3.5" />
            </button>
          </div>
          <div className="px-3 py-2.5 border-b border-[#E5E5E7] shrink-0">
            <button onClick={onNewChat}
              className="w-full flex items-center gap-2 px-3 py-2 rounded-lg bg-[#2563EB] text-white text-xs font-semibold hover:bg-[#1D4ED8] transition-colors">
              <Plus className="w-3.5 h-3.5" />New Chat
            </button>
          </div>
          <div className="flex-1 overflow-y-auto py-2 min-h-0">
            {unique.length === 0 ? (
              <div className="px-4 py-8 text-center text-[#9CA3AF] text-xs">
                <Clock className="w-6 h-6 mx-auto mb-2 opacity-40" />No previous analyses yet
              </div>
            ) : (
              unique.map((item) => {
                const isActive = item.repo_url === activeRepo;
                return (
                  <button key={item.id} onClick={() => onSelect(item)}
                    className={`w-full text-left px-3 py-2.5 flex items-start gap-2.5 transition-colors group ${
                      isActive ? 'bg-[#EFF6FF] border-r-2 border-[#2563EB]' : 'hover:bg-[#F3F4F6]'
                    }`}>
                    <div className={`shrink-0 mt-0.5 w-7 h-7 rounded-lg flex items-center justify-center ${isActive ? 'bg-[#2563EB]' : 'bg-[#E5E5E7] group-hover:bg-[#D1D5DB]'}`}>
                      <GitBranch className={`w-3.5 h-3.5 ${isActive ? 'text-white' : 'text-[#6B7280]'}`} />
                    </div>
                    <div className="flex-1 min-w-0">
                      <p className={`text-xs font-semibold truncate ${isActive ? 'text-[#2563EB]' : 'text-[#111114]'}`}>
                        {repoLabel(item.repo_url)}
                      </p>
                      <p className="text-[10px] text-[#9CA3AF] mt-0.5 flex items-center gap-1">
                        <Clock className="w-2.5 h-2.5" />{timeAgo(item.created_at)}
                      </p>
                      {item.executive_summary && (
                        <p className="text-[10px] text-[#6B7280] mt-1 line-clamp-2 leading-relaxed">
                          {item.executive_summary.slice(0, 80)}…
                        </p>
                      )}
                    </div>
                    <ChevronRight className={`w-3 h-3 shrink-0 mt-1 ${isActive ? 'text-[#2563EB]' : 'text-[#D1D5DB] group-hover:text-[#9CA3AF]'}`} />
                  </button>
                );
              })
            )}
          </div>
        </motion.aside>
      )}
    </AnimatePresence>
  );
}

/* ── Main page ── */
export default function UserQueryPage() {
  const { repoPath, setRepoPath } = useRepo();
  const [messages, setMessages] = useState<Message[]>([WELCOME()]);
  const [activeRepo, setActiveRepo] = useState(repoPath || '');
  const [input, setInput] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [historyLoading, setHistoryLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [historyLoaded, setHistoryLoaded] = useState(false);
  const [sidebarOpen, setSidebarOpen] = useState(true);
  const [sidebarHistory, setSidebarHistory] = useState<AnalysisSummary[]>([]);
  const messagesEndRef = useRef<HTMLDivElement>(null);

  /* ── Load chat history + sidebar history on mount ── */
  useEffect(() => {
    const url = repoPath || localStorage.getItem('repoatlas_url') || sessionStorage.getItem('repoatlas_url') || '';
    if (url && (url !== activeRepo || !historyLoaded)) {
      setActiveRepo(url);
      setHistoryLoading(true);
      getChatHistory(url, 100).then((persisted) => {
        if (persisted.length > 0) {
          setMessages([WELCOME(url), ...persisted.map((m) => ({
            role: m.role as 'user' | 'assistant',
            content: m.content,
            timestamp: new Date(m.created_at),
            persisted: true,
          }))]);
        } else {
          setMessages([WELCOME(url)]);
        }
        setHistoryLoaded(true);
      }).finally(() => setHistoryLoading(false));
    }
    getAnalysisHistory().then(setSidebarHistory);
  }, [repoPath]);

  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages]);

  /* ── Switch repo from sidebar ── */
  const handleSelectHistory = async (item: AnalysisSummary) => {
    setActiveRepo(item.repo_url);
    setRepoPath(item.repo_url);
    setHistoryLoading(true);
    setMessages([WELCOME(item.repo_url)]);
    const persisted = await getChatHistory(item.repo_url, 100);
    if (persisted.length > 0) {
      setMessages([WELCOME(item.repo_url), ...persisted.map((m) => ({
        role: m.role as 'user' | 'assistant',
        content: m.content,
        timestamp: new Date(m.created_at),
        persisted: true,
      }))]);
    }
    setHistoryLoading(false);
  };

  const handleNewChat = () => setMessages([WELCOME(activeRepo)]);

  const handleClearHistory = async () => {
    if (!activeRepo) return;
    await clearChatHistory(activeRepo);
    setMessages([WELCOME(activeRepo)]);
    setHistoryLoaded(false);
  };

  /* ── Send message ── */
  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!input.trim() || isLoading) return;

    const userMsg: Message = { role: 'user', content: input.trim(), timestamp: new Date() };
    const next = [...messages, userMsg];
    setMessages(next);
    setInput('');
    setIsLoading(true);
    setError(null);

    if (activeRepo) saveChatMessage(activeRepo, 'user', userMsg.content);

    try {
      const chatHistory = messages
        .filter((m) => m.content !== WELCOME(activeRepo).content)
        .map((m) => ({ role: m.role, content: m.content }));

      const response = await askUserQuery(userMsg.content, chatHistory, activeRepo || undefined);
      const assistantMsg: Message = { role: 'assistant', content: response.answer, timestamp: new Date() };
      setMessages([...next, assistantMsg]);
      if (activeRepo) saveChatMessage(activeRepo, 'assistant', response.answer);
      if (response.error === 'NO_REPO_LOADED') setError('Please analyze a repository first on the Product page.');
    } catch (err: any) {
      const errText = err.message || 'Failed to get response.';
      setError(errText);
      setMessages([...next, { role: 'assistant', content: `Sorry, I encountered an error: ${errText}`, timestamp: new Date() }]);
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <main className="min-h-screen bg-[#FAFAFA] text-[#111114] selection:bg-[#2563EB]/20 overflow-x-hidden flex flex-col">
      <Navbar />

      <div className="flex-1 flex pt-16 w-full overflow-hidden" style={{ height: 'calc(100vh - 64px)' }}>

        {/* Sidebar */}
        <ChatSidebar
          history={sidebarHistory}
          activeRepo={activeRepo}
          onSelect={handleSelectHistory}
          onNewChat={handleNewChat}
          open={sidebarOpen}
          onClose={() => setSidebarOpen(false)}
        />

        {/* Main chat */}
        <div className="flex-1 flex flex-col min-w-0 overflow-hidden bg-white">

          {/* Header */}
          <div className="px-6 py-4 border-b border-[#E5E5E7] bg-gradient-to-r from-[#2563EB]/5 to-[#2563EB]/10 shrink-0">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-3">
                <button onClick={() => setSidebarOpen((o) => !o)}
                  className="p-2 rounded-lg hover:bg-white/60 text-[#6B7280] hover:text-[#111114] transition-colors"
                  title={sidebarOpen ? 'Hide history' : 'Show history'}>
                  <PanelLeft className="w-4 h-4" />
                </button>
                <div className="p-3 rounded-xl bg-[#2563EB] text-white shadow-lg">
                  <Sparkles className="w-6 h-6" />
                </div>
                <div>
                  <h3 className="text-xl font-bold text-[#111114]">Ask About Your Repo</h3>
                  <span className="text-xs text-[#6B7280]">
                    {activeRepo ? repoLabel(activeRepo) : 'Conversational AI for code understanding'}
                  </span>
                </div>
              </div>
              <div className="flex items-center gap-2">
                {historyLoading && (
                  <span className="flex items-center gap-1.5 text-xs text-[#9CA3AF]">
                    <Loader2 className="w-3.5 h-3.5 animate-spin" /> Loading…
                  </span>
                )}
                {historyLoaded && messages.length > 1 && (
                  <span className="flex items-center gap-1.5 text-xs text-[#6B7280] bg-white/70 px-2.5 py-1 rounded-full border border-[#E5E5E7]">
                    <Database className="w-3 h-3 text-[#2563EB]" />History loaded
                  </span>
                )}
                {messages.length > 1 && (
                  <button onClick={handleClearHistory}
                    className="flex items-center gap-1.5 px-3 py-1.5 text-xs text-[#6B7280] hover:text-red-500 border border-[#E5E5E7] bg-white/70 hover:border-red-200 rounded-lg transition-colors">
                    <Trash2 className="w-3.5 h-3.5" /> Clear
                  </button>
                )}
              </div>
            </div>
          </div>

          {/* Messages */}
          <div className="flex-1 overflow-y-auto p-6 space-y-4 min-h-0">
            <AnimatePresence initial={false}>
              {messages.map((message, idx) => (
                <motion.div key={idx} initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }}
                  transition={{ duration: 0.25 }}
                  className={`flex gap-3 ${message.role === 'user' ? 'justify-end' : 'justify-start'}`}>
                  {message.role === 'assistant' && (
                    <div className="flex-shrink-0 w-8 h-8 rounded-full bg-[#2563EB] flex items-center justify-center">
                      <Bot className="w-4 h-4 text-white" />
                    </div>
                  )}
                  <div className={`max-w-[80%] rounded-2xl px-4 py-3 ${
                    message.role === 'user' ? 'bg-[#2563EB] text-white' : 'bg-[#F3F4F6] text-[#111114]'
                  }`}>
                    <p className="text-sm whitespace-pre-wrap">{message.content}</p>
                    <span className={`text-xs mt-1 block ${message.role === 'user' ? 'text-blue-200' : 'text-[#9CA3AF]'}`}>
                      {message.timestamp.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                      {message.persisted && <span className="ml-1 opacity-60">· saved</span>}
                    </span>
                  </div>
                  {message.role === 'user' && (
                    <div className="flex-shrink-0 w-8 h-8 rounded-full bg-[#6B7280] flex items-center justify-center">
                      <User className="w-4 h-4 text-white" />
                    </div>
                  )}
                </motion.div>
              ))}
            </AnimatePresence>
            {isLoading && (
              <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="flex gap-3">
                <div className="flex-shrink-0 w-8 h-8 rounded-full bg-[#2563EB] flex items-center justify-center">
                  <Bot className="w-4 h-4 text-white" />
                </div>
                <div className="bg-[#F3F4F6] rounded-2xl px-4 py-3 flex items-center gap-2">
                  <Loader2 className="w-5 h-5 animate-spin text-[#2563EB]" />
                  <span className="text-sm text-[#6B7280]">Thinking…</span>
                </div>
              </motion.div>
            )}
            <div ref={messagesEndRef} />
          </div>

          {/* Error */}
          {error && (
            <div className="px-6 py-3 bg-red-50 border-t border-red-200 text-red-600 text-sm flex items-center justify-between shrink-0">
              <span>{error}</span>
              <button onClick={() => setError(null)} className="text-red-400 hover:text-red-600 text-xs underline">dismiss</button>
            </div>
          )}

          {/* Input */}
          <form onSubmit={handleSubmit} className="p-4 border-t border-[#E5E5E7] bg-white shrink-0">
            <div className="flex gap-3">
              <input type="text" value={input} onChange={(e) => setInput(e.target.value)}
                placeholder="Ask about the repository…" disabled={isLoading}
                className="flex-1 px-4 py-3 rounded-xl border border-[#E5E5E7] focus:outline-none focus:ring-2 focus:ring-[#2563EB] disabled:opacity-50 text-sm" />
              <button type="submit" disabled={isLoading || !input.trim()}
                className="px-5 py-3 bg-[#2563EB] text-white rounded-xl font-medium hover:bg-[#1D4ED8] disabled:opacity-50 flex items-center gap-2 transition-colors">
                {isLoading ? <Loader2 className="w-5 h-5 animate-spin" /> : <><Send className="w-4 h-4" />Send</>}
              </button>
            </div>
            <p className="text-xs text-[#9CA3AF] mt-2">Tip: Ask about code structure, recent changes, contributors, or specific implementations</p>
          </form>
        </div>
      </div>


    </main>
  );
}
