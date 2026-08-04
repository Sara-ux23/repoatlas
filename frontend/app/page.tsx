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

export default function Home() {
  const handleAnalyzeRepo = (url: string) => {
    console.log('Analyzing repo:', url);
  };

  return (
    <main className="min-h-screen bg-white text-[#111114] selection:bg-[#2563EB]/20 selection:text-[#2563EB] overflow-x-hidden">
      <Navbar />
      <Hero onAnalyze={handleAnalyzeRepo} />
      <PipelineFlow />

      <TechStack />
      <Stats />
      <FinalCTA />
      <SocialProof />
      <Footer />
    </main>
  );
}
