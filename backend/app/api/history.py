"""History API — returns past analysis sessions for the authenticated user."""

from fastapi import APIRouter, Depends, HTTPException
from pydantic import BaseModel
from typing import Optional, Any
from datetime import datetime

from app.auth.dependencies import get_current_user
from app.db.crud import get_user_analyses, get_analysis_by_id

router = APIRouter(prefix="/history", tags=["History"])


class AnalysisSummary(BaseModel):
    id: str
    repo_url: str
    query: Optional[str] = None
    agents_run: Optional[list[str]] = None
    statuses: Optional[dict] = None
    executive_summary: Optional[str] = None
    created_at: datetime


class AnalysisDetail(BaseModel):
    id: str
    repo_url: str
    query: Optional[str] = None
    agents_run: Optional[list[str]] = None
    statuses: Optional[dict] = None
    executive_summary: Optional[str] = None
    explorer_result: Optional[Any] = None
    trace_result: Optional[Any] = None
    security_result: Optional[Any] = None
    visualization_result: Optional[Any] = None
    created_at: datetime


@router.get("/", response_model=list[AnalysisSummary])
def get_history(user_id: str = Depends(get_current_user)):
    """Return all past analyses for the logged-in user (newest first)."""
    return get_user_analyses(user_id)


@router.get("/{analysis_id}", response_model=AnalysisDetail)
def get_analysis(analysis_id: str, user_id: str = Depends(get_current_user)):
    """Return full detail of a single past analysis (scoped to the logged-in user)."""
    result = get_analysis_by_id(analysis_id, user_id)
    if not result:
        raise HTTPException(status_code=404, detail="Analysis not found.")
    return result
