import React, { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Network, Sparkles, ArrowRight, Menu, X, Github, ChevronDown, Compass, Search, Brain, Palette, Bot } from 'lucide-react';

export const Navbar: React.FC = () => {
  const [scrolled, setScrolled] = useState(false);
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);
  const [agentsDropdownOpen, setAgentsDropdownOpen] = useState(false);

  useEffect(() => {
    const handleScroll = () => {
      if (window.scrollY > 40) {
        setScrolled(true);
      } else {
        setScrolled(false);
      }
    };
    window.addEventListener('scroll', handleScroll);
    return () => window.removeEventListener('scroll', handleScroll);
  }, []);

  const navLinks = [
    { name: 'Product', href: '/#product' },
    { name: 'How it Works', href: '/#how-it-works' },
    { name: 'Agents', href: '/#how-it-works', isDropdown: true },
    { name: 'Docs', href: '/docs' },
  ];

  const agentItems = [
    { name: 'Explorer Agent', subtitle: 'AST Scanner', href: '/agents/explorer-agent', icon: Compass },
    { name: 'Trace Agent', subtitle: 'Call Chain Tracker', href: '/agents/trace-agent', icon: Search },
    { name: 'Security Agent', subtitle: 'Code Explainer', href: '/agents/security-agent', icon: Brain },
    { name: 'Visualization Agent', subtitle: 'Diagram Synthesizer', href: '/agents/visualization-agent', icon: Palette },
    { name: 'Manager Agent', subtitle: 'Swarm Router', href: '/agents/manager-agent', icon: Bot },
  ];

  return (
    <header
      className={`fixed top-0 left-0 right-0 z-50 transition-all duration-300 ${
        scrolled
          ? 'bg-white/90 backdrop-blur-xl border-b border-[#E5E5E7] shadow-sm py-3.5'
          : 'bg-transparent py-5'
      }`}
    >
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 flex items-center justify-between">
        {/* Brand Logo */}
        <a href="/" className="flex items-center gap-3 group">
          <div className="relative w-9 h-9 rounded-xl bg-[#2563EB] p-[1px] shadow-sm group-hover:shadow-md transition-all duration-300">
            <div className="w-full h-full bg-[#2563EB] rounded-[11px] flex items-center justify-center">
              <Network className="w-5 h-5 text-white group-hover:scale-110 transition-transform duration-300" />
            </div>
          </div>
          <span className="text-xl font-bold tracking-tight text-[#111114] font-sans flex items-center gap-1.5">
            RepoAtlas <span className="text-[#2563EB] font-mono text-sm uppercase px-1.5 py-0.5 rounded bg-[#2563EB]/10 border border-[#2563EB]/20">AI</span>
          </span>
        </a>

        {/* Desktop Nav Links */}
        <nav className="hidden md:flex items-center gap-8">
          {navLinks.map((link) => {
            if (link.isDropdown) {
              return (
                <div
                  key={link.name}
                  className="relative"
                  onMouseEnter={() => setAgentsDropdownOpen(true)}
                  onMouseLeave={() => setAgentsDropdownOpen(false)}
                >
                  <a
                    href={link.href}
                    className="text-sm font-medium text-[#6B7280] hover:text-[#111114] transition-colors duration-200 flex items-center gap-1 py-1"
                  >
                    {link.name}
                    <ChevronDown className={`w-3.5 h-3.5 transition-transform duration-200 ${agentsDropdownOpen ? 'rotate-180 text-[#2563EB]' : ''}`} />
                  </a>

                  <AnimatePresence>
                    {agentsDropdownOpen && (
                      <motion.div
                        initial={{ opacity: 0, y: 8 }}
                        animate={{ opacity: 1, y: 0 }}
                        exit={{ opacity: 0, y: 8 }}
                        transition={{ duration: 0.15 }}
                        className="absolute left-0 top-full pt-2 w-64 z-50"
                      >
                        <div className="p-2 rounded-xl bg-white border border-[#E5E5E7] shadow-xl space-y-1">
                          {agentItems.map((agent) => {
                            const IconComponent = agent.icon;
                            return (
                              <a
                                key={agent.name}
                                href={agent.href}
                                className="flex items-start gap-3 p-2.5 rounded-lg hover:bg-[#FAFAFA] transition-colors group/item"
                              >
                                <div className="p-2 rounded-lg bg-[#2563EB]/10 text-[#2563EB] shrink-0 group-hover/item:bg-[#2563EB] group-hover/item:text-white transition-colors">
                                  <IconComponent className="w-4 h-4" />
                                </div>
                                <div>
                                  <div className="text-sm font-semibold text-[#111114] group-hover/item:text-[#2563EB] transition-colors">
                                    {agent.name}
                                  </div>
                                  <div className="text-xs font-mono text-[#9CA3AF]">
                                    {agent.subtitle}
                                  </div>
                                </div>
                              </a>
                            );
                          })}
                        </div>
                      </motion.div>
                    )}
                  </AnimatePresence>
                </div>
              );
            }

            return (
              <a
                key={link.name}
                href={link.href}
                className="text-sm font-medium text-[#6B7280] hover:text-[#111114] transition-colors duration-200"
              >
                {link.name}
              </a>
            );
          })}
        </nav>

        {/* Right CTA Actions */}
        <div className="hidden md:flex items-center gap-4">
          <a
            href="https://github.com"
            target="_blank"
            rel="noreferrer"
            className="text-sm font-medium text-[#6B7280] hover:text-[#111114] transition-colors px-3 py-2 flex items-center gap-1.5"
          >
            <Github className="w-4 h-4" />
            Sign In
          </a>
          <motion.a
            href="/#hero-analyzer"
            whileHover={{ scale: 1.03 }}
            whileTap={{ scale: 0.97 }}
            className="px-5 py-2.5 rounded-full text-sm font-semibold text-white bg-[#2563EB] hover:bg-[#1D4ED8] shadow-sm transition-all duration-300 flex items-center gap-2"
          >
            <Sparkles className="w-4 h-4 text-white" />
            Try it Free
            <ArrowRight className="w-3.5 h-3.5" />
          </motion.a>
        </div>

        {/* Mobile Menu Button */}
        <button
          onClick={() => setMobileMenuOpen(!mobileMenuOpen)}
          className="md:hidden text-[#6B7280] hover:text-[#111114] p-2"
        >
          {mobileMenuOpen ? <X className="w-6 h-6" /> : <Menu className="w-6 h-6" />}
        </button>
      </div>

      {/* Mobile Drawer */}
      {mobileMenuOpen && (
        <motion.div
          initial={{ opacity: 0, y: -10 }}
          animate={{ opacity: 1, y: 0 }}
          className="md:hidden bg-white border-b border-[#E5E5E7] px-6 py-6 space-y-4 shadow-sm"
        >
          {navLinks.map((link) => (
            <React.Fragment key={link.name}>
              <a
                href={link.href}
                onClick={() => setMobileMenuOpen(false)}
                className="block text-base font-medium text-[#6B7280] hover:text-[#111114]"
              >
                {link.name}
              </a>
              {link.isDropdown && (
                <div className="pl-4 space-y-2.5 border-l-2 border-[#E5E5E7] ml-2">
                  {agentItems.map((agent) => {
                    const IconComponent = agent.icon;
                    return (
                      <a
                        key={agent.name}
                        href={agent.href}
                        onClick={() => setMobileMenuOpen(false)}
                        className="flex items-center gap-2.5 text-sm font-medium text-[#374151] hover:text-[#2563EB]"
                      >
                        <IconComponent className="w-4 h-4 text-[#2563EB]" />
                        <span>{agent.name}</span>
                        <span className="text-xs font-mono text-[#9CA3AF]">({agent.subtitle})</span>
                      </a>
                    );
                  })}
                </div>
              )}
            </React.Fragment>
          ))}
          <div className="pt-4 border-t border-[#E5E5E7] flex flex-col gap-3">
            <a href="https://github.com" target="_blank" rel="noreferrer" className="text-center py-2 text-[#6B7280] font-medium hover:text-[#111114]">
              Sign In
            </a>
            <a
              href="/#hero-analyzer"
              onClick={() => setMobileMenuOpen(false)}
              className="text-center py-3 rounded-full font-semibold text-white bg-[#2563EB] hover:bg-[#1D4ED8]"
            >
              Try it Free
            </a>
          </div>
        </motion.div>
      )}
    </header>
  );
};
