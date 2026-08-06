'use client';

import React from 'react';
import { useRepo } from '../lib/repoContext';
import { Github, X, Database } from 'lucide-react';

export function RepoStatus() {
  const { repoPath, analysisResult, clearRepo, isRepoLoaded } = useRepo();

  if (!isRepoLoaded) {
    return null;
  }

  const getRepoName = (path: string | null) => {
    if (!path) return null;
    if (path.startsWith('http://') || path.startsWith('https://')) {
      const match = path.match(/github\.com\/([^/]+\/[^/]+)/);
      return match ? match[1] : path;
    }
    return path.split('/').pop() || path;
  };

  const repoName = getRepoName(repoPath);
  const hasAnalysis = analysisResult !== null;

  return (
    <div className="fixed top-20 right-4 z-40 max-w-sm">
      <div className="bg-white border border-[#E5E5E7] rounded-xl shadow-lg p-4 space-y-3">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <div className="p-1.5 rounded-lg bg-[#2563EB]/10">
              <Github className="w-4 h-4 text-[#2563EB]" />
            </div>
            <span className="text-xs font-mono text-[#2563EB] font-bold">ACTIVE REPO</span>
          </div>
          <button
            onClick={clearRepo}
            className="p-1 rounded-md hover:bg-red-50 text-red-500 hover:text-red-600 transition-colors"
            title="Clear current repo"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        <div className="space-y-2">
          <div className="flex items-center gap-2">
            <span className="w-2 h-2 bg-green-500 rounded-full animate-pulse" />
            <span className="text-sm font-semibold text-[#111114] truncate">
              {repoName || 'Unknown repo'}
            </span>
          </div>
          
          {hasAnalysis && (
            <div className="flex items-center gap-2">
              <Database className="w-3 h-3 text-[#6B7280]" />
              <span className="text-xs text-[#6B7280] font-mono">
                Analysis cached ({Object.keys(analysisResult).filter(k => analysisResult[k]).length} agents)
              </span>
            </div>
          )}
        </div>

        <p className="text-xs text-[#9CA3AF] font-mono">
          All agents will use this repo context until cleared
        </p>
      </div>
    </div>
  );
}