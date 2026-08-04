"""
FastAPI router for the Explorer Agent.
"""

from fastapi import APIRouter, HTTPException
from pydantic import BaseModel

from app.agents.explorer_agent import run_explorer

router = APIRouter(prefix="/explorer", tags=["Explorer Agent"])


class ExploreRequest(BaseModel):
    repo_path: str      # local path or GitHub URL
    query: str          # natural language question


class ExploreResponse(BaseModel):
    result: str


@router.post("/", response_model=ExploreResponse)
async def explore_repo(request: ExploreRequest):
    """
    Trigger the Explorer Agent on a repository.

    - repo_path: path to a locally cloned repo
    - query: what you want to understand (e.g. 'explain the folder structure')
    """
    try:
        result = await run_explorer(request.repo_path, request.query)
        return ExploreResponse(result=result)
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))
