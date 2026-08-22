'use client';

import React, { useState, useRef, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import {
  Compass, Send, User, CornerDownLeft, Loader2,
  Clock, ChevronRight, GitBranch, Plus, X, PanelLeft, Trash2,
  MessageSquare,
} from 'lucide-react';
import { Navbar } from '../../../components/Navbar';
import { Footer } from '../../../components/Footer';
import { useRepo } from '../../../lib/repoContext';
import {
  getChatHistory, saveChatMessage, clearChatHistory, getAnalysisHistory, AnalysisSummary,
} from '../../../lib/api';

const BASE_URL = (import.meta as any).env?.VITE_API_URL || 'https://repoatlas.onrender.com';

/* ── Types ── */
interface Message {
  id: string;
  role: 'user' | 'assistant';
  text: string;
  ts: string;
}

interface ChatSession {
  id: string;
  title: string;
  repo_url: string;
  created_at: string;
  updated_at: string;
  messages: Message[];
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

function nowStr() {
  const d = new Date();
  return `${String(d.getHours()).padStart(2, '0')}:${String(d.getMinutes()).padStart(2, '0')}`;
}

/* ── Markdown-lite renderer ── */
function RenderText({ text }: { text: string }) {
  return (
    <span>
      {text.split('\n').map((line, li, arr) => {
        const parts = line.split(/(\*\*[^*]+\*\*|`[^`]+`)/g);
        return (
          <React.Fragment key={li}>
            {parts.map((part, pi) => {
              if (part.startsWith('**') && part.endsWith('**'))
                return <strong key={pi} className="font-semibold text-[#111114]">{part.slice(2, -2)}</strong>;
              if (part.startsWith('`') && part.endsWith('`'))
                return <code key={pi} className="px-1.5 py-0.5 rounded bg-[#2563EB]/10 text-[#2563EB] font-mono text-[0.78em]">{part.slice(1, -1)}</code>;
              return <React.Fragment key={pi}>{part}</React.Fragment>;
            })}
            {li < arr.length - 1 && <br />}
          </React.Fragment>
        );
      })}
    </span>
  );
}

/* ── Message bubble ── */
function MessageBubble({ msg, index }: { msg: Message; index: number }) {
  const isUser = msg.role === 'user';
  return (
    <motion.div
      initial={{ opacity: 0, y: 12 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.3, delay: Math.min(index * 0.05, 0.3), ease: [0.16, 1, 0.3, 1] }}
      className={`flex gap-3.5 ${isUser ? 'flex-row-reverse' : 'flex-row'}`}
    >
      {isUser ? (
        <div className="shrink-0 w-9 h-9 rounded-full bg-[#E5E5E7] flex items-center justify-center shadow-sm">
          <User className="w-5 h-5 text-[#6B7280]" />
        </div>
      ) : (
        <div className="shrink-0 w-9 h-9 rounded-xl bg-[#2563EB] flex items-center justify-center shadow-sm">
          <Compass className="w-5 h-5 text-white" />
        </div>
      )}
      <div className={`flex flex-col gap-1 max-w-[88%] ${isUser ? 'items-end' : 'items-start'}`}>
        <div className={`px-5 py-3.5 rounded-2xl text-[15px] leading-relaxed ${
          isUser
            ? 'bg-[#2563EB] text-white rounded-tr-sm shadow-sm font-normal'
            : 'bg-[#F4F6FA] text-[#1F2937] border border-[#E5E5E7] rounded-tl-sm font-normal'
        }`}>
          <RenderText text={msg.text} />
        </div>
        <span className="text-[11px] font-mono text-[#9CA3AF] px-1">{msg.ts}</span>
      </div>
    </motion.div>
  );
}

/* ── Typing indicator ── */
function TypingIndicator() {
  return (
    <motion.div initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0 }}
      className="flex gap-3">
      <div className="shrink-0 w-8 h-8 rounded-xl bg-[#2563EB] flex items-center justify-center shadow-sm">
        <Compass className="w-4 h-4 text-white" />
      </div>
      <div className="px-4 py-3.5 rounded-2xl rounded-tl-sm bg-[#F4F6FA] border border-[#E5E5E7] flex items-center gap-1.5">
        {[0, 1, 2].map((i) => (
          <motion.span key={i} className="w-1.5 h-1.5 rounded-full bg-[#9CA3AF]"
            animate={{ y: [0, -4, 0], opacity: [0.5, 1, 0.5] }}
            transition={{ duration: 0.9, repeat: Infinity, delay: i * 0.18, ease: 'easeInOut' }} />
        ))}
      </div>
    </motion.div>
  );
}

/* ── ChatGPT-Style Previous Chats Sidebar ── */
function ChatSidebar({
  sessions,
  activeSessionId,
  onSelectSession,
  onNewChat,
  onDeleteSession,
  open,
  onClose,
}: {
  sessions: ChatSession[];
  activeSessionId: string | null;
  onSelectSession: (session: ChatSession) => void;
  onNewChat: () => void;
  onDeleteSession: (sessionId: string, e: React.MouseEvent) => void;
  open: boolean;
  onClose: () => void;
}) {
  return (
    <AnimatePresence>
      {open && (
        <motion.aside
          initial={{ width: 0, opacity: 0 }}
          animate={{ width: 280, opacity: 1 }}
          exit={{ width: 0, opacity: 0 }}
          transition={{ duration: 0.22, ease: 'easeInOut' }}
          className="shrink-0 border-r border-[#E5E5E7] bg-[#FAFAFA] flex flex-col overflow-hidden"
          style={{ minWidth: 0 }}
        >
          {/* Sidebar header */}
          <div className="flex items-center justify-between px-4 py-3.5 border-b border-[#E5E5E7] bg-white shrink-0">
            <div className="flex items-center gap-2">
              <Clock className="w-4 h-4 text-[#2563EB]" />
              <span className="text-sm font-semibold text-[#111114]">Previous Chats</span>
              {sessions.length > 0 && (
                <span className="px-1.5 py-0.5 rounded-full bg-[#EFF6FF] text-[#2563EB] text-[10px] font-mono font-bold">
                  {sessions.length}
                </span>
              )}
            </div>
            <button onClick={onClose} className="w-6 h-6 rounded-md hover:bg-[#F3F4F6] flex items-center justify-center text-[#9CA3AF] hover:text-[#374151] transition-colors">
              <X className="w-3.5 h-3.5" />
            </button>
          </div>

          {/* New chat button */}
          <div className="px-3 py-2.5 border-b border-[#E5E5E7] shrink-0 bg-white/50">
            <button onClick={onNewChat}
              className="w-full flex items-center justify-center gap-2 px-3.5 py-2.5 rounded-xl bg-[#2563EB] text-white text-xs font-semibold hover:bg-[#1D4ED8] shadow-sm transition-all hover:shadow">
              <Plus className="w-4 h-4" />
              New Chat
            </button>
          </div>

          {/* List of chat sessions */}
          <div className="flex-1 overflow-y-auto py-2 px-2 min-h-0 space-y-1">
            {sessions.length === 0 ? (
              <div className="px-4 py-10 text-center text-[#9CA3AF] text-xs">
                <Compass className="w-8 h-8 mx-auto mb-2 opacity-30 text-[#2563EB]" />
                <p className="font-medium text-[#6B7280]">No previous chats yet</p>
                <p className="text-[11px] text-[#9CA3AF] mt-1">Start a new conversation or ask a question!</p>
              </div>
            ) : (
              sessions.map((sess) => {
                const isActive = sess.id === activeSessionId;
                return (
                  <div
                    key={sess.id}
                    onClick={() => onSelectSession(sess)}
                    className={`group relative w-full text-left px-3 py-2.5 rounded-xl flex items-start gap-2.5 transition-all cursor-pointer ${
                      isActive
                        ? 'bg-white border border-[#BFDBFE] shadow-sm text-[#2563EB]'
                        : 'hover:bg-[#F3F4F6] text-[#374151]'
                    }`}
                  >
                    <div className={`shrink-0 mt-0.5 w-6 h-6 rounded-lg flex items-center justify-center ${isActive ? 'bg-[#2563EB] text-white' : 'bg-[#E5E5E7] text-[#6B7280] group-hover:bg-[#D1D5DB]'}`}>
                      <MessageSquare className="w-3.5 h-3.5" />
                    </div>
                    <div className="flex-1 min-w-0 pr-5">
                      <p className={`text-xs font-semibold truncate ${isActive ? 'text-[#2563EB]' : 'text-[#111114]'}`}>
                        {sess.title}
                      </p>
                      <div className="flex items-center justify-between gap-1 mt-1">
                        {sess.repo_url ? (
                          <span className="text-[10px] text-[#6B7280] font-mono truncate max-w-[120px]">
                            {repoLabel(sess.repo_url)}
                          </span>
                        ) : <span />}
                        <span className="text-[9px] text-[#9CA3AF] font-mono shrink-0">
                          {timeAgo(sess.updated_at)}
                        </span>
                      </div>
                    </div>
                    {/* Delete button on hover */}
                    <button
                      onClick={(e) => onDeleteSession(sess.id, e)}
                      className="absolute right-2 top-2.5 p-1 rounded-md text-[#9CA3AF] hover:text-[#EF4444] hover:bg-[#FEF2F2] opacity-0 group-hover:opacity-100 transition-opacity"
                      title="Delete chat thread"
                    >
                      <Trash2 className="w-3.5 h-3.5" />
                    </button>
                  </div>
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
export default function ExplorerAgentPage() {
  const { repoPath, setRepoPath, analysisResult, setAnalysisResult } = useRepo();
  const [sessions, setSessions] = useState<ChatSession[]>([]);
  const [activeSessionId, setActiveSessionId] = useState<string | null>(null);
  const [messages, setMessages] = useState<Message[]>([]);
  const [inputValue, setInputValue] = useState('');
  const [isTyping, setIsTyping] = useState(false);
  const [repoUrl, setRepoUrl] = useState('');
  const [sidebarOpen, setSidebarOpen] = useState(true);
  const scrollRef = useRef<HTMLDivElement>(null);
  const textareaRef = useRef<HTMLTextAreaElement>(null);

  /* ── Save sessions helper ── */
  const saveSessionsToStorage = (updatedSessions: ChatSession[]) => {
    setSessions(updatedSessions);
    try {
      localStorage.setItem('repoatlas_explorer_sessions', JSON.stringify(updatedSessions));
    } catch { /* ignore */ }
  };

  /* ── Boot: load current repo + local chat sessions + backend history ── */
  useEffect(() => {
    const init = async () => {
      // ── 1. Resolve current repo URL ─────────────────────────────────────
      // Context is always the source of truth — it reflects the latest analysis.
      // Only fall back to storage / backend session when context is empty.
      let currentUrl = repoPath || '';

      if (!currentUrl) {
        try {
          const res = await fetch(`${BASE_URL}/manager/session`);
          const data = await res.json();
          if (data.repo_url) { currentUrl = data.repo_url; setRepoPath(currentUrl); }
        } catch {
          currentUrl = localStorage.getItem('repoatlas_url') || sessionStorage.getItem('repoatlas_url') || '';
          if (currentUrl) setRepoPath(currentUrl);
        }
      }
      setRepoUrl(currentUrl);

      // ── 2. Load analysis result from storage or history ─────────
      if (!analysisResult && currentUrl) {
        try {
          const raw = localStorage.getItem('repoatlas_result') || sessionStorage.getItem('repoatlas_result');
          if (raw) {
            setAnalysisResult(JSON.parse(raw));
          } else {
            const historyRaw = localStorage.getItem('repoatlas_history');
            if (historyRaw) {
              const history = JSON.parse(historyRaw);
              if (Array.isArray(history)) {
                const found = history.find((h: any) => {
                  const target = (h.repo_path || h.repo_url || '').toLowerCase();
                  const current = currentUrl.toLowerCase();
                  return target.includes(current) || current.includes(target);
                });
                if (found) setAnalysisResult(found);
              }
            }
          }
        } catch { /* ignore */ }
      }

      if (!currentUrl) {
        setMessages([{
          id: 'welcome',
          role: 'assistant',
          text: 'No repo analyzed yet. Go to **Product** page and analyze a repository first, then come back here.',
          ts: nowStr(),
        }]);
        return;
      }

      // ── 3. Load saved local sessions ─────────────────────────────────────
      let localSessions: ChatSession[] = [];
      try {
        const raw = localStorage.getItem('repoatlas_explorer_sessions');
        if (raw) localSessions = JSON.parse(raw);
      } catch { /* ignore */ }

      // ── 4. Find if we already have a session for the CURRENT repo ────────
      const existingForCurrent = localSessions.find(
        (s) => s.repo_url === currentUrl
      );

      if (existingForCurrent) {
        // Current repo already has a session — load it and put it first
        setSessions(localSessions);
        setActiveSessionId(existingForCurrent.id);
        setMessages(existingForCurrent.messages);
      } else {
        // New repo — fetch persisted backend messages, create a fresh session
        const persisted = await getChatHistory(currentUrl, 100, 'explorer');
        let initialMsgs: Message[] = [];

        if (persisted.length > 0) {
          initialMsgs = persisted.map((m) => ({
            id: m.id,
            role: m.role as 'user' | 'assistant',
            text: m.content,
            ts: new Date(m.created_at).toLocaleTimeString('en-GB', { hour: '2-digit', minute: '2-digit' }),
          }));
        } else {
          initialMsgs = [{
            id: 'welcome',
            role: 'assistant',
            text: `Repo: \`${currentUrl}\`\n\nAsk me anything about its structure, entry points, or architecture.`,
            ts: nowStr(),
          }];
        }

        const newSession: ChatSession = {
          id: `exp-session-${Date.now()}`,
          title: repoLabel(currentUrl) || 'Explorer Chat',
          repo_url: currentUrl,
          created_at: new Date().toISOString(),
          updated_at: new Date().toISOString(),
          messages: initialMsgs,
        };

        // Prepend new session, keep old ones for history
        const updated = [newSession, ...localSessions];
        saveSessionsToStorage(updated);
        setActiveSessionId(newSession.id);
        setMessages(newSession.messages);
      }
    };

    init();
  // Re-run whenever repoPath changes so switching repos always loads the right chat
  }, [repoPath]); // eslint-disable-line react-hooks/exhaustive-deps

  useEffect(() => {
    if (scrollRef.current) {
      scrollRef.current.scrollTo({ top: scrollRef.current.scrollHeight, behavior: 'smooth' });
    }
  }, [messages, isTyping]);

  /* ── Switch session ── */
  const handleSelectSession = (session: ChatSession) => {
    setActiveSessionId(session.id);
    setMessages(session.messages);
    if (session.repo_url) {
      setRepoUrl(session.repo_url);
      setRepoPath(session.repo_url);
    }
  };

  /* ── Create New Chat ── */
  const handleNewChat = () => {
    const activeUrl = repoUrl || repoPath || '';
    const newSession: ChatSession = {
      id: `exp-session-${Date.now()}`,
      title: 'New Explorer Chat',
      repo_url: activeUrl,
      created_at: new Date().toISOString(),
      updated_at: new Date().toISOString(),
      messages: [{
        id: `msg-${Date.now()}-a`,
        role: 'assistant',
        text: activeUrl
          ? `Repo: \`${activeUrl}\`\n\nAsk me anything about its structure, entry points, or architecture.`
          : 'No repo loaded. Analyze a repository first.',
        ts: nowStr(),
      }],
    };
    const updated = [newSession, ...sessions];
    saveSessionsToStorage(updated);
    setActiveSessionId(newSession.id);
    setMessages(newSession.messages);
    if (textareaRef.current) textareaRef.current.focus();
  };

  /* ── Delete a session ── */
  const handleDeleteSession = (sessionId: string, e: React.MouseEvent) => {
    e.stopPropagation();
    const updated = sessions.filter((s) => s.id !== sessionId);
    saveSessionsToStorage(updated);

    if (activeSessionId === sessionId) {
      if (updated.length > 0) {
        handleSelectSession(updated[0]);
      } else {
        handleNewChat();
      }
    }
  };

  /* ── Clear current active session messages ── */
  const handleClearHistory = async () => {
    if (!repoUrl) return;
    await clearChatHistory(repoUrl, 'explorer');
    if (activeSessionId) {
      handleDeleteSession(activeSessionId, { stopPropagation: () => {} } as any);
    } else {
      handleNewChat();
    }
  };

  /* ── Send message ── */
  const handleSend = async () => {
    const trimmed = inputValue.trim();
    if (!trimmed || isTyping) return;

    const userMsg: Message = { id: `msg-${Date.now()}-u`, role: 'user', text: trimmed, ts: nowStr() };
    const nextMessages = [...messages, userMsg];
    setMessages(nextMessages);
    setInputValue('');
    if (textareaRef.current) textareaRef.current.style.height = 'auto';
    setIsTyping(true);

    const activeRepoUrl = repoUrl || repoPath || '';

    // Find or create active session
    let currentSessionId = activeSessionId;
    let currentSessions = [...sessions];
    let sessionIndex = currentSessions.findIndex((s) => s.id === currentSessionId);

    if (sessionIndex === -1) {
      const newSess: ChatSession = {
        id: `exp-session-${Date.now()}`,
        title: trimmed.length > 32 ? trimmed.slice(0, 32) + '…' : trimmed,
        repo_url: activeRepoUrl,
        created_at: new Date().toISOString(),
        updated_at: new Date().toISOString(),
        messages: nextMessages,
      };
      currentSessions = [newSess, ...currentSessions];
      currentSessionId = newSess.id;
      sessionIndex = 0;
      setActiveSessionId(currentSessionId);
    } else {
      // Update session title if it's new
      const s = currentSessions[sessionIndex];
      const title = (s.title === 'New Explorer Chat' || s.title === 'Explorer Chat')
        ? (trimmed.length > 32 ? trimmed.slice(0, 32) + '…' : trimmed)
        : s.title;

      currentSessions[sessionIndex] = {
        ...s,
        title,
        updated_at: new Date().toISOString(),
        messages: nextMessages,
      };
    }

    saveSessionsToStorage(currentSessions);
    if (activeRepoUrl) saveChatMessage(activeRepoUrl, 'user', trimmed, 'explorer');

    // Build chat history array to send to backend for conversational memory
    const chatHistoryForBackend = nextMessages
      .filter((m) => !m.id.startsWith('welcome') && m.role)
      .map((m) => ({ role: m.role, content: m.text }));

    try {
      const res = await fetch(`${BASE_URL}/explorer/`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          query: trimmed,
          repo_path: activeRepoUrl || null,
          chat_history: chatHistoryForBackend,
        }),
      });
      const data = await res.json();
      const text = res.ok ? (data.result ?? JSON.stringify(data)) : `Error ${res.status}: ${data.detail ?? 'Unknown error'}`;
      const assistantMsg: Message = { id: `msg-${Date.now()}-a`, role: 'assistant', text, ts: nowStr() };
      
      const finalMessages = [...nextMessages, assistantMsg];
      setMessages(finalMessages);

      // Update session with assistant response
      const updatedSessions = [...currentSessions];
      const idx = updatedSessions.findIndex((s) => s.id === currentSessionId);
      if (idx !== -1) {
        updatedSessions[idx] = {
          ...updatedSessions[idx],
          updated_at: new Date().toISOString(),
          messages: finalMessages,
        };
        saveSessionsToStorage(updatedSessions);
      }

      if (activeRepoUrl) saveChatMessage(activeRepoUrl, 'assistant', text, 'explorer');
    } catch {
      const errorMsg: Message = {
        id: `msg-${Date.now()}-a`,
        role: 'assistant',
        text: `Could not reach backend. Make sure it's running on ${BASE_URL}.`,
        ts: nowStr(),
      };
      setMessages((prev) => [...prev, errorMsg]);
    } finally {
      setIsTyping(false);
    }
  };

  const handleKeyDown = (e: React.KeyboardEvent<HTMLTextAreaElement>) => {
    if (e.key === 'Enter' && !e.shiftKey) { e.preventDefault(); handleSend(); }
  };

  return (
    <main className="h-screen bg-[#FAFAFA] text-[#111114] selection:bg-[#2563EB]/20 overflow-hidden flex flex-col">
      <Navbar />

      <div className="flex-1 flex pt-16 w-full overflow-hidden">

        {/* ── ChatGPT-Style Sidebar ── */}
        <ChatSidebar
          sessions={sessions}
          activeSessionId={activeSessionId}
          onSelectSession={handleSelectSession}
          onNewChat={handleNewChat}
          onDeleteSession={handleDeleteSession}
          open={sidebarOpen}
          onClose={() => setSidebarOpen(false)}
        />

        {/* ── Main chat panel ── */}
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          className="flex-1 flex flex-col min-w-0 overflow-hidden bg-white"
        >
          {/* Card header */}
          <div className="flex items-center justify-between px-6 py-4 border-b border-[#E5E5E7] bg-white shrink-0 shadow-xs">
            <div className="flex items-center gap-3.5">
              {/* Sidebar toggle */}
              <button
                onClick={() => setSidebarOpen((o) => !o)}
                className="p-2 rounded-lg hover:bg-[#F3F4F6] text-[#6B7280] hover:text-[#111114] transition-colors"
                title={sidebarOpen ? 'Hide history' : 'Show history'}
              >
                <PanelLeft className="w-5 h-5" />
              </button>
              <div className="p-2.5 rounded-xl bg-[#2563EB] text-white shadow-sm">
                <Compass className="w-5 h-5" />
              </div>
              <div>
                <h1 className="text-xl font-bold text-[#111114] leading-none">Explorer Agent</h1>
              </div>
              {repoUrl && (
                <span className="hidden sm:flex items-center gap-1.5 px-3 py-1 rounded-full bg-[#EFF6FF] border border-[#BFDBFE] text-[#2563EB] text-xs font-mono font-medium">
                  <GitBranch className="w-3.5 h-3.5" />
                  {repoLabel(repoUrl)}
                </span>
              )}
            </div>
            <div className="flex items-center gap-3">
              {repoUrl && (
                <button
                  onClick={handleClearHistory}
                  className="flex items-center gap-1.5 px-3.5 py-1.5 rounded-lg border border-[#E5E5E7] hover:bg-[#FEF2F2] hover:border-[#FCA5A5] text-[#EF4444] text-xs font-medium transition-colors"
                  title="Clear chat thread"
                >
                  <Trash2 className="w-3.5 h-3.5" />
                  Clear Thread
                </button>
              )}
              <div className="flex items-center gap-2 px-3 py-1.5 rounded-full border border-[#E5E5E7] bg-[#FAFAFA]">
                <span className="w-2 h-2 rounded-full bg-[#4ADE80] animate-pulse" />
                <span className="text-[11px] font-mono text-[#6B7280] font-medium">Active Stream</span>
              </div>
            </div>
          </div>

          {/* Messages Container (centered & wide like ChatGPT) */}
          <div ref={scrollRef} className="flex-1 overflow-y-auto px-4 md:px-8 py-6 scroll-smooth">
            <div className="max-w-4xl mx-auto space-y-6">
              {messages.map((msg, idx) => (
                <MessageBubble key={msg.id} msg={msg} index={idx} />
              ))}
              <AnimatePresence>{isTyping && <TypingIndicator />}</AnimatePresence>
            </div>
          </div>

          {/* Input Area (Expanded & Larger) */}
          <div className="shrink-0 px-4 md:px-8 py-4 border-t border-[#E5E5E7] bg-white">
            <div className="max-w-4xl mx-auto">
              <div className="flex items-end gap-3 p-3 rounded-2xl border border-[#E5E5E7] bg-[#FAFAFA] focus-within:border-[#2563EB] focus-within:bg-white focus-within:ring-2 focus-within:ring-[#2563EB]/10 transition-all shadow-md">
                <textarea
                  ref={textareaRef}
                  rows={1}
                  value={inputValue}
                  onChange={(e) => {
                    setInputValue(e.target.value);
                    e.target.style.height = 'auto';
                    e.target.style.height = Math.min(e.target.scrollHeight, 160) + 'px';
                  }}
                  onKeyDown={handleKeyDown}
                  placeholder="Ask the Explorer Agent about this repo…"
                  disabled={isTyping}
                  className="flex-1 resize-none bg-transparent text-[15px] text-[#111114] placeholder-[#9CA3AF] px-3 py-2 focus:outline-none leading-relaxed disabled:opacity-50"
                  style={{ minHeight: '44px', maxHeight: '160px' }}
                />
                <motion.button
                  onClick={handleSend}
                  disabled={!inputValue.trim() || isTyping}
                  whileHover={{ scale: 1.05 }} whileTap={{ scale: 0.95 }}
                  className="shrink-0 w-11 h-11 rounded-xl bg-[#2563EB] text-white flex items-center justify-center shadow-md disabled:opacity-40 disabled:cursor-not-allowed hover:bg-[#1D4ED8] transition-colors"
                >
                  {isTyping ? <Loader2 className="w-5 h-5 animate-spin" /> : <Send className="w-5 h-5" />}
                </motion.button>
              </div>
              <div className="flex items-center justify-between mt-2.5 px-2">
                <span className="text-[11px] font-mono text-[#9CA3AF] flex items-center gap-1.5">
                  <CornerDownLeft className="w-3 h-3" />
                  Enter to send · Shift+Enter for new line
                </span>
                <span className="text-[11px] font-mono text-[#9CA3AF]">
                  Latency <span className="text-[#2563EB] font-semibold">&lt; 14ms</span>
                </span>
              </div>
            </div>
          </div>
        </motion.div>
      </div>
    </main>
  );
}
