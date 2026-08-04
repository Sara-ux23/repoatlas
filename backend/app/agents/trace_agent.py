"""Trace Agent — git history timeline analyzer."""

import os, asyncio, warnings, certifi
warnings.filterwarnings("ignore")
os.environ["REQUESTS_CA_BUNDLE"] = certifi.where()
os.environ["SSL_CERT_FILE"] = certifi.where()

from langchain_core.messages import HumanMessage, SystemMessage
from app.tools.github_tools import clone_repo, cleanup_repo
from app.tools.git_tools import get_commit_log, get_contributor_stats, get_branch_info, get_file_history
from app.core.llm import invoke_with_rotation


def _timeline(commits: list) -> str:
    if not commits:
        return "No commits found."
    lines = ["COMMIT TIMELINE (newest → oldest)", "=" * 60]
    for i, c in enumerate(commits):
        lines.append(f"● [{c['short_hash']}] {c['date'][:10]}  {c['author']}")
        lines.append(f"{'│' if i < len(commits)-1 else ' '}   {c['message']}")
        if i < len(commits) - 1:
            lines.append("│")
    lines.append("=" * 60)
    return "\n".join(lines)


def _gather(local_path: str, file_path=None) -> dict:
    commits = get_commit_log.invoke({"repo_path": local_path, "limit": 30})
    return {
        "commits": commits,
        "contributors": get_contributor_stats.invoke({"repo_path": local_path}),
        "branches": get_branch_info.invoke({"repo_path": local_path}),
        "file_history": get_file_history.invoke({"repo_path": local_path, "file_path": file_path, "limit": 20}) if file_path else [],
        "timeline_ascii": _timeline(commits),
    }


async def run_trace(repo_path: str, query: str, file_path=None) -> dict:
    cloned = False
    local_path = repo_path
    if repo_path.startswith("http"):
        local_path = await asyncio.get_event_loop().run_in_executor(None, clone_repo, repo_path)
        cloned = True
    try:
        ctx = await asyncio.get_event_loop().run_in_executor(None, _gather, local_path, file_path)
        summary = await invoke_with_rotation([
            SystemMessage(content="You are the Trace Agent for RepoAtlas AI. Analyze git history concisely. Max 150 words."),
            HumanMessage(content=f"{ctx['timeline_ascii']}\nContributors: {ctx['contributors']}\nBranches: {ctx['branches']}\nQUERY: {query}"),
        ])
        return {
            "timeline": ctx["timeline_ascii"],
            "commits": ctx["commits"],
            "contributors": ctx["contributors"],
            "branches": ctx["branches"],
            "file_history": ctx["file_history"],
            "summary": summary,
        }
    finally:
        if cloned: cleanup_repo(local_path)
