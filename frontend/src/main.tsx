import React from 'react'
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

  // Show a spinner while we wait for the session to resolve
  if (loading) {
    return (
      <div className="min-h-screen bg-[#FAFAFA] flex items-center justify-center">
        <div className="w-8 h-8 border-4 border-[#2563EB]/30 border-t-[#2563EB] rounded-full animate-spin" />
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

  // Guard: unauthenticated users see AuthPage
  if (!user) {
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
