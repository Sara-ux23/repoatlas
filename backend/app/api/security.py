"""
FastAPI router for the Security Agent.
"""

from fastapi import APIRouter, HTTPException
from pydantic import BaseModel
from typing import Optional

from app.agents.security_agent import run_security
from app.core.repo_session import repo_session

router = APIRouter(prefix="/security", tags=["Security Agent"])


class SecurityRequest(BaseModel):
    repo_path: Optional[str] = None  # Optional - uses backend session if not provided
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

    - repo_path: optional path/URL (uses backend session if omitted)
    - query: focus area (default: 'full security audit')
    """
    try:
        # Use session repo if no path provided
        if request.repo_path:
            repo_path = request.repo_path
        elif repo_session.local_path:
            repo_path = repo_session.local_path
        else:
            raise HTTPException(status_code=400, detail="No repository loaded. Please analyze a repo first on the Product page.")
        
        result = await run_security(repo_path, request.query)
        return SecurityResponse(**result)
    except HTTPException:
        raise
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))
