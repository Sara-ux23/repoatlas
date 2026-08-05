"""
FastAPI router for the Visualization Agent.
"""

from fastapi import APIRouter, HTTPException
from pydantic import BaseModel
from typing import Optional

from app.agents.visualization_agent import run_visualization
from app.core.repo_session import repo_session

router = APIRouter(prefix="/visualization", tags=["Visualization Agent"])


class VizRequest(BaseModel):
    repo_path: Optional[str] = None  # Optional - uses backend session if not provided
    query: str = "give me a full repo overview"
    generate_video: bool = True


class VizResponse(BaseModel):
    folder_tree: dict
    language_breakdown: list
    dependency_graph: dict
    commit_heatmap: list
    contributor_activity: list
    narrative: str
    summary: str
    video_url: Optional[str] = None


@router.post("/", response_model=VizResponse)
async def visualize_repo(request: VizRequest):
    try:
        # Use session repo if no path provided
        if request.repo_path:
            repo_path = request.repo_path
        elif repo_session.local_path:
            repo_path = repo_session.local_path
        else:
            raise HTTPException(status_code=400, detail="No repository loaded. Please analyze a repo first on the Product page.")
        
        result = await run_visualization(repo_path, request.query, request.generate_video)
        return VizResponse(**result)
    except HTTPException:
        raise
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))
