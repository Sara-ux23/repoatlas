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


def _collect(local_path: str) -> dict:
    return {
        "folder_tree": get_folder_size_tree.invoke({"repo_path": local_path}),
        "language_breakdown": get_language_breakdown.invoke({"repo_path": local_path}),
        "dependency_graph": get_dependency_graph.invoke({"repo_path": local_path}),
        "commit_heatmap": get_commit_heatmap.invoke({"repo_path": local_path}),
        "contributor_activity": get_contributor_activity.invoke({"repo_path": local_path}),
    }


def _summary(viz: dict) -> str:
    langs = ", ".join(f"{l['language']}({l['lines']})" for l in viz["language_breakdown"][:5])
    dep = viz["dependency_graph"]
    hm = viz["commit_heatmap"]
    authors = list({c["author"] for c in viz["contributor_activity"]})
    size = viz["folder_tree"].get("size", 0)
    return (
        f"Languages: {langs}\n"
        f"Files: {dep['node_count']}, Connections: {dep['edge_count']}\n"
        f"Commits: {sum(h['count'] for h in hm)} over {len(hm)} days\n"
        f"Contributors: {', '.join(authors)}\n"
        f"Size: {size/1024:.1f} KB"
    )


async def run_visualization(repo_path: str, query: str = "full repo overview", generate_video: bool = False) -> dict:
    cloned = False
    local_path = repo_path
    repo_name = repo_path.rstrip("/").split("/")[-1]
    if repo_path.startswith("http"):
        local_path = await asyncio.get_event_loop().run_in_executor(None, clone_repo, repo_path)
        cloned = True
    try:
        viz = await asyncio.get_event_loop().run_in_executor(None, _collect, local_path)
        summary_text = _summary(viz)
        narrative = await invoke_with_rotation([
            SystemMessage(content="You are the Visualization Agent for RepoAtlas AI. Write a concise data-driven narrative. Max 150 words."),
            HumanMessage(content=f"{summary_text}\n\nQUERY: {query}"),
        ])
        commits = get_commit_log.invoke({"repo_path": local_path, "limit": 10})
        result = {**viz, "narrative": narrative, "summary": summary_text, "video_url": None}
        if generate_video:
            try:
                from app.tools.video_tools import render_video
                result["video_url"] = await render_video(result, {"commits": commits}, repo_name)
            except Exception as e:
                result["video_url"] = f"Video failed: {e}"
        return result
    finally:
        if cloned: cleanup_repo(local_path)
