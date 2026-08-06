"""
FastAPI router for the Explorer Agent.
"""

from fastapi import APIRouter, HTTPException, Depends
from pydantic import BaseModel
from typing import Optional

from app.agents.explorer_agent import run_explorer
from app.core.repo_session import repo_session
from app.auth.dependencies import get_current_user

router = APIRouter(prefix="/explorer", tags=["Explorer Agent"])


class ExploreRequest(BaseModel):
    repo_path: Optional[str] = None  # Optional - will use session if not provided
    query: str                        # natural language question


class ExploreResponse(BaseModel):
    result: str


@router.post("/", response_model=ExploreResponse)
async def explore_repo(
    request: ExploreRequest,
    user_id: str = Depends(get_current_user),
):
    """
    Trigger the Explorer Agent on a repository.

    - repo_path: optional path/URL (uses backend session if omitted)
    - query: what you want to understand (e.g. 'explain the folder structure')
    """
    try:
        # Use session repo if no path provided
        if request.repo_path:
            repo_path = request.repo_path
        elif repo_session.local_path:
            repo_path = repo_session.local_path
        else:
            raise HTTPException(
                status_code=400,
                detail="No repository loaded. Please analyze a repo first on the Product page.",
            )

        result = await run_explorer(repo_path, request.query)
        return ExploreResponse(result=result)
    except HTTPException:
        raise
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))
