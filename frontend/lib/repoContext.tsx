'use client';

import React, { createContext, useContext, useState, useEffect, ReactNode } from 'react';

interface RepoContextType {
  repoPath: string | null;
  setRepoPath: (path: string | null) => void;
  analysisResult: any | null;
  setAnalysisResult: (result: any) => void;
  clearRepo: () => void;
  isRepoLoaded: boolean;
}

const RepoContext = createContext<RepoContextType | undefined>(undefined);

const STORAGE_KEYS = {
  path: 'repoatlas_path',
  result: 'repoatlas_result',
  url: 'repoatlas_url',
};

export function RepoProvider({ children }: { children: ReactNode }) {
  const [repoPath, setRepoPathState] = useState<string | null>(null);
  const [analysisResult, setAnalysisResultState] = useState<any | null>(null);
  const [isLoaded, setIsLoaded] = useState(false);

  useEffect(() => {
    const savedPath = localStorage.getItem(STORAGE_KEYS.path) || sessionStorage.getItem(STORAGE_KEYS.path);
    const savedResult = localStorage.getItem(STORAGE_KEYS.result) || sessionStorage.getItem(STORAGE_KEYS.result);

    if (savedPath) {
      setRepoPathState(savedPath);
    }
    if (savedResult) {
      try {
        setAnalysisResultState(JSON.parse(savedResult));
      } catch {
        // Invalid JSON, ignore
      }
    }
    setIsLoaded(true);
  }, []);

  const persistRepoPath = (path: string | null) => {
    setRepoPathState(path);
    if (path) {
      localStorage.setItem(STORAGE_KEYS.path, path);
      sessionStorage.setItem(STORAGE_KEYS.path, path);

      if (path.startsWith('http://') || path.startsWith('https://')) {
        localStorage.setItem(STORAGE_KEYS.url, path);
        sessionStorage.setItem(STORAGE_KEYS.url, path);
      }
    } else {
      localStorage.removeItem(STORAGE_KEYS.path);
      sessionStorage.removeItem(STORAGE_KEYS.path);
      localStorage.removeItem(STORAGE_KEYS.url);
      sessionStorage.removeItem(STORAGE_KEYS.url);
    }
  };

  const persistAnalysisResult = (result: any) => {
    setAnalysisResultState(result);
    if (result) {
      const serialized = JSON.stringify(result);
      localStorage.setItem(STORAGE_KEYS.result, serialized);
      sessionStorage.setItem(STORAGE_KEYS.result, serialized);
    } else {
      localStorage.removeItem(STORAGE_KEYS.result);
      sessionStorage.removeItem(STORAGE_KEYS.result);
    }
  };

  const clearRepo = () => {
    setRepoPathState(null);
    setAnalysisResultState(null);
    localStorage.removeItem(STORAGE_KEYS.path);
    localStorage.removeItem(STORAGE_KEYS.result);
    localStorage.removeItem(STORAGE_KEYS.url);
    sessionStorage.removeItem(STORAGE_KEYS.path);
    sessionStorage.removeItem(STORAGE_KEYS.result);
    sessionStorage.removeItem(STORAGE_KEYS.url);
  };

  return (
    <RepoContext.Provider
      value={{
        repoPath,
        setRepoPath: persistRepoPath,
        analysisResult,
        setAnalysisResult: persistAnalysisResult,
        clearRepo,
        isRepoLoaded: isLoaded && (repoPath !== null || analysisResult !== null),
      }}
    >
      {children}
    </RepoContext.Provider>
  );
}

export function useRepo() {
  const context = useContext(RepoContext);
  if (context === undefined) {
    throw new Error('useRepo must be used within a RepoProvider');
  }
  return context;
}
