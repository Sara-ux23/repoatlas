'use client';

import React from 'react';
import { motion } from 'framer-motion';
import { Sparkles } from 'lucide-react';
import { Navbar } from '../../../components/Navbar';
import { Footer } from '../../../components/Footer';

export default function UserQueryPage() {
  return (
    <main className="min-h-screen bg-[#FAFAFA] text-[#111114] selection:bg-[#2563EB]/20 selection:text-[#2563EB] overflow-x-hidden flex flex-col">
      <Navbar />
      
      <div className="flex-1 flex items-center justify-center pt-32 pb-24 px-4 sm:px-6 lg:px-8 max-w-3xl mx-auto w-full">
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.4 }}
          className="p-8 rounded-2xl bg-white border border-[#E5E5E7] shadow-lg space-y-6 relative overflow-hidden w-full"
        >
          <div className="absolute top-0 right-0 p-8 opacity-5 pointer-events-none">
            <Sparkles className="w-48 h-48 text-[#2563EB]" />
          </div>

          <div className="flex items-center gap-3">
            <div className="p-3 rounded-xl bg-[#2563EB] text-white shadow-lg">
              <Sparkles className="w-6 h-6" />
            </div>
            <div>
              <span className="text-xs font-mono text-[#2563EB] uppercase tracking-wider block">
                Pipeline Stage 01
              </span>
              <h3 className="text-2xl font-bold text-[#111114]">User Query</h3>
              <span className="text-xs font-mono text-[#9CA3AF] block font-semibold mt-0.5">Developer Prompt</span>
            </div>
          </div>

          <div className="space-y-3 font-sans">
            <p className="text-base text-[#374151] font-medium">You ask: "How does the authentication and JWT token renewal work?"</p>
            <div className="p-4 rounded-xl bg-[#FAFAFA] border border-[#E5E5E7] text-xs font-mono text-[#6B7280]">
              <span className="text-[#2563EB] font-bold block mb-1">Execution Trace output:</span>
              RepoAtlas ingests the prompt and identifies target symbol references in the repo.
            </div>
          </div>

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
