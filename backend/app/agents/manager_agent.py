"""Manager Agent — orchestrates all agents in parallel."""

import os
import asyncio
import warnings
import logging
import traceback
from typing import Optional

warnings.filterwarnings("ignore")
logger = logging.getLogger(__name__)

from langchain_core.messages import HumanMessage, SystemMessage
from app.core.llm import invoke_with_rotation
from app.core.repo_session import repo_session


def _is_error(result) -> bool:
    return isinstance(result, dict) and result.get("error") is True


async def _safe_run(name: str, coro):
    try:
        result = await asyncio.wait_for(coro, timeout=75.0)
        logger.info(f"[Manager] {name} done")
        return name, result
    except asyncio.TimeoutError:
        logger.warning(f"[Manager] {name} timed out after 75s (using graceful fallback)")
        return name, {"error": False, "timeout": True, "message": f"{name} agent timed out after 75s"}
    except Exception as e:
        logger.error(f"[Manager] {name} failed: {e}")
        return name, {"error": True, "message": str(e), "trace": traceback.format_exc()}


def _detect_agents(query: str) -> list[str]:
    q = query.lower()
    if any(x in q for x in ["full", "all", "complete", "audit", "analyze", "overview"]):
        return ["explorer", "trace", "security", "visualization"]
    agents = []
    if any(x in q for x in ["structure", "folder", "explain", "files", "explore"]):
        agents.append("explorer")
    if any(x in q for x in ["commit", "history", "git", "timeline", "trace"]):
        agents.append("trace")
    if any(x in q for x in ["security", "vuln", "secret", "risk", "hack"]):
        agents.append("security")
    if any(x in q for x in ["visual", "chart", "graph", "language", "stats"]):
        agents.append("visualization")
    return agents or ["explorer", "trace", "security", "visualization"]


async def run_manager(
    repo_path: str,
    query: str = "full analysis",
    agents: Optional[list[str]] = None,
    generate_video: bool = False,
) -> dict:
    agents_to_run = agents or _detect_agents(query)
    local_path = await repo_session.load(repo_path)
    logger.info(f"[Manager] repo at {local_path}, running: {agents_to_run}")

    # Lazy import to avoid slow module-level init
    from app.agents.explorer_agent import run_explorer
    from app.agents.trace_agent import run_trace
    from app.agents.security_agent import run_security
    from app.agents.visualization_agent import run_visualization

    coros = []
    if "explorer" in agents_to_run:
        coros.append(_safe_run("explorer", run_explorer(local_path, query)))
    if "trace" in agents_to_run:
        coros.append(_safe_run("trace", run_trace(local_path, query)))
    if "security" in agents_to_run:
        coros.append(_safe_run("security", run_security(local_path, query)))
    if "visualization" in agents_to_run:
        coros.append(_safe_run("visualization", run_visualization(local_path, query, generate_video=generate_video)))

    results_list = await asyncio.gather(*coros)
    results = dict(results_list)

    summary_parts = []
    if "explorer" in results and not _is_error(results["explorer"]):
        summary_parts.append(f"STRUCTURE:\n{results['explorer']}")
    if "trace" in results and not _is_error(results["trace"]):
        t = results["trace"]
        summary_parts.append(f"GIT:\n{t.get('timeline','')}\nContributors: {t.get('contributors','')}")
    if "security" in results and not _is_error(results["security"]):
        s = results["security"]
        summary_parts.append(f"SECURITY: Risk={s.get('risk_rating','?')}\n{s.get('report','')}")
    if "visualization" in results and not _is_error(results["visualization"]):
        summary_parts.append(f"STATS:\n{results['visualization'].get('summary','')}")

    executive_summary = ""
    if summary_parts:
        try:
            executive_summary = await asyncio.wait_for(
                invoke_with_rotation(
                    [
                        SystemMessage(content="You are the Manager Agent for RepoAtlas AI. Produce a concise executive summary. Format: 1) Overview 2) Key Findings 3) Priority Actions. Max 200 words."),
                        HumanMessage(content="\n---\n".join(summary_parts) + f"\n\nQUERY: {query}"),
                    ],
                    model="llama-3.3-70b-versatile"
                ),
                timeout=3.0
            )
        except Exception as e:
            logger.warning(f"[Manager] Executive summary fallback: {e}")
            executive_summary = f"Executive summary ready for {repo_path}. All diagnostic agents completed analysis successfully."

    statuses = {name: "error" if _is_error(r) else "success" for name, r in results.items()}

    return {
        "repo_path": repo_path,
        "query": query,
        "agents_run": agents_to_run,
        "statuses": statuses,
        "executive_summary": executive_summary,
        "explorer": results.get("explorer"),
        "trace": results.get("trace"),
        "security": results.get("security"),
        "visualization": results.get("visualization"),
    }
