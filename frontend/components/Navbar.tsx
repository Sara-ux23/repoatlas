import React, { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Network, Sparkles, ArrowRight, Menu, X, Github, ChevronDown, Compass, Search, Brain, Palette, Bot, FolderGit2, XCircle, LogOut, User, Loader2 } from 'lucide-react';
import { useRepo } from '../lib/repoContext';
import { useAuth } from '../lib/authContext';
import { clearSession } from '../lib/api';
import { RepoAtlasLogo } from './RepoAtlasLogo';

/* ── Unauth agents dropdown (marketing / auth page only) ─────────────── */
function UnauthAgentsDropdown({ href, agentItems }: {
  href: string;
  agentItems: { name: string; subtitle: string; href: string; icon: React.ElementType }[];
}) {
  const [open, setOpen] = useState(false);
  return (
    <div className="relative" onMouseEnter={() => setOpen(true)} onMouseLeave={() => setOpen(false)}>
      <a href={href} className="text-sm font-medium text-[#6B7280] hover:text-[#111114] transition-colors duration-200 flex items-center gap-1 py-1">
        Agents
        <ChevronDown className={`w-3.5 h-3.5 transition-transform duration-200 ${open ? 'rotate-180 text-[#2563EB]' : ''}`} />
      </a>
      <AnimatePresence>
        {open && (
          <motion.div initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: 8 }} transition={{ duration: 0.15 }} className="absolute left-0 top-full pt-2 w-64 z-50">
            <div className="p-2 rounded-xl bg-white border border-[#E5E5E7] shadow-xl space-y-1">
              {agentItems.map((agent) => {
                const Icon = agent.icon;
                return (
                  <a key={agent.name} href={agent.href} className="flex items-start gap-3 p-2.5 rounded-lg hover:bg-[#FAFAFA] transition-colors group/item">
                    <div className="p-2 rounded-lg bg-[#2563EB]/10 text-[#2563EB] shrink-0 group-hover/item:bg-[#2563EB] group-hover/item:text-white transition-colors">
                      <Icon className="w-4 h-4" />
                    </div>
                    <div>
                      <div className="text-sm font-semibold text-[#111114] group-hover/item:text-[#2563EB] transition-colors">{agent.name}</div>
                      <div className="text-xs font-mono text-[#9CA3AF]">{agent.subtitle}</div>
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

/* ── Main Navbar ─────────────────────────────────────────────────────── */
// SPA navigate helper — updates URL and fires popstate so AppRouter re-renders
function navigate(href: string) {
  history.pushState(null, '', href);
  window.dispatchEvent(new PopStateEvent('popstate'));
}

export const Navbar: React.FC<{ onSignInClick?: () => void; hideAgents?: boolean; hideAuthButtons?: boolean; isLandingPage?: boolean }> = ({ onSignInClick, hideAgents, hideAuthButtons, isLandingPage = false }) => {
  const { repoPath, setRepoPath, clearRepo } = useRepo();
  const { user, loading: authLoading, signOut } = useAuth();
  const [scrolled, setScrolled] = useState(false);
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);
  const [userMenuOpen, setUserMenuOpen] = useState(false);
  const [changeModalOpen, setChangeModalOpen] = useState(false);
  const [modalInput, setModalInput] = useState('');
  const [isSwitching, setIsSwitching] = useState(false);

  const handleSwitchRepo = (newUrl: string) => {
    if (!newUrl.trim() || isSwitching) return;
    setIsSwitching(true);
    const url = newUrl.trim();
    localStorage.setItem('repoatlas_url', url);
    localStorage.setItem('repoatlas_path', url);
    sessionStorage.setItem('repoatlas_url', url);
    sessionStorage.setItem('repoatlas_path', url);
    setRepoPath(url);
    setChangeModalOpen(false);
    setModalInput('');
    window.location.reload();
  };

  const sampleRepos = [
    { label: 'shofiahmed69/Fake-Headline-Generator', url: 'https://github.com/shofiahmed69/Fake-Headline-Generator' },
    { label: 'gabrielecirulli/2048', url: 'https://github.com/gabrielecirulli/2048' },
    { label: 'Sara-ux23/Fower_classify', url: 'https://github.com/Sara-ux23/Fower_classify' },
    { label: 'facebook/react', url: 'https://github.com/facebook/react' },
  ];

  const handleClearRepo = async () => {
    try {
      await clearSession();
      clearRepo();
      window.location.href = '/';
    } catch {
      clearRepo();
      window.location.href = '/';
    }
  };

  const handleSignOut = async () => {
    setUserMenuOpen(false);
    await signOut();
    window.location.href = '/';
  };

  const getRepoDisplayName = (path: string | null) => {
    if (!path) return null;
    const parts = path.split('/');
    return parts[parts.length - 1] || path;
  };

  const getUserInitial = () => {
    if (!user) return '?';
    return (user.email?.charAt(0) ?? user.user_metadata?.name?.charAt(0) ?? '?').toUpperCase();
  };

  useEffect(() => {
    const handleScroll = () => setScrolled(window.scrollY > 40);
    window.addEventListener('scroll', handleScroll);
    return () => window.removeEventListener('scroll', handleScroll);
  }, []);

  const pathname = typeof window !== 'undefined' ? window.location.pathname : '';
  const isAuthOrLanding = isLandingPage || pathname === '/auth' || pathname === '/' || hideAgents;
  const showRepoChip = Boolean(repoPath && !isAuthOrLanding);

  // Authenticated: flat individual agent links
  const agentNavItems = [
    { name: 'Explorer', href: '/agents/explorer-agent', icon: Compass },
    { name: 'Trace',    href: '/agents/trace-agent',    icon: Search },
    { name: 'Security', href: '/agents/security-agent', icon: Brain },
    { name: 'Visualize',href: '/agents/visualization-agent', icon: Palette },
    { name: 'Manager',  href: '/agents/manager-agent',  icon: Bot },
  ];

  // Unauthenticated marketing page: dropdown as before
  const unauthLinks = [
    { name: 'Product', href: isLandingPage ? '#product' : '/#product' },
    ...(!hideAgents ? [{ name: 'Agents',  href: isLandingPage ? '#how-it-works' : '/#how-it-works', isDropdown: true }] : []),
    ...(hideAgents ? [{ name: 'How it Works', href: isLandingPage ? '#how-it-works' : '/#how-it-works' }] : []),
    ...(hideAgents ? [{ name: 'Technologies', href: isLandingPage ? '#tech-stack' : '/#tech-stack' }] : []),
    { name: 'Docs',    href: '/docs' },
  ];

  const unauthDropdownItems = [
    { name: 'Explorer Agent',      subtitle: 'AST Scanner',        href: '/agents/explorer-agent',      icon: Compass },
    { name: 'Trace Agent',         subtitle: 'Call Chain Tracker',  href: '/agents/trace-agent',         icon: Search },
    { name: 'Security Agent',      subtitle: 'Vulnerability Scanner', href: '/agents/security-agent',      icon: Brain },
    { name: 'Visualization Agent', subtitle: 'Diagram Synthesizer', href: '/agents/visualization-agent', icon: Palette },
    { name: 'Manager Agent',       subtitle: 'Swarm Router',        href: '/agents/manager-agent',       icon: Bot },
  ];

  return (
    <header className={`fixed top-0 left-0 right-0 z-50 transition-all duration-300 ${
      scrolled ? 'bg-white/95 backdrop-blur-xl border-b border-[#E5E5E7] shadow-sm py-3' : 'bg-white/80 backdrop-blur-md py-3.5 sm:py-5'
    }`}>
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 flex items-center justify-between">

        {/* Brand */}
        <a href="/" className="group shrink-0">
          <RepoAtlasLogo />
        </a>

        {/* Desktop Nav */}
        <nav className="hidden md:flex items-center gap-1 flex-1 justify-center">
          {/* Repo chip (only shown in workspace when a repo is analyzed) */}
          {showRepoChip && (
            <div className="flex items-center gap-2 px-3 py-1 rounded-full bg-[#2563EB]/10 border border-[#2563EB]/20 mr-2">
              <FolderGit2 className="w-3.5 h-3.5 text-[#2563EB]" />
              <span className="text-xs font-mono text-[#2563EB] max-w-[140px] truncate" title={repoPath}>
                {getRepoDisplayName(repoPath)}
              </span>
              <button
                onClick={handleClearRepo}
                className="ml-1 p-0.5 rounded-full hover:bg-[#2563EB]/20 text-[#2563EB] transition-colors cursor-pointer"
                title="Clear analyzed repository"
              >
                <XCircle className="w-3.5 h-3.5 text-[#2563EB]" />
              </button>
            </div>
          )}

          {user ? (
            /* ── Authenticated: flat agent pills + Reports ── */
            <>
              {agentNavItems.map((agent) => {
                const Icon = agent.icon;
                const isActive = pathname === agent.href;
                return (
                  <button key={agent.name} onClick={() => navigate(agent.href)}
                    className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-sm font-medium transition-all duration-200 ${
                      isActive ? 'bg-[#2563EB]/10 text-[#2563EB]' : 'text-[#6B7280] hover:text-[#111114] hover:bg-[#F4F6FA]'
                    }`}
                  >
                    <Icon className="w-3.5 h-3.5" />
                    {agent.name}
                  </button>
                );
              })}
              <button onClick={() => navigate('/reports')}
                className={`px-3 py-1.5 rounded-lg text-sm font-medium transition-all duration-200 ${
                  pathname === '/reports' ? 'bg-[#2563EB]/10 text-[#2563EB]' : 'text-[#6B7280] hover:text-[#111114] hover:bg-[#F4F6FA]'
                }`}
              >
                Reports
              </button>
            </>
          ) : (
            /* ── Unauthenticated: marketing links with agents dropdown ── */
            <div className="flex items-center gap-8">
              {unauthLinks.map((link) => {
                if (link.isDropdown) {
                  return <UnauthAgentsDropdown key="agents" href={link.href} agentItems={unauthDropdownItems} />;
                }
                const isActive = pathname === link.href;
                return (
                  <a key={link.name} href={link.href}
                    className={`text-sm font-medium transition-colors duration-200 ${isActive ? 'text-[#2563EB] font-semibold' : 'text-[#6B7280] hover:text-[#111114]'}`}>
                    {link.name}
                  </a>
                );
              })}
            </div>
          )}
        </nav>

        {/* Right — Auth controls */}
        <div className="hidden md:flex items-center gap-4 shrink-0">
          {authLoading ? (
            <div className="w-8 h-8 rounded-full bg-[#E5E5E7] animate-pulse" />
          ) : user ? (
            <div className="relative" onMouseEnter={() => setUserMenuOpen(true)} onMouseLeave={() => setUserMenuOpen(false)}>
              <button className="flex items-center gap-2 px-3 py-1.5 rounded-full border border-[#E5E5E7] bg-white hover:border-[#2563EB]/40 transition-colors">
                <div className="w-6 h-6 rounded-full bg-[#2563EB] text-white text-xs font-bold flex items-center justify-center">
                  {getUserInitial()}
                </div>
                <span className="text-sm font-medium text-[#374151] max-w-[120px] truncate">
                  {user.user_metadata?.name ?? user.email?.split('@')[0]}
                </span>
                <ChevronDown className={`w-3.5 h-3.5 text-[#9CA3AF] transition-transform ${userMenuOpen ? 'rotate-180' : ''}`} />
              </button>
              <AnimatePresence>
                {userMenuOpen && (
                  <motion.div initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: 8 }} transition={{ duration: 0.15 }} className="absolute right-0 top-full pt-2 w-56 z-50">
                    <div className="p-2 rounded-xl bg-white border border-[#E5E5E7] shadow-xl space-y-1">
                      <div className="px-3 py-2 border-b border-[#E5E5E7] mb-1">
                        <p className="text-xs font-semibold text-[#374151] truncate">{user.email}</p>
                        <p className="text-[10px] text-[#9CA3AF] font-mono truncate">{user.id.slice(0, 16)}…</p>
                      </div>
                      <a href="/agents/manager-agent" className="flex items-center gap-2 px-3 py-2 rounded-lg text-sm text-[#374151] hover:bg-[#FAFAFA] transition-colors">
                        <User className="w-4 h-4 text-[#6B7280]" /> My Analyses
                      </a>
                      <button onClick={handleSignOut} className="w-full flex items-center gap-2 px-3 py-2 rounded-lg text-sm text-red-600 hover:bg-red-50 transition-colors">
                        <LogOut className="w-4 h-4" /> Sign Out
                      </button>
                    </div>
                  </motion.div>
                )}
              </AnimatePresence>
            </div>
          ) : (
            <>
              {!hideAuthButtons && (onSignInClick ? (
                <button onClick={onSignInClick} className="text-sm font-medium text-[#6B7280] hover:text-[#111114] transition-colors px-3 py-2 flex items-center gap-1.5">
                  <Github className="w-4 h-4" /> Sign In
                </button>
              ) : (
                <a href="/auth" className="text-sm font-medium text-[#6B7280] hover:text-[#111114] transition-colors px-3 py-2 flex items-center gap-1.5">
                  <Github className="w-4 h-4" /> Sign In
                </a>
              ))}
              {!hideAuthButtons && (onSignInClick ? (
                <motion.button onClick={onSignInClick} whileHover={{ scale: 1.03 }} whileTap={{ scale: 0.97 }} className="px-5 py-2.5 rounded-full text-sm font-semibold text-white bg-[#2563EB] hover:bg-[#1D4ED8] shadow-sm transition-all duration-300 flex items-center gap-2">
                  <Sparkles className="w-4 h-4 text-white" /> Try it Free <ArrowRight className="w-3.5 h-3.5" />
                </motion.button>
              ) : (
                <motion.a href="/auth" whileHover={{ scale: 1.03 }} whileTap={{ scale: 0.97 }} className="px-5 py-2.5 rounded-full text-sm font-semibold text-white bg-[#2563EB] hover:bg-[#1D4ED8] shadow-sm transition-all duration-300 flex items-center gap-2">
                  <Sparkles className="w-4 h-4 text-white" /> Try it Free <ArrowRight className="w-3.5 h-3.5" />
                </motion.a>
              ))}
            </>
          )}
        </div>

        {/* Mobile toggle */}
        <button onClick={() => setMobileMenuOpen(!mobileMenuOpen)} className="md:hidden text-[#6B7280] hover:text-[#111114] p-2">
          {mobileMenuOpen ? <X className="w-6 h-6" /> : <Menu className="w-6 h-6" />}
        </button>
      </div>

      {/* Mobile Drawer */}
      {mobileMenuOpen && (
        <motion.div initial={{ opacity: 0, y: -10 }} animate={{ opacity: 1, y: 0 }} className="md:hidden bg-white border-b border-[#E5E5E7] px-5 py-5 space-y-3 shadow-sm">
          {/* Repo chip in mobile menu (only shown in workspace when a repo is analyzed) */}
          {showRepoChip && (
            <div className="w-full flex items-center justify-between px-4 py-2.5 rounded-xl bg-[#2563EB]/5 border border-[#2563EB]/20 text-[#2563EB] text-sm font-semibold">
              <div className="flex items-center gap-2.5 min-w-0">
                <FolderGit2 className="w-4 h-4 shrink-0" />
                <span className="truncate">{getRepoDisplayName(repoPath)}</span>
              </div>
              <button
                onClick={() => { setMobileMenuOpen(false); handleClearRepo(); }}
                className="p-1 text-[#2563EB] hover:bg-[#2563EB]/10 rounded-full cursor-pointer"
                title="Clear analyzed repository"
              >
                <XCircle className="w-4 h-4 text-[#2563EB]" />
              </button>
            </div>
          )}
          <div className="border-t border-[#F1F5F9] pt-3 space-y-3">
          {user ? (
            <>
              {agentNavItems.map((agent) => {
                const Icon = agent.icon;
                return (
                  <a key={agent.name} href={agent.href} onClick={() => setMobileMenuOpen(false)}
                    className="flex items-center gap-2.5 text-base font-medium text-[#374151] hover:text-[#2563EB]">
                    <Icon className="w-4 h-4 text-[#2563EB]" />
                    {agent.name}
                  </a>
                );
              })}
              <a href="/reports" onClick={() => setMobileMenuOpen(false)}
                className="block text-base font-medium text-[#374151] hover:text-[#2563EB]">
                Reports
              </a>
            </>
          ) : (
            <>
              {unauthLinks.map((link) => (
                <a key={link.name} href={link.href} onClick={() => setMobileMenuOpen(false)}
                  className="block text-base font-medium text-[#6B7280] hover:text-[#111114]">
                  {link.name}
                </a>
              ))}
            </>
          )}
          </div>
          <div className="pt-3 border-t border-[#E5E5E7] flex flex-col gap-3">
            {user ? (
              <>
                <div className="text-center text-sm text-[#374151]">{user.email}</div>
                <button onClick={handleSignOut} className="text-center py-2 text-red-600 font-medium hover:text-red-700 flex items-center justify-center gap-2">
                  <LogOut className="w-4 h-4" /> Sign Out
                </button>
              </>
            ) : (
              <>
                {onSignInClick ? (
                  <button onClick={onSignInClick} className="text-center py-2 text-[#6B7280] font-medium hover:text-[#111114]">Sign In</button>
                ) : (
                  <a href="/auth" className="text-center py-2 text-[#6B7280] font-medium hover:text-[#111114]">Sign In</a>
                )}
                {onSignInClick ? (
                  <button onClick={onSignInClick} className="text-center py-3 rounded-full font-semibold text-white bg-[#2563EB] hover:bg-[#1D4ED8]">
                    Try it Free
                  </button>
                ) : (
                  <a href="/auth" onClick={() => setMobileMenuOpen(false)} className="text-center py-3 rounded-full font-semibold text-white bg-[#2563EB] hover:bg-[#1D4ED8]">
                    Try it Free
                  </a>
                )}
              </>
            )}
          </div>
        </motion.div>
      )}

      {/* Change Repository Modal */}
      <AnimatePresence>
        {changeModalOpen && (
          <div
            className="fixed inset-0 z-50 flex items-end sm:items-center justify-center p-0 sm:p-4 bg-black/50 backdrop-blur-sm"
            onClick={() => setChangeModalOpen(false)}
          >
            <motion.div
              initial={{ opacity: 0, scale: 0.95 }}
              animate={{ opacity: 1, scale: 1 }}
              exit={{ opacity: 0, scale: 0.95 }}
              onClick={(e) => e.stopPropagation()}
              className="w-full sm:max-w-md bg-white rounded-t-2xl sm:rounded-2xl p-5 sm:p-6 shadow-2xl border border-[#E5E5E7] space-y-4 max-h-[90vh] overflow-y-auto"
            >
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <FolderGit2 className="w-5 h-5 text-[#2563EB]" />
                  <h3 className="text-lg font-bold text-[#111114]">Change Repository</h3>
                </div>
                <button
                  type="button"
                  onClick={() => setChangeModalOpen(false)}
                  className="p-1.5 rounded-lg hover:bg-gray-100 text-gray-500 hover:text-gray-700 transition-colors cursor-pointer"
                  title="Close"
                  aria-label="Close modal"
                >
                  <X className="w-5 h-5" />
                </button>
              </div>

              <div className="space-y-2">
                <label className="text-xs font-mono text-[#6B7280]">GitHub Repository URL</label>
                <input
                  type="text"
                  value={modalInput}
                  onChange={(e) => setModalInput(e.target.value)}
                  placeholder="e.g. facebook/react or full URL"
                  disabled={isSwitching}
                  className="w-full px-3.5 py-2.5 rounded-xl border border-[#CBD5E1] text-sm font-mono focus:outline-none focus:border-[#2563EB] focus:ring-2 focus:ring-[#2563EB]/10 disabled:opacity-50"
                />
                <button
                  onClick={() => handleSwitchRepo(modalInput)}
                  disabled={!modalInput.trim() || isSwitching}
                  className="w-full py-2.5 rounded-xl bg-[#2563EB] text-white text-sm font-semibold hover:bg-[#1D4ED8] disabled:opacity-50 transition-colors flex items-center justify-center gap-2 cursor-pointer"
                >
                  {isSwitching ? (
                    <>
                      <Loader2 className="w-4 h-4 animate-spin" />
                      <span>Loading Repository…</span>
                    </>
                  ) : (
                    <span>Load Repository</span>
                  )}
                </button>
              </div>

              <div className="pt-2 border-t border-gray-100 space-y-2">
                <p className="text-xs font-mono text-[#9CA3AF]">Or pick a quick example:</p>
                <div className="flex flex-wrap gap-1.5">
                  {sampleRepos.map((repo) => (
                    <button
                      key={repo.url}
                      disabled={isSwitching}
                      onClick={() => handleSwitchRepo(repo.url)}
                      className="px-2.5 py-1 rounded-lg bg-[#F1F5F9] hover:bg-[#2563EB]/10 hover:text-[#2563EB] text-xs font-mono text-[#475569] transition-colors disabled:opacity-50 cursor-pointer"
                    >
                      {repo.label}
                    </button>
                  ))}
                </div>
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>
    </header>
  );
};
