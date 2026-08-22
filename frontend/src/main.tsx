import React, { useEffect } from 'react'
import ReactDOM from 'react-dom/client'
import './index.css'
import Home from '../app/page'
import DocsPage from '../app/docs/page'
import ReportsPage from '../app/reports/page'
import UserQueryPage from '../app/agents/user-query/page'
import ManagerAgentPage from '../app/agents/manager-agent/page'
import ExplorerAgentPage from '../app/agents/explorer-agent/page'
import TraceAgentPage from '../app/agents/trace-agent/page'
import SecurityAgentPage from '../app/agents/security-agent/page'
import VisualizationAgentPage from '../app/agents/visualization-agent/page'
import AuthPage from '../app/auth/page'
import { RepoProvider } from '../lib/repoContext'
import { AuthProvider, useAuth } from '../lib/authContext'

function AppRouter() {
  const { user, loading } = useAuth();
  const pathname = window.location.pathname;

  // Clean URL hash if returning from OAuth redirect with access_token
  useEffect(() => {
    if (user && typeof window !== 'undefined' && window.location.hash.includes('access_token=')) {
      window.history.replaceState(null, '', window.location.pathname + window.location.search);
    }
  }, [user]);

  console.log('[RouteGuard] render:', { pathname, loading, isAuthenticated: !!user, userEmail: user?.email });

  // Show a spinner ONLY while session check is in progress
  if (loading) {
    return (
      <div className="min-h-screen bg-[#FAFAFA] flex items-center justify-center flex-col gap-3">
        <div className="w-8 h-8 border-4 border-[#2563EB]/30 border-t-[#2563EB] rounded-full animate-spin" />
        <p className="text-sm font-medium text-[#6B7280]">Authenticating session...</p>
      </div>
    );
  }

  // Always allow the /auth route
  if (pathname === '/auth' || pathname.startsWith('/auth')) {
    return <AuthPage />;
  }

  // Docs is publicly accessible (no login required)
  if (pathname === '/docs' || pathname.startsWith('/docs')) {
    return <DocsPage />;
  }

  // Protected agent / report routes require authentication
  if (!user && (pathname.includes('/reports') || pathname.includes('/agents/'))) {
    return <AuthPage />;
  }

  if (pathname.includes('/reports')) {
    return <ReportsPage />;
  }
  if (pathname.includes('/agents/user-query')) {
    return <UserQueryPage />;
  }
  if (pathname.includes('/agents/manager-agent')) {
    return <ManagerAgentPage />;
  }
  if (pathname.includes('/agents/explorer-agent')) {
    return <ExplorerAgentPage />;
  }
  if (pathname.includes('/agents/trace-agent')) {
    return <TraceAgentPage />;
  }
  if (pathname.includes('/agents/security-agent')) {
    return <SecurityAgentPage />;
  }
  if (pathname.includes('/agents/visualization-agent')) {
    return <VisualizationAgentPage />;
  }

  return <Home />;
}

ReactDOM.createRoot(document.getElementById('root')!).render(
  <React.StrictMode>
    <AuthProvider>
      <RepoProvider>
        <AppRouter />
      </RepoProvider>
    </AuthProvider>
  </React.StrictMode>,
)
