import React from 'react';
import { motion } from 'framer-motion';
import { sectionRevealVariants } from '../lib/animations';

export const Stats: React.FC = () => {
  const stats = [
    { value: '10,000+', label: 'Repositories Mapped', sub: 'Across open source & enterprise' },
    { value: '40%', label: 'Faster Onboarding', sub: 'For new engineering hires' },
    { value: '5', label: 'Specialized Agents', sub: 'Running in parallel swarm' },
    { value: '<60s', label: 'First Architecture Map', sub: 'Average processing time' },
  ];

  const containerVariants = {
    hidden: { opacity: 0 },
    visible: {
      opacity: 1,
      transition: {
        staggerChildren: 0.15,
        delayChildren: 0.1,
      },
    },
  };

  const popUpVariants = {
    hidden: { opacity: 0, scale: 0.5, y: 20 },
    visible: {
      opacity: 1,
      scale: 1,
      y: 0,
      transition: {
        type: 'spring',
        stiffness: 260,
        damping: 20,
      },
    },
  };

  return (
    <section className="py-20 bg-[#FAFAFA] border-y border-[#E5E5E7] relative">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <motion.div
          initial="hidden"
          whileInView="visible"
          viewport={{ once: true, amount: 0.3 }}
          variants={containerVariants}
          className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-8 divide-y sm:divide-y-0 sm:divide-x divide-[#E5E5E7]"
        >
          {stats.map((s, idx) => (
            <motion.div variants={popUpVariants} key={s.label} className={`text-center space-y-2 ${idx !== 0 ? 'pt-6 sm:pt-0' : ''}`}>
              <div className="text-4xl sm:text-5xl font-extrabold font-mono text-[#2563EB]">
                {s.value}
              </div>
              <h4 className="text-base font-bold text-[#111114] font-sans">{s.label}</h4>
              <p className="text-xs text-[#6B7280] font-mono">{s.sub}</p>
            </motion.div>
          ))}
        </motion.div>
      </div>
    </section>
  );
};
