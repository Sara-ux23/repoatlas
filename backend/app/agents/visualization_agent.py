"""Visualization Agent — chart data + AI narrative + optional video."""

import os, asyncio, warnings, certifi
warnings.filterwarnings("ignore")
os.environ["REQUESTS_CA_BUNDLE"] = certifi.where()
os.environ["SSL_CERT_FILE"] = certifi.where()

from langchain_core.messages import HumanMessage, SystemMessage
from app.tools.github_tools import clone_repo, cleanup_repo
from app.tools.viz_tools import get_folder_size_tree, get_language_breakdown, get_dependency_graph, get_commit_heatmap, get_contributor_activity
from app.tools.git_tools import get_commit_log
from app.core.llm import invoke_with_rotation


import logging
logger = logging.getLogger(__name__)

def _safe_tool(tool_func, args, fallback):
    try:
        return tool_func.invoke(args)
    except Exception as e:
        logger.warning(f"[Viz] Tool {getattr(tool_func, 'name', 'tool')} failed: {e}")
        return fallback

def _collect(local_path: str) -> dict:
    return {
        "folder_tree": _safe_tool(get_folder_size_tree, {"repo_path": local_path}, {"name": "root", "children": [], "size": 0}),
        "language_breakdown": _safe_tool(get_language_breakdown, {"repo_path": local_path}, []),
        "dependency_graph": _safe_tool(get_dependency_graph, {"repo_path": local_path}, {"nodes": [], "edges": [], "node_count": 0, "edge_count": 0}),
        "commit_heatmap": _safe_tool(get_commit_heatmap, {"repo_path": local_path}, []),
        "contributor_activity": _safe_tool(get_contributor_activity, {"repo_path": local_path}, []),
    }


def _summary(viz: dict) -> str:
    try:
        langs = ", ".join(f"{l['language']}({l['lines']})" for l in (viz.get("language_breakdown") or [])[:5]) or "unknown"
    except Exception:
        langs = "unknown"
    try:
        dep = viz.get("dependency_graph") or {}
        dep_info = f"Files: {dep.get('node_count', 0)}, Connections: {dep.get('edge_count', 0)}"
    except Exception:
        dep_info = "Files: unknown"
    try:
        hm = viz.get("commit_heatmap") or []
        commit_info = f"Commits: {sum(h['count'] for h in hm)} over {len(hm)} days"
    except Exception:
        commit_info = "Commits: unknown"
    try:
        authors = list({c["author"] for c in (viz.get("contributor_activity") or [])})
        author_info = ", ".join(authors[:10]) or "none"
    except Exception:
        author_info = "unknown"
    try:
        size = (viz.get("folder_tree") or {}).get("size", 0)
        size_info = f"Size: {size / 1024:.1f} KB"
    except Exception:
        size_info = "Size: unknown"
    return (
        f"Languages: {langs}\n"
        f"{dep_info}\n"
        f"{commit_info}\n"
        f"Contributors: {author_info}\n"
        f"{size_info}"
    )


from app.core.repo_session import repo_session

async def run_visualization(repo_path: str, query: str = "full repo overview", generate_video: bool = False) -> dict:
    local_path = await repo_session.load(repo_path)
    repo_name = repo_path.rstrip("/").split("/")[-1]
    viz = await asyncio.get_event_loop().run_in_executor(None, _collect, local_path)
    summary_text = _summary(viz)
    narrative = await invoke_with_rotation([
        SystemMessage(content="You are the Visualization Agent for RepoAtlas AI. Write a concise data-driven narrative. Max 150 words."),
        HumanMessage(content=f"{summary_text}\n\nQUERY: {query}"),
    ], model="llama-3.1-8b-instant")
    commits = get_commit_log.invoke({"repo_path": local_path, "limit": 10})
    result = {**viz, "narrative": narrative, "summary": summary_text, "video_url": None}
    if generate_video:
        try:
            from app.tools.video_tools import render_video
            result["video_url"] = await render_video(result, {"commits": commits}, repo_name)
        except Exception as e:
            result["video_url"] = f"Video failed: {e}"
    return result
