import React from 'react';
import { Network, Github, Twitter, Disc as Discord, ArrowRight, CheckCircle2 } from 'lucide-react';

export const Footer: React.FC = () => {
  const footerLinks = {
    Product: [
      { name: 'Repository Explorer', href: '#product' },
      { name: 'Execution Chain Trace', href: '#how-it-works' },
      { name: 'Interactive Graph', href: '#product' },
      { name: 'VS Code Extension', href: '#' },
      { name: 'Changelog & Updates', href: '#' },
    ],
    Agents: [
      { name: '🧭 Explorer Agent', href: '/agents/explorer-agent' },
      { name: '🔍 Trace Agent', href: '/agents/trace-agent' },
      { name: '🧠 Security Agent', href: '/agents/security-agent' },
      { name: '🎨 Visualization Agent', href: '/agents/visualization-agent' },
      { name: '🤖 Manager Agent', href: '/agents/manager-agent' },
    ],
    Resources: [
      { name: 'Documentation', href: '#' },
      { name: 'API Reference', href: '#' },
      { name: 'GitHub Action Integration', href: '#' },
      { name: 'Security & Compliance', href: '#' },
      { name: 'Blog & Case Studies', href: '#' },
    ],
    Company: [
      { name: 'About Us', href: '#' },
      { name: 'Careers (Hiring!)', href: '#' },
      { name: 'Press Kit', href: '#' },
      { name: 'Privacy Policy', href: '#' },
      { name: 'Terms of Service', href: '#' },
    ],
  };

  return (
    <footer className="bg-[#FAFAFA] border-t border-[#E5E5E7] relative overflow-hidden text-sm text-[#6B7280]">
      {/* Top Border Glow Line Removed */}

      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-16">
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-6 gap-10 pb-12 border-b border-[#E5E5E7]">
          {/* Brand Info & Newsletter */}
          <div className="lg:col-span-2 space-y-4">
            <a href="#" className="flex items-center gap-3">
              <div className="w-8 h-8 rounded-xl bg-[#2563EB] p-[1px]">
                <div className="w-full h-full bg-[#2563EB] rounded-[11px] flex items-center justify-center">
                  <Network className="w-4 h-4 text-white" />
                </div>
              </div>
              <span className="text-lg font-bold text-[#111114] tracking-tight">RepoAtlas AI</span>
            </a>

            <p className="text-xs text-[#6B7280] leading-relaxed max-w-sm">
              See your codebase before you read it. An agentic system that traces repo architecture, dependencies, and execution flow instantly.
            </p>

            {/* Newsletter form */}
            <div className="space-y-2 pt-2">
              <span className="text-xs font-mono text-[#2563EB] font-semibold block">Subscribe to Product Updates</span>
              <form onSubmit={(e) => e.preventDefault()} className="flex items-center gap-2">
                <input
                  type="email"
                  placeholder="engineer@company.com"
                  className="px-3 py-2 rounded-lg bg-white border border-[#E5E5E7] text-[#111114] placeholder-[#9CA3AF] font-mono focus:outline-none focus:border-[#2563EB] w-full"
                />
                <button
                  type="submit"
                  className="p-2 rounded-lg bg-[#2563EB] text-white hover:bg-[#1D4ED8] shrink-0"
                >
                  <ArrowRight className="w-4 h-4" />
                </button>
              </form>
            </div>
          </div>

          {/* Link Columns */}
          {Object.entries(footerLinks).map(([title, links]) => (
            <div key={title} className="space-y-3">
              <h4 className="text-xs font-mono font-bold text-[#111114] uppercase tracking-wider">{title}</h4>
              <ul className="space-y-2 text-xs">
                {links.map((link) => (
                  <li key={link.name}>
                    <a href={link.href} className="hover:text-[#2563EB] transition-colors">
                      {link.name}
                    </a>
                  </li>
                ))}
              </ul>
            </div>
          ))}
        </div>

        {/* Bottom Status & Socials */}
        <div className="pt-8 flex flex-col sm:flex-row items-center justify-between gap-4 text-xs font-mono">
          <div className="flex items-center gap-3">
            <span className="flex items-center gap-1.5 text-green-700 font-medium bg-green-50 px-2.5 py-1 rounded-full border border-green-200">
              <span className="w-2 h-2 rounded-full bg-green-500 animate-pulse" />
              All Systems Operational
            </span>
            <span>© {new Date().getFullYear()} RepoAtlas AI Inc. All rights reserved.</span>
          </div>

          {/* Social Icons */}
          <div className="flex items-center gap-4 text-[#6B7280]">
            <a href="https://github.com" target="_blank" rel="noreferrer" className="hover:text-[#111114] transition-colors">
              <Github className="w-4 h-4" />
            </a>
            <a href="https://twitter.com" target="_blank" rel="noreferrer" className="hover:text-[#111114] transition-colors">
              <Twitter className="w-4 h-4" />
            </a>
            <a href="https://discord.com" target="_blank" rel="noreferrer" className="hover:text-[#111114] transition-colors">
              <Discord className="w-4 h-4" />
            </a>
          </div>
        </div>
      </div>
    </footer>
  );
};
