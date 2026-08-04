"""
FastAPI router for the Security Agent.
"""

from fastapi import APIRouter, HTTPException
from pydantic import BaseModel
from typing import Optional

from app.agents.security_agent import run_security

router = APIRouter(prefix="/security", tags=["Security Agent"])


class SecurityRequest(BaseModel):
    repo_path: str
    query: str = "full security audit"


class SecurityResponse(BaseModel):
    risk_rating: str        # CRITICAL / HIGH / MEDIUM / LOW / SAFE
    score: dict             # counts by severity + total
    findings: dict          # detailed findings by category
    report: str             # compact text report
    expert_analysis: str    # AI cybersecurity expert analysis


@router.post("/", response_model=SecurityResponse)
async def security_scan(request: SecurityRequest):
    """
    Run a full security audit on a repository.

    - repo_path: local path or GitHub URL
    - query: focus area (default: 'full security audit')
    """
    try:
        result = await run_security(request.repo_path, request.query)
        return SecurityResponse(**result)
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))
