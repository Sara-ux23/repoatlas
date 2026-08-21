"""
FastAPI router for the Trace Agent.
"""

from fastapi import APIRouter, HTTPException
from pydantic import BaseModel
from typing import Optional

from app.agents.trace_agent import run_trace, run_repo_comparison
from app.core.repo_session import repo_session

router = APIRouter(prefix="/trace", tags=["Trace Agent"])


class TraceRequest(BaseModel):
    repo_path: Optional[str] = None  # Optional - uses backend session if not provided
    query: str = "summarize the commit history"
    file_path: Optional[str] = None  # optional: trace a specific file


class TraceResponse(BaseModel):
    timeline: str           # ASCII timeline
    commits: list           # raw commit list
    contributors: list      # contributor stats
    branches: dict          # branch info
    file_history: list      # file-specific history (if requested)
    summary: str            # AI-generated analysis


class CompareRequest(BaseModel):
    repo_url_1: str
    repo_url_2: str


class CompareResponse(BaseModel):
    repo1: dict
    repo2: dict
    verdict: str


@router.post("/", response_model=TraceResponse)
async def trace_repo(request: TraceRequest):
    """
    Trace git history of a repository.
    """
    try:
        if request.repo_path:
            repo_path = request.repo_path
        elif repo_session.local_path:
            repo_path = repo_session.local_path
        else:
            raise HTTPException(status_code=400, detail="No repository loaded. Please analyze a repo first on the Product page.")

        result = await run_trace(repo_path, request.query, request.file_path)
        return TraceResponse(**result)
    except HTTPException:
        raise
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))


@router.post("/compare", response_model=CompareResponse)
async def compare_repos(request: CompareRequest):
    """
    Compare two repositories side-by-side across velocity, contributors, security, and complexity.
    """
    try:
        result = await run_repo_comparison(request.repo_url_1, request.repo_url_2)
        return CompareResponse(**result)
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))
