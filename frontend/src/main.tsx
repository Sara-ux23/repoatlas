import React from 'react'
import ReactDOM from 'react-dom/client'
import './index.css'
import Home from '../app/page'
import DocsPage from '../app/docs/page'
import UserQueryPage from '../app/agents/user-query/page'
import ManagerAgentPage from '../app/agents/manager-agent/page'
import ExplorerAgentPage from '../app/agents/explorer-agent/page'
import TraceAgentPage from '../app/agents/trace-agent/page'
import SecurityAgentPage from '../app/agents/security-agent/page'
import VisualizationAgentPage from '../app/agents/visualization-agent/page'
import { RepoProvider } from '../lib/repoContext'

function AppRouter() {
  const pathname = window.location.pathname;

  if (pathname.includes('/docs')) {
    return <DocsPage />;
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
    <RepoProvider>
      <AppRouter />
    </RepoProvider>
  </React.StrictMode>,
)

