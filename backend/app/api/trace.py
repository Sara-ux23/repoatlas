"""
FastAPI router for the Trace Agent.
"""

from fastapi import APIRouter, HTTPException
from pydantic import BaseModel
from typing import Optional

from app.agents.trace_agent import run_trace
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


@router.post("/", response_model=TraceResponse)
async def trace_repo(request: TraceRequest):
    """
    Trace git history of a repository.

    - repo_path: optional path/URL (uses backend session if omitted)
    - query: what you want to know (e.g. 'who changed auth.py most?')
    - file_path: optional file to trace (e.g. 'src/auth.py')
    """
    try:
        # Use session repo if no path provided
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
