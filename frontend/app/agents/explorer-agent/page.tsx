'use client';

import React, { useState, useRef, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Compass, Send, Network, User, CornerDownLeft, Loader2 } from 'lucide-react';
import { Navbar } from '../../../components/Navbar';
import { Footer } from '../../../components/Footer';

const BASE_URL = 'http://localhost:8000';

/* ─────────────────────────────────────────────
   Types
───────────────────────────────────────────── */
interface Message {
  id: string;
  role: 'user' | 'assistant';
  text: string;
  ts: string;
}

/* ─────────────────────────────────────────────
   Markdown-lite renderer (bold + inline code)
───────────────────────────────────────────── */
function RenderText({ text }: { text: string }) {
  const lines = text.split('\n');
  return (
    <span>
      {lines.map((line, li) => {
        const parts = line.split(/(\*\*[^*]+\*\*|`[^`]+`)/g);
        return (
          <React.Fragment key={li}>
            {parts.map((part, pi) => {
              if (part.startsWith('**') && part.endsWith('**'))
                return (
                  <strong key={pi} className="font-semibold text-[#111114]">
                    {part.slice(2, -2)}
                  </strong>
                );
              if (part.startsWith('`') && part.endsWith('`'))
                return (
                  <code
                    key={pi}
                    className="px-1.5 py-0.5 rounded bg-[#2563EB]/10 text-[#2563EB] font-mono text-[0.78em]"
                  >
                    {part.slice(1, -1)}
                  </code>
                );
              return <React.Fragment key={pi}>{part}</React.Fragment>;
            })}
            {li < lines.length - 1 && <br />}
          </React.Fragment>
        );
      })}
    </span>
  );
}

/* ─────────────────────────────────────────────
   Message bubble
───────────────────────────────────────────── */
function MessageBubble({ msg, index }: { msg: Message; index: number }) {
  const isUser = msg.role === 'user';
  return (
    <motion.div
      initial={{ opacity: 0, y: 12 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.35, delay: index * 0.08, ease: [0.16, 1, 0.3, 1] }}
      className={`flex gap-3 ${isUser ? 'flex-row-reverse' : 'flex-row'}`}
    >
      {isUser ? (
        <div className="shrink-0 w-8 h-8 rounded-full bg-[#E5E5E7] flex items-center justify-center">
          <User className="w-4 h-4 text-[#6B7280]" />
        </div>
      ) : (
        <div className="shrink-0 w-8 h-8 rounded-xl bg-[#2563EB] flex items-center justify-center shadow-sm">
          <Compass className="w-4 h-4 text-white" />
        </div>
      )}
      <div className={`flex flex-col gap-1 max-w-[82%] ${isUser ? 'items-end' : 'items-start'}`}>
        <div
          className={`px-4 py-3 rounded-2xl text-sm leading-relaxed font-sans ${
            isUser
              ? 'bg-[#2563EB] text-white rounded-tr-sm shadow-sm'
              : 'bg-[#F4F6FA] text-[#374151] border border-[#E5E5E7] rounded-tl-sm'
          }`}
        >
          <RenderText text={msg.text} />
        </div>
        <span className="text-[10px] font-mono text-[#9CA3AF] px-1">{msg.ts}</span>
      </div>
    </motion.div>
  );
}

/* ─────────────────────────────────────────────
   Typing indicator
───────────────────────────────────────────── */
function TypingIndicator() {
  return (
    <motion.div
      initial={{ opacity: 0, y: 8 }}
      animate={{ opacity: 1, y: 0 }}
      exit={{ opacity: 0, y: 4 }}
      transition={{ duration: 0.25 }}
      className="flex gap-3"
    >
      <div className="shrink-0 w-8 h-8 rounded-xl bg-[#2563EB] flex items-center justify-center shadow-sm">
        <Compass className="w-4 h-4 text-white" />
      </div>
      <div className="px-4 py-3.5 rounded-2xl rounded-tl-sm bg-[#F4F6FA] border border-[#E5E5E7] flex items-center gap-1.5">
        {[0, 1, 2].map((i) => (
          <motion.span
            key={i}
            className="w-1.5 h-1.5 rounded-full bg-[#9CA3AF]"
            animate={{ y: [0, -4, 0], opacity: [0.5, 1, 0.5] }}
            transition={{ duration: 0.9, repeat: Infinity, delay: i * 0.18, ease: 'easeInOut' }}
          />
        ))}
      </div>
    </motion.div>
  );
}

/* ─────────────────────────────────────────────
   Main page
───────────────────────────────────────────── */
export default function ExplorerAgentPage() {
  const [messages, setMessages] = useState<Message[]>([]);
  const [inputValue, setInputValue] = useState('');
  const [isTyping, setIsTyping] = useState(false);
  const [repoUrl, setRepoUrl] = useState('');
  const scrollRef = useRef<HTMLDivElement>(null);
  const textareaRef = useRef<HTMLTextAreaElement>(null);

  useEffect(() => {
    // Load repo URL and any prior explorer result from session
    const url = sessionStorage.getItem('repoatlas_url') ?? '';
    setRepoUrl(url);

    try {
      const raw = sessionStorage.getItem('repoatlas_result');
      if (raw) {
        const result = JSON.parse(raw);
        const explorerText: string | null =
          typeof result.explorer === 'string' ? result.explorer : null;

        const now = () => {
          const d = new Date();
          return `${String(d.getHours()).padStart(2, '0')}:${String(d.getMinutes()).padStart(2, '0')}`;
        };

        if (explorerText) {
          setMessages([
            { id: 'seed-u', role: 'user', text: 'What folder structure and entry points does this repo have?', ts: now() },
            { id: 'seed-a', role: 'assistant', text: explorerText, ts: now() },
          ]);
          return;
        }
      }
    } catch { /* no session data */ }

    // No session data — show welcome prompt
    setMessages([
      {
        id: 'welcome',
        role: 'assistant',
        text: url
          ? `Repo loaded: \`${url}\`\n\nAsk me anything about its structure, entry points, dependencies, or architecture.`
          : 'No repo analyzed yet. Go back to the home page and paste a GitHub URL first.',
        ts: new Date().toLocaleTimeString('en-GB', { hour: '2-digit', minute: '2-digit' }),
      },
    ]);
  }, []);

  useEffect(() => {
    if (scrollRef.current) {
      scrollRef.current.scrollTo({ top: scrollRef.current.scrollHeight, behavior: 'smooth' });
    }
  }, [messages, isTyping]);

  const now = () => {
    const d = new Date();
    return `${String(d.getHours()).padStart(2, '0')}:${String(d.getMinutes()).padStart(2, '0')}`;
  };

  const handleSend = async () => {
    const trimmed = inputValue.trim();
    if (!trimmed || isTyping) return;

    const userMsg: Message = { id: `msg-${Date.now()}-u`, role: 'user', text: trimmed, ts: now() };
    setMessages((prev) => [...prev, userMsg]);
    setInputValue('');
    if (textareaRef.current) textareaRef.current.style.height = 'auto';
    setIsTyping(true);

    try {
      const res = await fetch(`${BASE_URL}/explorer/`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ repo_path: repoUrl || 'unknown', query: trimmed }),
      });
      const data = await res.json();
      const text = res.ok
        ? (data.result ?? JSON.stringify(data))
        : `Error ${res.status}: ${data.detail ?? 'Unknown error'}`;
      setMessages((prev) => [...prev, { id: `msg-${Date.now()}-a`, role: 'assistant', text, ts: now() }]);
    } catch (err) {
      setMessages((prev) => [
        ...prev,
        { id: `msg-${Date.now()}-a`, role: 'assistant', text: `Could not reach backend. Make sure it's running on ${BASE_URL}.`, ts: now() },
      ]);
    } finally {
      setIsTyping(false);
    }
  };

  const handleKeyDown = (e: React.KeyboardEvent<HTMLTextAreaElement>) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      handleSend();
    }
  };

  return (
    <main className="min-h-screen bg-[#FAFAFA] text-[#111114] selection:bg-[#2563EB]/20 selection:text-[#2563EB] overflow-x-hidden flex flex-col">
      <Navbar />

      <div className="flex-1 flex flex-col pt-32 pb-24 px-4 sm:px-6 lg:px-8 w-full">
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.4 }}
          className="rounded-sm bg-white border border-[#E5E5E7] shadow-lg relative overflow-hidden w-full flex flex-col flex-1"
          style={{ minHeight: 0 }}
        >
          {/* ── Card Header ─────────────────────────── */}
          <div className="flex items-center justify-between px-6 py-4 border-b border-[#E5E5E7] bg-white shrink-0">
            <div className="flex items-center gap-3">
              <div className="p-2.5 rounded-xl bg-[#2563EB] text-white shadow-sm">
                <Compass className="w-5 h-5" />
              </div>
              <div>
                <span className="text-[10px] font-mono text-[#2563EB] uppercase tracking-widest block leading-none mb-0.5">
                  Pipeline Stage 03
                </span>
                <h1 className="text-lg font-bold text-[#111114] leading-none">Explorer Agent</h1>
              </div>
            </div>
            <div className="flex items-center gap-2 px-3 py-1.5 rounded-full border border-[#E5E5E7] bg-[#FAFAFA]">
              <span className="w-1.5 h-1.5 rounded-full bg-[#4ADE80] animate-pulse" />
              <span className="text-[10px] font-mono text-[#6B7280] font-medium">Active Stream</span>
            </div>
          </div>

          {/* ── Message List ─────────────────────────── */}
          <div
            ref={scrollRef}
            className="flex-1 overflow-y-auto px-6 py-5 space-y-5 scroll-smooth"
            style={{ maxHeight: 'none' }}
          >
            {messages.map((msg, idx) => (
              <MessageBubble key={msg.id} msg={msg} index={idx} />
            ))}
            <AnimatePresence>
              {isTyping && <TypingIndicator />}
            </AnimatePresence>
          </div>

          {/* ── Input Bar ─────────────────────────── */}
          <div className="shrink-0 px-5 py-4 border-t border-[#E5E5E7] bg-white">
            <div className="flex items-end gap-3 p-2 rounded-xl border border-[#E5E5E7] bg-[#FAFAFA] focus-within:border-[#2563EB] focus-within:bg-white transition-all duration-200 shadow-sm">
              <textarea
                ref={textareaRef}
                rows={1}
                value={inputValue}
                onChange={(e) => {
                  setInputValue(e.target.value);
                  e.target.style.height = 'auto';
                  e.target.style.height = Math.min(e.target.scrollHeight, 104) + 'px';
                }}
                onKeyDown={handleKeyDown}
                placeholder="Ask the Explorer Agent about this repo..."
                disabled={isTyping}
                className="flex-1 resize-none bg-transparent text-sm text-[#111114] placeholder-[#9CA3AF] font-sans px-2 py-1.5 focus:outline-none leading-relaxed disabled:opacity-50"
                style={{ minHeight: '36px', maxHeight: '104px' }}
              />
              <motion.button
                onClick={handleSend}
                disabled={!inputValue.trim() || isTyping}
                whileHover={{ scale: 1.05 }}
                whileTap={{ scale: 0.95 }}
                className="shrink-0 w-9 h-9 rounded-lg bg-[#2563EB] text-white flex items-center justify-center shadow-sm disabled:opacity-40 disabled:cursor-not-allowed hover:bg-[#1D4ED8] transition-colors duration-200"
              >
                {isTyping ? <Loader2 className="w-4 h-4 animate-spin" /> : <Send className="w-4 h-4" />}
              </motion.button>
            </div>
            <div className="flex items-center justify-between mt-2 px-1">
              <span className="text-[10px] font-mono text-[#9CA3AF] flex items-center gap-1">
                <CornerDownLeft className="w-2.5 h-2.5" />
                Enter to send · Shift+Enter for new line
              </span>
              <span className="text-[10px] font-mono text-[#9CA3AF]">
                Latency <span className="text-[#2563EB]">&lt; 14ms</span>
              </span>
            </div>
          </div>
        </motion.div>
      </div>

      <Footer />
    </main>
  );
}
