import React from 'react';
import { motion } from 'framer-motion';
import { Sparkles, ArrowRight } from 'lucide-react';
import { MascotOrb } from './MascotOrb';

interface FinalCTAProps {
  onSignInClick?: () => void;
}

export const FinalCTA: React.FC<FinalCTAProps> = ({ onSignInClick }) => {
  return (
    <section className="py-28 md:py-36 bg-[#FAFAFA] relative overflow-hidden border-t border-[#E5E5E7]">
      {/* Ambient background blob field removed */}

      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 relative z-10">
        <div className="p-10 md:p-16 rounded-3xl bg-white border border-[#E5E5E7] shadow-lg relative overflow-hidden flex flex-col lg:flex-row items-center justify-between gap-12">

          {/* Left Text */}
          <div className="space-y-6 text-center lg:text-left max-w-xl">
            <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-[#FAFAFA] border border-[#E5E5E7] text-xs font-mono text-[#2563EB]">
              <Sparkles className="w-3.5 h-3.5" />
              <span>Instant Code Intelligence</span>
            </div>

            <h2 className="text-4xl sm:text-5xl md:text-6xl font-extrabold text-[#111114] tracking-tight leading-tight">
              Stop reading.{' '}
              <span className="text-[#2563EB]">
                Start seeing.
              </span>
            </h2>

            <p className="text-lg text-[#6B7280]">
              Get your first codebase architecture map in under 60 seconds. No setup or API keys required for public repos.
            </p>

            <div className="pt-2 flex flex-col sm:flex-row items-center justify-center lg:justify-start gap-4">
              {onSignInClick ? (
                <button
                  onClick={onSignInClick}
                  className="w-full sm:w-auto px-8 py-4 rounded-full font-bold text-white bg-[#2563EB] hover:bg-[#1D4ED8] shadow-sm transition-all text-base flex items-center justify-center gap-2"
                >
                  <span>Analyze Your First Repo — Free</span>
                  <ArrowRight className="w-5 h-5" />
                </button>
              ) : (
                <a
                  href="#hero-analyzer"
                  className="w-full sm:w-auto px-8 py-4 rounded-full font-bold text-white bg-[#2563EB] hover:bg-[#1D4ED8] shadow-sm transition-all text-base flex items-center justify-center gap-2"
                >
                  <span>Analyze Your First Repo — Free</span>
                  <ArrowRight className="w-5 h-5" />
                </a>
              )}
            </div>
          </div>

          {/* Right Mini Mascot Display */}
          <div className="shrink-0">
            <MascotOrb size="md" showChips={false} />
          </div>
        </div>
      </div>
    </section>
  );
};
