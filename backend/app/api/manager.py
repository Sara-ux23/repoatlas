from fastapi import APIRouter, HTTPException, Depends
from pydantic import BaseModel
from typing import Optional, Any
import logging

from app.auth.dependencies import get_current_user
from app.db.crud import save_analysis, get_cached_analysis

logger = logging.getLogger(__name__)

router = APIRouter(prefix="/manager", tags=["Manager Agent"])


class ManagerRequest(BaseModel):
    repo_path: str
    query: str = "full analysis"
    agents: Optional[list[str]] = None
    generate_video: bool = False
    force_refresh: bool = False  # bypass cache entirely


class ManagerResponse(BaseModel):
    repo_path: str
    query: str
    agents_run: list[str]
    statuses: dict
    executive_summary: str
    explorer: Optional[Any] = None
    trace: Optional[Any] = None
    security: Optional[Any] = None
    visualization: Optional[Any] = None
    cached: bool = False        # True  → served from DB cache (no re-analysis)
    incremental: bool = False   # True  → cache hit but git pull found new commits; trace refreshed


@router.post("/", response_model=ManagerResponse)
async def manager_analyze(
    request: ManagerRequest,
    user_id: str = Depends(get_current_user),
):
    from app.agents.manager_agent import run_manager
    from app.core.repo_session import repo_session

    logger.info(f"[Manager API] Received analysis request: repo={request.repo_path}, user={user_id}, force_refresh={request.force_refresh}")

    # ── Cache lookup ──────────────────────────────────────────────────────────
    if not request.force_refresh:
        cached = get_cached_analysis(user_id, request.repo_path)
        if cached:
            logger.info(f"[Manager API] Cache HIT for {request.repo_path}")

            # Pull latest commits — non-blocking even if repo isn't cloned yet
            new_commits = False
            if repo_session.has_repo(request.repo_path):
                import asyncio
                from app.core.repo_session import _git_pull
                new_commits = await asyncio.get_event_loop().run_in_executor(
                    None, _git_pull, repo_session.local_path
                )

            if not new_commits:
                # Fully cached — return immediately, no agent work
                logger.info(f"[Manager API] Returning cached result (no new commits)")
                cached["incremental"] = False
                return ManagerResponse(**cached)

            # New commits arrived — refresh only the trace agent (git history)
            logger.info(f"[Manager API] New commits detected — refreshing trace only")
            try:
                local_path = repo_session.local_path
                from app.agents.trace_agent import run_trace
                fresh_trace = await run_trace(local_path, request.query)
                cached["trace"] = fresh_trace
                cached["statuses"]["trace"] = "success"
                cached["cached"] = True
                cached["incremental"] = True
                # Persist the updated result
                logger.info(f"[Manager API] Saving incremental update to database")
                save_analysis(user_id, {**cached, "repo_path": request.repo_path})
                return ManagerResponse(**cached)
            except Exception as e:
                logger.warning(f"[Manager API] Trace refresh failed, returning stale cache: {e}")
                cached["incremental"] = False
                return ManagerResponse(**cached)

    # ── Full analysis (no cache / force_refresh) ──────────────────────────────
    logger.info(f"[Manager API] Running full analysis (cache miss or force_refresh)")
    try:
        result = await run_manager(
            repo_path=request.repo_path,
            query=request.query,
            agents=request.agents,
            generate_video=request.generate_video,
        )
        result["cached"] = False
        result["incremental"] = False
        
        logger.info(f"[Manager API] Analysis completed successfully, saving to database...")
        save_analysis(user_id, result)
        logger.info(f"[Manager API] Returning analysis result to frontend")
        
        return ManagerResponse(**result)
    except Exception as e:
        logger.error(f"[Manager API] Analysis failed: {e}", exc_info=True)
        raise HTTPException(status_code=500, detail=str(e))


@router.get("/session")
def get_session(user_id: str = Depends(get_current_user)):
    from app.core.repo_session import repo_session
    return {
        "repo_url": repo_session.repo_url,
        "local_path": repo_session.local_path,
        "cached": repo_session.local_path is not None,
    }


@router.delete("/session")
def clear_session(user_id: str = Depends(get_current_user)):
    from app.core.repo_session import repo_session
    repo_session.clear()
    return {"message": "Session cleared."}
