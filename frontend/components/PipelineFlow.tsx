import React, { useState } from 'react';
import { motion } from 'framer-motion';
import { Sparkles, Bot, Compass, Search, Brain, Palette, CheckCircle2, ArrowDown, ArrowRight } from 'lucide-react';
import { sectionRevealVariants } from '../lib/animations';
import { MascotOrb } from './MascotOrb';

export const PipelineFlow: React.FC = () => {
  const [activeStep, setActiveStep] = useState(0);

  const pipelineAgentRoutes: Record<number, string> = {
    0: '/agents/user-query',
    1: '/agents/manager-agent',
    2: '/agents/explorer-agent',
    3: '/agents/trace-agent',
    4: '/agents/security-agent',
    5: '/agents/visualization-agent',
  };

  const pipelineSteps = [
    {
      id: 0,
      title: 'User Query',
      agent: 'Developer Prompt',
      icon: Sparkles,
      desc: 'You ask: "How does the authentication and JWT token renewal work?"',
      detail: 'RepoAtlas ingests the prompt and identifies target symbol references in the repo.',
      color: 'bg-[#2563EB]',
    },
    {
      id: 1,
      title: 'Manager Agent',
      agent: 'Swarm Router',
      icon: Bot,
      desc: 'Orchestrates the query and dispatches task payloads to sub-agents.',
      detail: 'Decides that Explorer, Trace, Security & Visualization agents are required.',
      color: 'bg-[#2563EB]',
    },
    {
      id: 2,
      title: 'Explorer Agent',
      agent: 'AST Scanner',
      icon: Compass,
      desc: 'Scans folder structures, AST symbols, entry points, and dependencies.',
      detail: 'Locates src/auth/jwt_verifier.go and src/controllers/user_controller.ts.',
      color: 'bg-[#2563EB]',
    },
    {
      id: 3,
      title: 'Trace Agent',
      agent: 'Call Chain Tracker',
      icon: Search,
      desc: 'Walks real execution stack frames: API → Controller → Service → DB.',
      detail: 'Traces authenticateSession() → verifyToken() → queryUserRecord().',
      color: 'bg-[#2563EB]',
    },
    {
      id: 4,
      title: 'Security Agent',
      agent: 'Vulnerability Scanner',
      icon: Brain,
      desc: 'Synthesizes plain-English architectural explanations and safety rules.',
      detail: 'Explains: "RSA-256 signatures prevent token tampering during cross-origin requests."',
      color: 'bg-[#2563EB]',
    },
    {
      id: 5,
      title: 'Visualization Agent',
      agent: 'Diagram Synthesizer',
      icon: Palette,
      desc: 'Renders clickable architecture node maps and SVG flow graphs.',
      detail: 'Generates interactive React Flow nodes with clickable code viewports.',
      color: 'bg-[#2563EB]',
    },
  ];

  return (
    <section id="how-it-works" className="py-24 md:py-32 bg-[#FAFAFA] relative border-t border-[#E5E5E7]">
      {/* Background radial glow removed */}

      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <motion.div
          initial="hidden"
          whileInView="visible"
          viewport={{ once: true, amount: 0.3 }}
          variants={sectionRevealVariants}
          className="text-center space-y-4 max-w-3xl mx-auto mb-20"
        >
          <div className="inline-flex items-center gap-2 px-3.5 py-1.5 rounded-full bg-white border border-[#E5E5E7] text-xs font-mono text-[#2563EB]">
            <span>Automated 6-Step Pipeline</span>
          </div>
          <h2 className="text-3xl sm:text-4xl md:text-5xl font-extrabold text-[#111114] tracking-tight">
            How RepoAtlas AI maps your code.
          </h2>
          <p className="text-[#6B7280] text-base sm:text-lg font-sans">
            From raw GitHub URL to a rich, interactive architecture diagram in seconds.
          </p>
        </motion.div>

        {/* Pipeline Stepper Visualization */}
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-8 items-start">
          {/* Stepper Navigation Column */}
          <div className="lg:col-span-5 space-y-3 relative">
            {/* Connecting Vertical Line */}
            <div className="absolute left-6 top-8 bottom-8 w-0.5 bg-[#E5E5E7] pointer-events-none" />
            <motion.div
              className="absolute left-6 top-8 w-0.5 bg-[#2563EB] pointer-events-none transition-all duration-500"
              style={{
                height: `${(activeStep / (pipelineSteps.length - 1)) * 85}%`,
              }}
            />

            {pipelineSteps.map((step, idx) => {
              const isActive = activeStep === idx;
              const isPast = activeStep > idx;

              return (
                <button
                  type="button"
                  key={step.id}
                  onClick={() => setActiveStep(idx)}
                  className={`w-full text-left relative z-10 flex items-center gap-4 p-3.5 rounded-xl cursor-pointer transition-all duration-300 ${
                    isActive
                      ? 'bg-white border border-[#2563EB]/50 shadow-sm'
                      : 'bg-white border border-transparent hover:border-[#E5E5E7] shadow-sm hover:shadow-md'
                  }`}
                >
                  {/* Glowing Circle Node */}
                  <div
                    className={`w-10 h-10 rounded-full flex items-center justify-center font-mono text-xs font-bold shrink-0 transition-all duration-300 ${
                      isActive
                        ? 'bg-[#2563EB] text-white shadow-sm'
                        : isPast
                        ? 'bg-green-50 text-green-600 border border-green-200'
                        : 'bg-white text-[#9CA3AF] border border-[#E5E5E7]'
                    }`}
                  >
                    {isPast ? <CheckCircle2 className="w-5 h-5" /> : idx + 1}
                  </div>

                  <div className="flex-1 min-w-0">
                    <h4 className={`text-sm font-bold truncate ${isActive ? 'text-[#111114]' : 'text-[#6B7280]'}`}>
                      {step.title}
                    </h4>
                    <span className="text-xs font-mono text-[#9CA3AF]">{step.agent}</span>
                  </div>

                  {isActive && <ArrowRight className="w-4 h-4 text-[#2563EB] shrink-0 animate-pulse" />}
                </button>
              );
            })}
          </div>

          {/* Active Step Details Showcase Card */}
          <div className="lg:col-span-7 sticky top-32">
            <motion.a
              href={pipelineAgentRoutes[activeStep]}
              key={activeStep}
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.4 }}
              className="block p-8 rounded-2xl bg-white border border-[#E5E5E7] hover:border-[#2563EB]/50 shadow-lg hover:shadow-xl transition-all duration-300 space-y-6 relative overflow-hidden cursor-pointer group"
            >
              <div className="absolute -top-10 -right-10 pointer-events-none opacity-20 hidden md:block">
                <MascotOrb size="sm" showChips={false} />
              </div>

              <div className="absolute top-0 right-0 p-8 opacity-5 pointer-events-none">
                {React.createElement(pipelineSteps[activeStep].icon, { className: 'w-48 h-48 text-[#2563EB]' })}
              </div>

              <div className="flex items-center gap-3">
                <div className={`p-3 rounded-xl ${pipelineSteps[activeStep].color} text-white shadow-lg`}>
                  {React.createElement(pipelineSteps[activeStep].icon, { className: 'w-6 h-6' })}
                </div>
                <div>
                  <span className="text-xs font-mono text-[#2563EB] uppercase tracking-wider block">
                    Pipeline Stage 0{activeStep + 1}
                  </span>
                  <h3 className="text-2xl font-bold text-[#111114] flex items-center gap-2">
                    {pipelineSteps[activeStep].title}
                    <ArrowRight className="w-4 h-4 text-[#2563EB] opacity-0 -translate-x-2 group-hover:opacity-100 group-hover:translate-x-0 transition-all duration-300" />
                  </h3>
                  <span className="text-xs font-mono text-[#9CA3AF] block font-semibold">{pipelineSteps[activeStep].agent}</span>
                </div>
              </div>

              <div className="space-y-3 font-sans">
                <p className="text-base text-[#374151] font-medium">{pipelineSteps[activeStep].desc}</p>
                <div className="p-4 rounded-xl bg-[#FAFAFA] border border-[#E5E5E7] text-xs font-mono text-[#6B7280]">
                  <span className="text-[#2563EB] font-bold block mb-1">Execution Trace output:</span>
                  {pipelineSteps[activeStep].detail}
                </div>
              </div>

              <div className="flex items-center justify-between pt-4 border-t border-[#E5E5E7] text-xs font-mono text-[#9CA3AF]">
                <span>Status: <span className="text-green-600">Active Stream</span></span>
                <span>Latency: <span className="text-[#2563EB]">&lt; 14ms</span></span>
              </div>
            </motion.a>
          </div>
        </div>
      </div>
    </section>
  );
};
