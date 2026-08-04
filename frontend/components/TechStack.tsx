import React from 'react';
import { motion } from 'framer-motion';

export const TechStack: React.FC = () => {
  const techs = [
    { name: 'Python', icon: '🐍', tag: 'FastAPI / Django' },
    { name: 'TypeScript / JS', icon: '⚡', tag: 'React / Next.js' },
    { name: 'Go', icon: '🐹', tag: 'gRPC / Gin' },
    { name: 'Rust', icon: '🦀', tag: 'Tokio / Axum' },
    { name: 'PostgreSQL', icon: '🐘', tag: 'SQL / ORM' },
    { name: 'Docker / K8s', icon: '🐳', tag: 'Containers' },
  ];

  // Duplicate for seamless infinite scroll (4 sets)
  const duplicatedTechs = [...techs, ...techs, ...techs, ...techs];

  return (
    <section className="py-16 bg-white border-t border-[#E5E5E7] relative overflow-hidden">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 text-center space-y-8">
        <p className="text-xs font-mono font-semibold uppercase tracking-widest text-[#9CA3AF]">
          Built for real production codebases across language ecosystems
        </p>

        <div className="flex w-full overflow-hidden">
          <motion.div
            animate={{ x: ['0%', '-50%'] }}
            transition={{ repeat: Infinity, ease: 'linear', duration: 40 }}
            className="flex items-center gap-4 min-w-max pr-4"
          >
            {duplicatedTechs.map((t, idx) => (
              <motion.div
                key={`${t.name}-${idx}`}
                whileHover={{ y: -6, scale: 1.03 }}
                transition={{ duration: 0.2 }}
                className="w-40 sm:w-48 shrink-0 p-4 rounded-xl bg-[#FAFAFA] border border-[#E5E5E7] hover:border-[#2563EB]/40 transition-colors flex flex-col items-center justify-center space-y-1 shadow-sm hover:shadow-md group cursor-pointer"
              >
                <span className="text-2xl group-hover:scale-110 transition-transform">{t.icon}</span>
                <h4 className="text-sm font-bold text-[#111114] font-mono">{t.name}</h4>
                <span className="text-[10px] text-[#6B7280] font-mono">{t.tag}</span>
              </motion.div>
            ))}
          </motion.div>
        </div>
      </div>
    </section>
  );
};
