'use client';

import React, { useState, useEffect, useRef, useCallback } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import {
  MessageCircle, Send, Loader2, X, Trash2, Bot, User,
  Clock, ChevronRight, GitBranch, Plus, ArrowLeft, Search,
} from 'lucide-react';
import { useRepo } from '../lib/repoContext';
import {
  askUserQuery,
  getChatHistory,
  saveChatMessage,
  clearChatHistory,
  getChatRepos,
  getAnalysisHistory,
  ChatRepoItem,
  AnalysisSummary,
} from '../lib/api';

/* ─── Types ─────────────────────────────────────────────────────────────── */
interface Message {
  role: 'user' | 'assistant';
  content: string;
  timestamp: Date;
  persisted?: boolean;
}

/* ─── Merged repo entry (chat or analysis) ──────────────────────────────── */
interface RepoEntry {
  repo_url: string;
  last_active: string;
  message_count?: number;
  executive_summary?: string;
  has_analysis: boolean;
  is_current?: boolean;       // ← pinned "current repo" flag
}

type View = 'list' | 'chat';

/* ─── Helpers ───────────────────────────────────────────────────────────── */
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

function normaliseUrl(raw: string): string {
  const t = raw.trim();
  if (!t) return t;
  if (t.startsWith('http://') || t.startsWith('https://')) return t;
  // owner/repo shorthand
  if (/^[\w.-]+\/[\w.-]+$/.test(t)) return `https://github.com/${t}`;
  return t;
}

/* ─── Main component ────────────────────────────────────────────────────── */
export function RepoChat({ className = '' }: { className?: string }) {
  const { repoPath, analysisResult } = useRepo();   // ← also read analysisResult

  const [isOpen, setIsOpen]     = useState(false);
  const [view, setView]         = useState<View>('list');

  // Chat
  const [activeRepo, setActiveRepo]   = useState('');
  const [messages, setMessages]       = useState<Message[]>([]);
  const [input, setInput]             = useState('');
  const [isLoading, setIsLoading]     = useState(false);
  const [chatLoading, setChatLoading] = useState(false);

  // List
  const [entries, setEntries]           = useState<RepoEntry[]>([]);
  const [listLoading, setListLoading]   = useState(false);
  const [newRepoInput, setNewRepoInput] = useState('');
  const [searchQuery, setSearchQuery]   = useState('');

  const messagesEndRef = useRef<HTMLDivElement>(null);
  const inputRef       = useRef<HTMLInputElement>(null);
  const newRepoRef     = useRef<HTMLInputElement>(null);

  /* ── Merge analysis history + chat-only repos into one list ── */
  const loadList = useCallback(async () => {
    setListLoading(true);
    try {
      const [chatRepos, analyses] = await Promise.all([
        getChatRepos(),
        getAnalysisHistory(),
      ]);

      const map = new Map<string, RepoEntry>();

      // Seed from chat repos
      for (const c of chatRepos) {
        map.set(c.repo_url, {
          repo_url: c.repo_url,
          last_active: c.last_message_at,
          message_count: c.message_count,
          has_analysis: false,
        });
      }

      // Enrich / add from analyses
      for (const a of analyses) {
        const existing = map.get(a.repo_url);
        const aDate = a.created_at;
        if (!existing || aDate > existing.last_active) {
          map.set(a.repo_url, {
            repo_url: a.repo_url,
            last_active: existing
              ? (existing.last_active > aDate ? existing.last_active : aDate)
              : aDate,
            message_count: existing?.message_count,
            executive_summary: a.executive_summary ?? undefined,
            has_analysis: true,
          });
        } else {
          existing.has_analysis = true;
          existing.executive_summary = a.executive_summary ?? existing.executive_summary;
        }
      }

      // Ensure the currently loaded repo always appears — even if not yet in DB
      if (repoPath) {
        const normUrl = normaliseUrl(repoPath);
        if (!map.has(normUrl)) {
          map.set(normUrl, {
            repo_url: normUrl,
            last_active: new Date().toISOString(),
            has_analysis: !!analysisResult,
            executive_summary: analysisResult?.executive_summary ?? undefined,
            is_current: true,
          });
        } else {
          const entry = map.get(normUrl)!;
          entry.is_current = true;
          // Prefer live analysisResult summary over stale DB value
          if (analysisResult?.executive_summary) {
            entry.executive_summary = analysisResult.executive_summary;
          }
          entry.has_analysis = entry.has_analysis || !!analysisResult;
          // Bump to top
          entry.last_active = new Date().toISOString();
        }
      }

      // Sort: current repo always first, then newest-first
      const sorted = [...map.values()].sort((a, b) => {
        if (a.is_current && !b.is_current) return -1;
        if (!a.is_current && b.is_current) return 1;
        return new Date(b.last_active).getTime() - new Date(a.last_active).getTime();
      });
      setEntries(sorted);
    } finally {
      setListLoading(false);
    }
  }, [repoPath, analysisResult]);

  /* ── Reload list whenever panel opens ── */
  useEffect(() => {
    if (isOpen && view === 'list') loadList();
  }, [isOpen, view, loadList]);

  /* ── When a new repo is analyzed, refresh the list so it appears at top ── */
  useEffect(() => {
    if (!repoPath) return;
    // Refresh list entries to pin the newly analyzed repo
    if (isOpen && view === 'list') loadList();
    // If chat is open for a different repo, don't interrupt — just refresh list silently
  }, [repoPath, analysisResult]); // eslint-disable-line react-hooks/exhaustive-deps

  /* ── Scroll to bottom ── */
  useEffect(() => {
    if (isOpen && view === 'chat')
      messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages, isOpen, view]);

  /* ── Open chat for a specific repo URL ── */
  const openChat = useCallback(async (repoUrl: string) => {
    const url = normaliseUrl(repoUrl);
    if (!url) return;
    setActiveRepo(url);
    setView('chat');
    setChatLoading(true);
    setMessages([]);

    // Load persisted messages first
    const persisted = await getChatHistory(url, 80);

    if (persisted.length > 0) {
      setMessages(persisted.map((m) => ({
        role: m.role as 'user' | 'assistant',
        content: m.content,
        timestamp: new Date(m.created_at),
        persisted: true,
      })));
    } else {
      // No history yet — seed a welcome message.
      // If this is the currently analyzed repo, use its executive summary.
      const isCurrentRepo = repoPath && normaliseUrl(repoPath) === url;
      const summary = isCurrentRepo && analysisResult?.executive_summary
        ? analysisResult.executive_summary
        : null;

      const welcomeText = summary
        ? `**${repoLabel(url)}** has been analyzed.\n\n${summary}\n\nAsk me anything about its structure, code patterns, security, or contributors.`
        : `Ask me anything about **${repoLabel(url)}** — its structure, entry points, architecture, or contributors.`;

      setMessages([{
        role: 'assistant',
        content: welcomeText,
        timestamp: new Date(),
      }]);
    }

    setChatLoading(false);
    setTimeout(() => inputRef.current?.focus(), 80);
  }, [repoPath, analysisResult]);

  /* ── Send a new message ── */
  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!input.trim() || isLoading || !activeRepo) return;

    const userMsg: Message = { role: 'user', content: input.trim(), timestamp: new Date() };
    const next = [...messages, userMsg];
    setMessages(next);
    setInput('');
    setIsLoading(true);

    saveChatMessage(activeRepo, 'user', userMsg.content);

    try {
      const response = await askUserQuery(
        userMsg.content,
        messages.slice(-10).map((m) => ({ role: m.role, content: m.content })),
        activeRepo,
      );
      const aiMsg: Message = {
        role: 'assistant',
        content: response.answer,
        timestamp: new Date(),
      };
      setMessages([...next, aiMsg]);
      saveChatMessage(activeRepo, 'assistant', response.answer);
    } catch (err) {
      setMessages([...next, {
        role: 'assistant',
        content: `Error: ${err instanceof Error ? err.message : 'Failed to get response'}`,
        timestamp: new Date(),
      }]);
    } finally {
      setIsLoading(false);
    }
  };

  /* ── Handle "Start new chat" form ── */
  const handleNewRepoSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    const url = normaliseUrl(newRepoInput);
    if (!url) return;
    setNewRepoInput('');
    openChat(url);
  };

  /* ── Clear history for active repo ── */
  const handleClear = async () => {
    if (!activeRepo) return;
    await clearChatHistory(activeRepo);
    setMessages([]);
  };

  /* ── Filtered list ── */
  const filteredEntries = searchQuery.trim()
    ? entries.filter((e) =>
        e.repo_url.toLowerCase().includes(searchQuery.toLowerCase())
      )
    : entries;

  /* ── Unread badge (assistant msgs in current open chat) ── */
  const unreadCount = !isOpen
    ? messages.filter((m) => m.role === 'assistant').length
    : 0;

  return (
    <div className={`fixed bottom-5 right-5 z-50 ${className}`}>

      {/* ── Floating button ── */}
      <button
        onClick={() => { setIsOpen((o) => !o); if (!isOpen) setView('list'); }}
        className="w-13 h-13 w-12 h-12 bg-[#2563EB] text-white rounded-full shadow-xl hover:bg-[#1D4ED8] transition-all flex items-center justify-center relative"
      >
        <AnimatePresence mode="wait" initial={false}>
          {isOpen
            ? <motion.span key="x" initial={{ rotate: -90, opacity: 0 }} animate={{ rotate: 0, opacity: 1 }} exit={{ rotate: 90, opacity: 0 }} transition={{ duration: 0.15 }}><X className="w-5 h-5" /></motion.span>
            : <motion.span key="msg" initial={{ scale: 0.7, opacity: 0 }} animate={{ scale: 1, opacity: 1 }} exit={{ scale: 0.7, opacity: 0 }} transition={{ duration: 0.15 }}><MessageCircle className="w-5 h-5" /></motion.span>
          }
        </AnimatePresence>
        {unreadCount > 0 && (
          <span className="absolute -top-1 -right-1 min-w-[18px] h-[18px] px-1 bg-red-500 text-white text-[10px] font-bold rounded-full flex items-center justify-center">
            {unreadCount > 9 ? '9+' : unreadCount}
          </span>
        )}
      </button>

      {/* ── Panel ── */}
      <AnimatePresence>
        {isOpen && (
          <motion.div
            initial={{ opacity: 0, scale: 0.94, y: 12 }}
            animate={{ opacity: 1, scale: 1, y: 0 }}
            exit={{ opacity: 0, scale: 0.94, y: 12 }}
            transition={{ duration: 0.18, ease: [0.16, 1, 0.3, 1] }}
            className="absolute bottom-16 right-0 w-[340px] bg-white border border-[#E5E5E7] rounded-2xl shadow-2xl flex flex-col overflow-hidden"
            style={{ height: '520px' }}
          >
            <AnimatePresence mode="wait" initial={false}>

              {/* ════ LIST VIEW ════ */}
              {view === 'list' && (
                <motion.div key="list"
                  initial={{ opacity: 0, x: -20 }} animate={{ opacity: 1, x: 0 }}
                  exit={{ opacity: 0, x: -20 }} transition={{ duration: 0.16 }}
                  className="flex flex-col h-full"
                >
                  {/* Header */}
                  <div className="flex items-center justify-between px-4 py-3 border-b border-[#E5E5E7] shrink-0">
                    <div className="flex items-center gap-2">
                      <div className="w-7 h-7 rounded-lg bg-[#2563EB] flex items-center justify-center">
                        <MessageCircle className="w-3.5 h-3.5 text-white" />
                      </div>
                      <span className="text-sm font-bold text-[#111114]">RepoAtlas Chat</span>
                    </div>
                    <button onClick={() => setIsOpen(false)}
                      className="w-6 h-6 rounded-full hover:bg-[#F3F4F6] flex items-center justify-center text-[#9CA3AF] hover:text-[#374151] transition-colors">
                      <X className="w-3.5 h-3.5" />
                    </button>
                  </div>

                  {/* New chat input */}
                  <div className="px-3 pt-3 pb-2 shrink-0 space-y-2">
                    <form onSubmit={handleNewRepoSubmit} className="flex gap-2">
                      <input
                        ref={newRepoRef}
                        value={newRepoInput}
                        onChange={(e) => setNewRepoInput(e.target.value)}
                        placeholder="owner/repo or full GitHub URL…"
                        className="flex-1 px-3 py-2 text-xs border border-[#E5E5E7] rounded-lg focus:outline-none focus:border-[#2563EB] bg-[#FAFAFA] placeholder:text-[#C0C4CC]"
                      />
                      <button type="submit" disabled={!newRepoInput.trim()}
                        className="px-3 py-2 bg-[#2563EB] text-white text-xs font-semibold rounded-lg hover:bg-[#1D4ED8] disabled:opacity-40 transition-colors flex items-center gap-1 shrink-0">
                        <Plus className="w-3.5 h-3.5" /> Start
                      </button>
                    </form>
                  </div>

                  {/* Search */}
                  {entries.length > 3 && (
                    <div className="px-3 pb-2 shrink-0">
                      <div className="relative">
                        <Search className="absolute left-2.5 top-1/2 -translate-y-1/2 w-3 h-3 text-[#9CA3AF]" />
                        <input
                          value={searchQuery}
                          onChange={(e) => setSearchQuery(e.target.value)}
                          placeholder="Search repos…"
                          className="w-full pl-7 pr-3 py-1.5 text-xs border border-[#E5E5E7] rounded-lg focus:outline-none focus:border-[#2563EB] bg-[#FAFAFA]"
                        />
                      </div>
                    </div>
                  )}

                  {/* Section label */}
                  <div className="px-4 pb-1 shrink-0">
                    <span className="text-[10px] font-semibold text-[#9CA3AF] uppercase tracking-wider flex items-center gap-1">
                      <Clock className="w-3 h-3" />
                      {entries.length > 0 ? `All repos (${entries.length})` : 'Previous chats'}
                    </span>
                  </div>

                  {/* List */}
                  <div className="flex-1 overflow-y-auto px-2 pb-3 min-h-0 space-y-0.5">
                    {listLoading ? (
                      <div className="flex items-center justify-center py-12">
                        <Loader2 className="w-5 h-5 animate-spin text-[#2563EB]" />
                      </div>
                    ) : filteredEntries.length === 0 ? (
                      <div className="text-center py-10 text-[#9CA3AF] text-xs px-4 space-y-1">
                        <MessageCircle className="w-7 h-7 mx-auto mb-2 opacity-30" />
                        <p className="font-medium">No chats yet</p>
                        <p className="opacity-70">Enter any GitHub repo above to start chatting</p>
                      </div>
                    ) : (
                      filteredEntries.map((entry) => {
                        const isActive = entry.repo_url === activeRepo;
                        const isCurrent = entry.is_current;
                        return (
                          <button
                            key={entry.repo_url}
                            onClick={() => openChat(entry.repo_url)}
                            className={`w-full text-left flex items-start gap-2.5 px-2.5 py-2.5 rounded-xl transition-colors group ${
                              isActive
                                ? 'bg-[#EFF6FF] border border-[#BFDBFE]'
                                : isCurrent
                                ? 'bg-[#F0FDF4] border border-[#BBF7D0] hover:bg-[#DCFCE7]'
                                : 'hover:bg-[#F3F4F6] border border-transparent'
                            }`}
                          >
                            {/* Icon */}
                            <div className={`shrink-0 mt-0.5 w-8 h-8 rounded-xl flex items-center justify-center ${
                              isActive ? 'bg-[#2563EB]'
                              : isCurrent ? 'bg-emerald-500'
                              : 'bg-[#F3F4F6] group-hover:bg-[#E5E5E7]'
                            }`}>
                              <GitBranch className={`w-3.5 h-3.5 ${isActive || isCurrent ? 'text-white' : 'text-[#6B7280]'}`} />
                            </div>

                            {/* Text */}
                            <div className="flex-1 min-w-0">
                              <div className="flex items-center gap-1.5">
                                <p className={`text-xs font-semibold truncate flex-1 ${
                                  isActive ? 'text-[#2563EB]'
                                  : isCurrent ? 'text-emerald-700'
                                  : 'text-[#111114]'
                                }`}>
                                  {repoLabel(entry.repo_url)}
                                </p>
                                {isCurrent && (
                                  <span className="shrink-0 text-[9px] px-1.5 py-0.5 rounded-full bg-emerald-100 text-emerald-700 border border-emerald-300 font-bold">
                                    current
                                  </span>
                                )}
                                {entry.has_analysis && !isCurrent && (
                                  <span className="shrink-0 text-[9px] px-1.5 py-0.5 rounded-full bg-emerald-50 text-emerald-600 border border-emerald-200 font-medium">
                                    analyzed
                                  </span>
                                )}
                              </div>
                              <p className="text-[10px] text-[#9CA3AF] mt-0.5 flex items-center gap-1">
                                <Clock className="w-2.5 h-2.5 shrink-0" />
                                {isCurrent ? 'Just analyzed' : timeAgo(entry.last_active)}
                                {entry.message_count !== undefined && entry.message_count > 0 && (
                                  <span className="ml-1 opacity-60">· {entry.message_count} msg{entry.message_count !== 1 ? 's' : ''}</span>
                                )}
                              </p>
                              {entry.executive_summary && (
                                <p className="text-[10px] text-[#6B7280] mt-0.5 line-clamp-2 leading-relaxed">
                                  {entry.executive_summary.slice(0, 80)}…
                                </p>
                              )}
                            </div>

                            <ChevronRight className={`w-3 h-3 shrink-0 mt-1 transition-colors ${
                              isActive ? 'text-[#2563EB]'
                              : isCurrent ? 'text-emerald-500'
                              : 'text-[#D1D5DB] group-hover:text-[#9CA3AF]'
                            }`} />
                          </button>
                        );
                      })
                    )}
                  </div>
                </motion.div>
              )}

              {/* ════ CHAT VIEW ════ */}
              {view === 'chat' && (
                <motion.div key="chat"
                  initial={{ opacity: 0, x: 20 }} animate={{ opacity: 1, x: 0 }}
                  exit={{ opacity: 0, x: 20 }} transition={{ duration: 0.16 }}
                  className="flex flex-col h-full"
                >
                  {/* Header */}
                  <div className="flex items-center gap-2 px-3 py-2.5 border-b border-[#E5E5E7] shrink-0">
                    <button onClick={() => { setView('list'); loadList(); }}
                      className="w-7 h-7 rounded-lg hover:bg-[#F3F4F6] flex items-center justify-center text-[#6B7280] hover:text-[#111114] transition-colors shrink-0">
                      <ArrowLeft className="w-4 h-4" />
                    </button>
                    <div className="flex-1 min-w-0">
                      <p className="text-xs font-bold text-[#111114] truncate leading-tight">
                        {repoLabel(activeRepo)}
                      </p>
                      <p className="text-[10px] text-[#9CA3AF] truncate">{activeRepo}</p>
                    </div>
                    <div className="flex items-center gap-1 shrink-0">
                      {messages.length > 0 && (
                        <button onClick={handleClear} title="Clear history"
                          className="w-6 h-6 rounded-full hover:bg-red-50 flex items-center justify-center text-[#C0C4CC] hover:text-red-500 transition-colors">
                          <Trash2 className="w-3.5 h-3.5" />
                        </button>
                      )}
                      <button onClick={() => setIsOpen(false)}
                        className="w-6 h-6 rounded-full hover:bg-[#F3F4F6] flex items-center justify-center text-[#9CA3AF]">
                        <X className="w-3.5 h-3.5" />
                      </button>
                    </div>
                  </div>

                  {/* Messages */}
                  <div className="flex-1 p-3 overflow-y-auto space-y-3 min-h-0">
                    {chatLoading ? (
                      <div className="flex items-center justify-center h-full">
                        <Loader2 className="w-5 h-5 animate-spin text-[#2563EB]" />
                      </div>
                    ) : messages.length === 0 ? (
                      <div className="flex flex-col items-center justify-center h-full text-[#9CA3AF] text-xs text-center px-4 space-y-2">
                        <div className="w-10 h-10 rounded-2xl bg-[#EFF6FF] flex items-center justify-center mb-1">
                          <Bot className="w-5 h-5 text-[#2563EB]" />
                        </div>
                        <p className="font-semibold text-[#374151]">Ask about this repo</p>
                        <p className="opacity-70 leading-relaxed">
                          "What does this project do?"<br />
                          "What are the main entry points?"<br />
                          "Who are the top contributors?"
                        </p>
                      </div>
                    ) : (
                      messages.map((msg, i) => (
                        <div key={i} className={`flex gap-2 ${msg.role === 'user' ? 'justify-end' : 'justify-start'}`}>
                          {msg.role === 'assistant' && (
                            <div className="flex-shrink-0 w-6 h-6 rounded-full bg-[#2563EB] flex items-center justify-center mt-0.5">
                              <Bot className="w-3 h-3 text-white" />
                            </div>
                          )}
                          <div className={`max-w-[84%] px-3 py-2 rounded-2xl text-xs leading-relaxed ${
                            msg.role === 'user'
                              ? 'bg-[#2563EB] text-white rounded-tr-sm'
                              : 'bg-[#F3F4F6] text-[#111114] border border-[#E5E5E7] rounded-tl-sm'
                          }`}>
                            <p className="whitespace-pre-wrap">{msg.content}</p>
                            <span className={`text-[10px] mt-1 block ${msg.role === 'user' ? 'text-blue-200' : 'text-[#9CA3AF]'}`}>
                              {msg.timestamp.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                              {msg.persisted && <span className="ml-1 opacity-50">· saved</span>}
                            </span>
                          </div>
                          {msg.role === 'user' && (
                            <div className="flex-shrink-0 w-6 h-6 rounded-full bg-[#9CA3AF] flex items-center justify-center mt-0.5">
                              <User className="w-3 h-3 text-white" />
                            </div>
                          )}
                        </div>
                      ))
                    )}

                    {isLoading && (
                      <div className="flex gap-2">
                        <div className="flex-shrink-0 w-6 h-6 rounded-full bg-[#2563EB] flex items-center justify-center mt-0.5">
                          <Bot className="w-3 h-3 text-white" />
                        </div>
                        <div className="bg-[#F3F4F6] border border-[#E5E5E7] px-3 py-2.5 rounded-2xl rounded-tl-sm flex items-center gap-2">
                          {[0,1,2].map((i) => (
                            <motion.span key={i}
                              className="w-1.5 h-1.5 rounded-full bg-[#9CA3AF]"
                              animate={{ y: [0, -4, 0], opacity: [0.4, 1, 0.4] }}
                              transition={{ duration: 0.8, repeat: Infinity, delay: i * 0.15 }}
                            />
                          ))}
                        </div>
                      </div>
                    )}
                    <div ref={messagesEndRef} />
                  </div>

                  {/* Input */}
                  <form onSubmit={handleSubmit} className="p-3 border-t border-[#E5E5E7] shrink-0">
                    <div className="flex gap-2 items-end p-1.5 rounded-xl border border-[#E5E5E7] bg-[#FAFAFA] focus-within:border-[#2563EB] focus-within:bg-white transition-all">
                      <input
                        ref={inputRef}
                        type="text"
                        value={input}
                        onChange={(e) => setInput(e.target.value)}
                        placeholder="Ask about this repo…"
                        className="flex-1 px-2 py-1 text-xs bg-transparent focus:outline-none text-[#111114] placeholder:text-[#C0C4CC]"
                        disabled={isLoading}
                      />
                      <button type="submit" disabled={isLoading || !input.trim()}
                        className="w-7 h-7 bg-[#2563EB] text-white rounded-lg hover:bg-[#1D4ED8] disabled:opacity-40 flex items-center justify-center transition-colors shrink-0">
                        <Send className="w-3.5 h-3.5" />
                      </button>
                    </div>
                  </form>
                </motion.div>
              )}

            </AnimatePresence>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}
