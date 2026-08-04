import React from 'react';
import { motion } from 'framer-motion';

export const SocialProof: React.FC = () => {
  const logos = [
    { name: 'Vercel', badge: '▲ Vercel' },
    { name: 'Linear', badge: '◈ Linear' },
    { name: 'Supabase', badge: '⚡ Supabase' },
    { name: 'Stripe', badge: 'S Stripe' },
    { name: 'Anthropic', badge: '⯇ Anthropic' },
    { name: 'HashiCorp', badge: '⬢ HashiCorp' },
    { name: 'Datadog', badge: '🐶 Datadog' },
  ];

  // Duplicate for seamless infinite scroll (4 sets)
  const duplicatedLogos = [...logos, ...logos, ...logos, ...logos];

  return (
    <section className="py-12 border-y border-[#E5E5E7] bg-[#FAFAFA] relative overflow-hidden">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 text-center space-y-6">
        <p className="text-xs font-mono font-semibold uppercase tracking-widest text-[#9CA3AF]">
          Trusted by developers exploring codebases at leading engineering teams
        </p>

        <div className="flex w-full overflow-hidden opacity-60 hover:opacity-100 transition-opacity duration-300">
          <motion.div
            animate={{ x: ['0%', '-50%'] }}
            transition={{ repeat: Infinity, ease: 'linear', duration: 40 }}
            className="flex whitespace-nowrap items-center gap-8 md:gap-14 min-w-max pr-8 md:pr-14"
          >
            {duplicatedLogos.map((logo, idx) => (
              <div
                key={`${logo.name}-${idx}`}
                className="text-lg md:text-xl font-bold font-mono text-[#6B7280] hover:text-[#2563EB] transition-all duration-300 hover:scale-105 cursor-pointer flex items-center gap-2 filter grayscale hover:grayscale-0"
              >
                <span>{logo.badge}</span>
              </div>
            ))}
          </motion.div>
        </div>
      </div>
    </section>
  );
};
