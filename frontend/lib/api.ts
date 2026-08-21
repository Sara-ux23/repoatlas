/**
 * RepoAtlas AI — API client
 * Talks to the FastAPI backend at localhost:8000
 */

const BASE_URL = (import.meta as any).env?.VITE_API_URL || '/api';

/** Returns Authorization header if a Supabase session exists, otherwise empty object. */
async function authHeader(): Promise<Record<string, string>> {
  try {
    const { supabase } = await import('./supabase');
    const { data } = await supabase.auth.getSession();
    const token = data.session?.access_token;
    return token ? { Authorization: `Bearer ${token}` } : {};
  } catch {
    return {};
  }
}

export interface ManagerRequest {
  repo_path: string;
  query?: string;
  agents?: string[];
  generate_video?: boolean;
  force_refresh?: boolean;  // bypass the 24-hour cache
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
  cached?: boolean;  // true when result was served from DB cache
  incremental?: boolean; // true when cache hit but new commits triggered a trace refresh
}

export async function analyzeRepo(req: ManagerRequest): Promise<ManagerResponse> {
  const headers: Record<string, string> = {
    'Content-Type': 'application/json',
    ...(await authHeader()),
  };
  const res = await fetch(`${BASE_URL}/manager/`, {
    method: 'POST',
    headers,
    signal: AbortSignal.timeout(115000), // Enforce strictly within 2 minutes
    body: JSON.stringify({
      repo_path: req.repo_path,
      query: req.query ?? 'full analysis',
      agents: req.agents ?? null,
      generate_video: req.generate_video ?? false,
      force_refresh: req.force_refresh ?? false,
    }),
  });

  if (!res.ok) {
    const detail = await res.text();
    throw new Error(`Analysis failed (${res.status}): ${detail}`);
  }

  return res.json() as Promise<ManagerResponse>;
}

export interface CropLookupResult {
  mode: 'exact' | 'guess';
  file_path: string;
  confidence_label: string;
  code_snippet: string;
  explanation: string;
  start_line: number;
  end_line: number;
}

export async function fetchCropLookup(req: {
  repo_url?: string;
  cropped_image?: string;
  text_hint?: string;
  repo_path?: string;
}): Promise<CropLookupResult> {
  const headers: Record<string, string> = {
    'Content-Type': 'application/json',
    ...(await authHeader()),
  };
  const res = await fetch(`${BASE_URL}/visualization/crop-lookup`, {
    method: 'POST',
    headers,
    body: JSON.stringify(req),
  });
  if (!res.ok) {
    throw new Error(`Crop lookup failed (${res.status})`);
  }
  return res.json() as Promise<CropLookupResult>;
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

/** Save an analysis result locally and append it to repoatlas_history in localStorage. */
export function saveLocalAnalysis(url: string, result: ManagerResponse): void {
  try {
    const serialized = JSON.stringify(result);
    localStorage.setItem('repoatlas_result', serialized);
    localStorage.setItem('repoatlas_url', url);
    localStorage.setItem('repoatlas_path', url);
    sessionStorage.setItem('repoatlas_result', serialized);
    sessionStorage.setItem('repoatlas_url', url);
    sessionStorage.setItem('repoatlas_path', url);

    const rawHist = localStorage.getItem('repoatlas_history');
    let historyList: any[] = [];
    if (rawHist) {
      try { historyList = JSON.parse(rawHist); } catch { historyList = []; }
    }
    const newEntry = {
      id: `local-${Date.now()}`,
      repo_url: url,
      repo_path: url,
      query: result.query || 'full analysis',
      agents_run: result.agents_run || ['explorer', 'trace', 'security', 'visualization'],
      executive_summary: result.executive_summary,
      explorer: result.explorer ?? (result as any).explorer_result,
      explorer_result: (result as any).explorer_result ?? result.explorer,
      trace: result.trace ?? (result as any).trace_result,
      trace_result: (result as any).trace_result ?? result.trace,
      security: result.security ?? (result as any).security_result,
      security_result: (result as any).security_result ?? result.security,
      visualization: result.visualization ?? (result as any).visualization_result,
      visualization_result: (result as any).visualization_result ?? result.visualization,
      created_at: new Date().toISOString(),
    };
    const updated = [newEntry, ...historyList.filter((item: any) => item.repo_url !== url)];
    localStorage.setItem('repoatlas_history', JSON.stringify(updated));
  } catch (err) {
    console.error('Failed to save local analysis history:', err);
  }
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
  const headers: Record<string, string> = {
    'Content-Type': 'application/json',
    ...(await authHeader()),
  };
  const res = await fetch(`${BASE_URL}/user-query/`, {
    method: 'POST',
    headers,
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
  /** Serialized analysis result injected into the headless browser's localStorage
   *  so every agent page renders real repo data during recording. */
  session_data?: Record<string, unknown>;
  force_refresh?: boolean;
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
    body: JSON.stringify({
      repo_url: request.repo_url,
      base_url: request.base_url,
      session_data: request.session_data ?? null,
      force_refresh: request.force_refresh ?? false,
    }),
  });
  if (!response.ok) throw new Error('Recording request failed');
  return response.json();
}

export async function getRecordingStatus(repoId: string): Promise<RecordingResponse> {
  const response = await fetch(`${BASE_URL}/video/status/${repoId}`);
  if (!response.ok) throw new Error('Status check failed');
  return response.json();
}

// ─── File Content Preview ──────────────────────────────────────────────────

export interface FileContentResult {
  file_path: string;
  content: string;
  size: number;
  too_large: boolean;
  truncated?: boolean;
  is_image?: boolean;
  error?: string;
}

export async function fetchFileContent(filePath: string, repoPath?: string): Promise<FileContentResult> {
  const auth = await authHeader();
  const response = await fetch(`${BASE_URL}/visualization/file-content`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json', ...auth },
    body: JSON.stringify({ file_path: filePath, repo_path: repoPath }),
  });
  if (!response.ok) {
    const err = await response.json().catch(() => ({ detail: 'Failed to fetch file content' }));
    throw new Error(err.detail || 'Failed to fetch file content');
  }
  return response.json();
}

// ─── Chat history ─────────────────────────────────────────────────────────────

export interface PersistedChatMessage {
  id: string;
  role: 'user' | 'assistant';
  content: string;
  created_at: string;
  agent?: string;
}

export interface ChatHistoryResponse {
  repo_url: string;
  messages: PersistedChatMessage[];
}

/** Fetch persisted chat history for a repo from the backend. */
export async function getChatHistory(
  repoUrl: string,
  limit = 50,
  agent?: string,
): Promise<PersistedChatMessage[]> {
  try {
    const headers = await authHeader();
    const params = new URLSearchParams({ repo_url: repoUrl, limit: String(limit) });
    if (agent) params.append('agent', agent);
    const res = await fetch(`${BASE_URL}/chat/history?${params}`, { headers });
    if (!res.ok) return [];
    const data: ChatHistoryResponse = await res.json();
    return data.messages;
  } catch {
    return [];
  }
}

/** Save a single chat message to the backend. Fire-and-forget (errors are swallowed). */
export async function saveChatMessage(
  repoUrl: string,
  role: 'user' | 'assistant',
  content: string,
  agent?: string,
): Promise<void> {
  try {
    const headers: Record<string, string> = {
      'Content-Type': 'application/json',
      ...(await authHeader()),
    };
    await fetch(`${BASE_URL}/chat/message`, {
      method: 'POST',
      headers,
      body: JSON.stringify({ repo_url: repoUrl, role, content, agent }),
    });
  } catch {
    // non-fatal — local state is the source of truth during the session
  }
}

/** Delete all chat messages for a repo. */
export async function clearChatHistory(repoUrl: string, agent?: string): Promise<void> {
  try {
    const headers = await authHeader();
    const params = new URLSearchParams({ repo_url: repoUrl });
    if (agent) params.append('agent', agent);
    await fetch(`${BASE_URL}/chat/history?${params}`, { method: 'DELETE', headers });
  } catch {
    // non-fatal
  }
}

// ─── Analysis history ──────────────────────────────────────────────────────

export interface AnalysisSummary {
  id: string;
  repo_url: string;
  query: string | null;
  agents_run: string[] | null;
  executive_summary: string | null;
  created_at: string;
}

export interface AnalysisDetail extends AnalysisSummary {
  statuses?: Record<string, string>;
  explorer_result?: any;
  trace_result?: any;
  security_result?: any;
  visualization_result?: any;
}

/** Fetch all past analysis sessions for the logged-in user (newest first). */
export async function getAnalysisHistory(): Promise<AnalysisSummary[]> {
  try {
    const headers = await authHeader();
    const res = await fetch(`${BASE_URL}/history/`, { headers });
    if (!res.ok) return [];
    return res.json();
  } catch {
    return [];
  }
}

// ─── Chat repos ───────────────────────────────────────────────────────────────

export interface ChatRepoItem {
  repo_url: string;
  last_message_at: string;
  message_count: number;
}

/**
 * Return every repo that has chat messages for the current user, newest first.
 * This includes repos that were chatted about but never formally analyzed.
 */
export async function getChatRepos(): Promise<ChatRepoItem[]> {
  try {
    const headers = await authHeader();
    const res = await fetch(`${BASE_URL}/chat/repos`, { headers });
    if (!res.ok) return [];
    return res.json();
  } catch {
    return [];
  }
}

/** Fetch full details of a single past analysis session. */
export async function getAnalysisDetail(analysisId: string): Promise<AnalysisDetail | null> {
  try {
    const headers = await authHeader();
    const res = await fetch(`${BASE_URL}/history/${analysisId}`, { headers });
    if (!res.ok) return null;
    return res.json();
  } catch {
    return null;
  }
}

export interface RepoComparisonStats {
  repo_name: string;
  repo_url: string;
  total_commits: number;
  total_contributors: number;
  total_lines: number;
  primary_lang: string;
  monthly_velocity: number;
  branches_count: number;
  security_risk: 'SAFE' | 'MEDIUM' | 'HIGH';
  critical_vulns: number;
  top_contributor: string;
  languages: LangEntry[];
}

export interface CompareResponse {
  repo1: RepoComparisonStats;
  repo2: RepoComparisonStats;
  verdict: string;
}

export async function compareRepos(repoUrl1: string, repoUrl2: string): Promise<CompareResponse> {
  const headers = await authHeader();
  const res = await fetch(`${BASE_URL}/trace/compare`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json', ...headers },
    body: JSON.stringify({ repo_url_1: repoUrl1, repo_url_2: repoUrl2 }),
  });

  if (!res.ok) {
    const err = await res.text();
    throw new Error(`Comparison failed: ${err}`);
  }

  return res.json();
}
