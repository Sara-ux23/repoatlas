'use client';

import React from 'react';
import { Navbar } from '../components/Navbar';
import { Hero } from '../components/Hero';
import { SocialProof } from '../components/SocialProof';
import { PipelineFlow } from '../components/PipelineFlow';
import { TechStack } from '../components/TechStack';
import { Stats } from '../components/Stats';
import { FinalCTA } from '../components/FinalCTA';
import { Footer } from '../components/Footer';
import { useAuth } from '../lib/authContext';
import type { ManagerResponse } from '../lib/api';

export default function Home() {
  const { user } = useAuth();

  // Hero now handles navigation itself after a successful analysis.
  // This callback is optional — kept for any future parent-level tracking.
  const handleAnalyzeRepo = (_url: string, _result: ManagerResponse) => {};

  return (
    <main className="min-h-screen bg-white text-[#111114] selection:bg-[#2563EB]/20 selection:text-[#2563EB] overflow-x-hidden">
      {user ? (
        <Navbar />
      ) : (
        <Navbar hideAgents hideAuthButtons isLandingPage />
      )}
      <Hero
        onAnalyze={handleAnalyzeRepo}
        onSignInClick={() => { window.location.href = '/auth?signin=1'; }}
        hideRepoInput={!user}
      />

      {/* Marketing sections — logged-out only. Components stay in codebase. */}
      {!user && (
        <>
          <PipelineFlow />
          <TechStack />
          <Stats />
          <FinalCTA />
          <SocialProof />
          <Footer />
        </>
      )}
    </main>
  );
}
