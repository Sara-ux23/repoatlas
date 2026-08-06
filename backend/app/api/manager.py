from fastapi import APIRouter, HTTPException, Depends
from pydantic import BaseModel
from typing import Optional, Any

from app.auth.dependencies import get_current_user
from app.db.crud import save_analysis

router = APIRouter(prefix="/manager", tags=["Manager Agent"])

class ManagerRequest(BaseModel):
    repo_path: str
    query: str = "full analysis"
    agents: Optional[list[str]] = None
    generate_video: bool = False

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

@router.post("/", response_model=ManagerResponse)
async def manager_analyze(
    request: ManagerRequest,
    user_id: str = Depends(get_current_user),
):
    from app.agents.manager_agent import run_manager
    try:
        result = await run_manager(
            repo_path=request.repo_path,
            query=request.query,
            agents=request.agents,
            generate_video=request.generate_video,
        )
        # Persist analysis to Supabase (non-blocking — errors are logged, not raised)
        save_analysis(user_id, result)
        return ManagerResponse(**result)
    except Exception as e:
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
