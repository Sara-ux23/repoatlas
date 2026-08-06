/**
 * RepoAtlas AI — API client
 * Talks to the FastAPI backend at localhost:8000
 */

const BASE_URL = 'http://localhost:8000';

export interface ManagerRequest {
  repo_path: string;
  query?: string;
  agents?: string[];
  generate_video?: boolean;
}

export interface CommitEntry {
  hash: string;
  short_hash: string;
  author: string;
  email: string;
  date: string;
  message: string;
}

export interface ContributorEntry {
  count: number;
  author: string;
}

export interface TraceResult {
  timeline: string;
  commits: CommitEntry[];
  contributors: ContributorEntry[];
  branches: { current: string; all: string[] };
  file_history: CommitEntry[];
  summary: string;
}

export interface SecurityFinding {
  severity: string;
  file?: string;
  line?: number;
  type?: string;
  package?: string;
  reason?: string;
  [key: string]: unknown;
}

export interface SecurityResult {
  risk_rating: 'CRITICAL' | 'HIGH' | 'MEDIUM' | 'LOW' | 'SAFE';
  score: { counts: Record<string, number>; total: number; rating: string };
  findings: Record<string, SecurityFinding[]>;
  report: string;
  expert_analysis: string;
}

export interface LangEntry {
  language: string;
  extension: string;
  lines: number;
  files: number;
  color: string;
}

export interface DepGraph {
  nodes: { id: string; label: string; type: string; path: string }[];
  edges: { id: string; source: string; target: string }[];
  node_count: number;
  edge_count: number;
}

export interface HeatmapEntry {
  date: string;
  count: number;
  day_of_week: number;
  week: string;
  month: string;
}

export interface VizResult {
  folder_tree: Record<string, unknown>;
  language_breakdown: LangEntry[];
  dependency_graph: DepGraph;
  commit_heatmap: HeatmapEntry[];
  contributor_activity: { author: string; month: string; commits: number }[];
  narrative: string;
  summary: string;
  video_url: string | null;
}

export interface ManagerResponse {
  repo_path: string;
  query: string;
  agents_run: string[];
  statuses: Record<string, 'success' | 'error'>;
  executive_summary: string;
  explorer: string | null;
  trace: TraceResult | null;
  security: SecurityResult | null;
  visualization: VizResult | null;
}

export async function analyzeRepo(req: ManagerRequest): Promise<ManagerResponse> {
  const res = await fetch(`${BASE_URL}/manager/`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      repo_path: req.repo_path,
      query: req.query ?? 'full analysis',
      agents: req.agents ?? null,
      generate_video: req.generate_video ?? false,
    }),
  });

  if (!res.ok) {
    const detail = await res.text();
    throw new Error(`Analysis failed (${res.status}): ${detail}`);
  }

  return res.json() as Promise<ManagerResponse>;
}

export async function getSession(): Promise<{ repo_url: string | null; local_path: string | null; cached: boolean }> {
  const res = await fetch(`${BASE_URL}/manager/session`);
  return res.json();
}

export async function clearSession(): Promise<void> {
  await fetch(`${BASE_URL}/manager/session`, { method: 'DELETE' });
}

/** Wipe frontend sessionStorage and localStorage for a clean slate before a new analysis. */
export function clearLocalSession(): void {
  sessionStorage.removeItem('repoatlas_path');
  sessionStorage.removeItem('repoatlas_result');
  sessionStorage.removeItem('repoatlas_url');
  localStorage.removeItem('repoatlas_path');
  localStorage.removeItem('repoatlas_result');
  localStorage.removeItem('repoatlas_url');
}

export interface ChatMessage {
  role: 'user' | 'assistant';
  content: string;
}

export interface UserQueryResponse {
  answer: string;
  context_used: boolean;
  repo_path?: string;
  error?: string;
}

export async function askUserQuery(
  query: string,
  chatHistory?: ChatMessage[],
  repoPath?: string
): Promise<UserQueryResponse> {
  const res = await fetch(`${BASE_URL}/user-query/`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      query,
      chat_history: chatHistory ?? null,
      repo_path: repoPath ?? null,
    }),
  });

  if (!res.ok) {
    const detail = await res.text();
    throw new Error(`Query failed (${res.status}): ${detail}`);
  }

  return res.json() as Promise<UserQueryResponse>;
}

// Video recording types and functions
export interface RecordingRequest {
  repo_url: string;
  base_url?: string;
}

export interface RecordingResponse {
  status: 'exists' | 'recording' | 'ready' | 'not_found';
  video_url?: string;
  repo_id: string;
  message: string;
}

export async function recordWalkthrough(request: RecordingRequest): Promise<RecordingResponse> {
  const response = await fetch(`${BASE_URL}/video/record`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(request),
  });
  if (!response.ok) throw new Error('Recording request failed');
  return response.json();
}

export async function getRecordingStatus(repoId: string): Promise<RecordingResponse> {
  const response = await fetch(`${BASE_URL}/video/status/${repoId}`);
  if (!response.ok) throw new Error('Status check failed');
  return response.json();
}
