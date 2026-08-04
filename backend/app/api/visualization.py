"""
FastAPI router for the Visualization Agent.
"""

from fastapi import APIRouter, HTTPException
from pydantic import BaseModel
from typing import Optional

from app.agents.visualization_agent import run_visualization

router = APIRouter(prefix="/visualization", tags=["Visualization Agent"])


class VizRequest(BaseModel):
    repo_path: str
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
        result = await run_visualization(request.repo_path, request.query, request.generate_video)
        return VizResponse(**result)
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))
