"""
FastAPI router for the Trace Agent.
"""

from fastapi import APIRouter, HTTPException
from pydantic import BaseModel
from typing import Optional

from app.agents.trace_agent import run_trace

router = APIRouter(prefix="/trace", tags=["Trace Agent"])


class TraceRequest(BaseModel):
    repo_path: str
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

    - repo_path: local path or GitHub URL
    - query: what you want to know (e.g. 'who changed auth.py most?')
    - file_path: optional file to trace (e.g. 'src/auth.py')
    """
    try:
        result = await run_trace(request.repo_path, request.query, request.file_path)
        return TraceResponse(**result)
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))
