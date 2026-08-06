'use client';

import React, { useState } from 'react';
import { MessageCircle, Send, Loader2 } from 'lucide-react';
import { useRepo } from '../lib/repoContext';
import { askUserQuery, ChatMessage } from '../lib/api';

interface RepoChatProps {
  className?: string;
}

export function RepoChat({ className = '' }: RepoChatProps) {
  const { repoPath, isRepoLoaded } = useRepo();
  const [isOpen, setIsOpen] = useState(false);
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [input, setInput] = useState('');
  const [isLoading, setIsLoading] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!input.trim() || isLoading || !repoPath) return;

    const userMessage: ChatMessage = { role: 'user', content: input.trim() };
    const newMessages = [...messages, userMessage];
    setMessages(newMessages);
    setInput('');
    setIsLoading(true);

    try {
      const response = await askUserQuery(
        userMessage.content,
        messages.slice(-10), // Keep last 10 messages for context
        repoPath
      );

      const aiMessage: ChatMessage = { role: 'assistant', content: response.answer };
      setMessages([...newMessages, aiMessage]);
    } catch (error) {
      const errorMessage: ChatMessage = {
        role: 'assistant',
        content: `Error: ${error instanceof Error ? error.message : 'Failed to get response'}`
      };
      setMessages([...newMessages, errorMessage]);
    } finally {
      setIsLoading(false);
    }
  };

  if (!isRepoLoaded) {
    return null;
  }

  return (
    <div className={`fixed bottom-4 right-4 z-50 ${className}`}>
      {/* Chat Toggle Button */}
      <button
        onClick={() => setIsOpen(!isOpen)}
        className="w-12 h-12 bg-[#2563EB] text-white rounded-full shadow-lg hover:bg-[#1D4ED8] transition-all flex items-center justify-center relative"
      >
        <MessageCircle className="w-6 h-6" />
        {messages.length > 0 && (
          <span className="absolute -top-1 -right-1 w-4 h-4 bg-red-500 text-white text-xs rounded-full flex items-center justify-center">
            {messages.length > 9 ? '9+' : messages.length}
          </span>
        )}
      </button>

      {/* Chat Panel */}
      {isOpen && (
        <div className="absolute bottom-16 right-0 w-80 h-96 bg-white border border-[#E5E5E7] rounded-xl shadow-xl flex flex-col">
          {/* Header */}
          <div className="p-3 border-b border-[#E5E5E7] flex items-center justify-between">
            <div className="flex items-center gap-2">
              <MessageCircle className="w-4 h-4 text-[#2563EB]" />
              <span className="text-sm font-semibold">Ask about this repo</span>
            </div>
            <button
              onClick={() => setIsOpen(false)}
              className="w-6 h-6 rounded-full hover:bg-[#F3F4F6] flex items-center justify-center text-[#6B7280]"
            >
              ×
            </button>
          </div>

          {/* Messages */}
          <div className="flex-1 p-3 overflow-y-auto space-y-3">
            {messages.length === 0 ? (
              <div className="text-center text-[#9CA3AF] text-sm py-8">
                <MessageCircle className="w-8 h-8 mx-auto mb-2 opacity-50" />
                <p>Ask questions about this repository</p>
                <p className="text-xs mt-1">e.g., "What does this project do?"</p>
              </div>
            ) : (
              messages.map((message, i) => (
                <div
                  key={i}
                  className={`flex ${message.role === 'user' ? 'justify-end' : 'justify-start'}`}
                >
                  <div
                    className={`max-w-[85%] px-3 py-2 rounded-lg text-sm ${
                      message.role === 'user'
                        ? 'bg-[#2563EB] text-white'
                        : 'bg-[#F3F4F6] text-[#111114]'
                    }`}
                  >
                    {message.content}
                  </div>
                </div>
              ))
            )}
            {isLoading && (
              <div className="flex justify-start">
                <div className="bg-[#F3F4F6] text-[#111114] px-3 py-2 rounded-lg text-sm flex items-center gap-2">
                  <Loader2 className="w-4 h-4 animate-spin" />
                  Thinking...
                </div>
              </div>
            )}
          </div>

          {/* Input */}
          <form onSubmit={handleSubmit} className="p-3 border-t border-[#E5E5E7]">
            <div className="flex gap-2">
              <input
                type="text"
                value={input}
                onChange={(e) => setInput(e.target.value)}
                placeholder="Ask about this repo..."
                className="flex-1 px-3 py-2 border border-[#E5E5E7] rounded-lg text-sm focus:outline-none focus:border-[#2563EB]"
                disabled={isLoading}
              />
              <button
                type="submit"
                disabled={isLoading || !input.trim()}
                className="w-9 h-9 bg-[#2563EB] text-white rounded-lg hover:bg-[#1D4ED8] disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center"
              >
                <Send className="w-4 h-4" />
              </button>
            </div>
          </form>
        </div>
      )}
    </div>
  );
}