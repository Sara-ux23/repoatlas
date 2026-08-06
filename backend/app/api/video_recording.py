"""
Isolated API endpoints for the repo walkthrough video-recording pipeline.
Mounted at /video/* — no overlap with any other route.
"""

import logging
from fastapi import APIRouter, BackgroundTasks, HTTPException
from pydantic import BaseModel
from typing import Optional

from app.services.video_recorder import video_recorder

router = APIRouter(prefix="/video", tags=["video-recording"])
logger = logging.getLogger(__name__)


# ── Schemas ───────────────────────────────────────────────────────────────────

class RecordRequest(BaseModel):
    repo_url: str
    base_url: Optional[str] = "http://localhost:3001"


class RecordResponse(BaseModel):
    status: str          # "exists" | "recording" | "ready" | "not_found"
    repo_id: str
    video_url: Optional[str] = None
    message: str


# ── Routes ───────────────────────────────────────────────────────────────────

@router.post("/record", response_model=RecordResponse)
async def trigger_recording(req: RecordRequest, background: BackgroundTasks):
    """
    Start a recording job for a repo.
    - Returns immediately with status="exists" + video_url if cached.
    - Returns status="recording" + repo_id if a new job was queued.
    """
    repo_id = video_recorder.get_repo_id(req.repo_url)

    if video_recorder.video_exists(repo_id):
        logger.info(f"[video] Cache hit for {repo_id}")
        return RecordResponse(
            status="exists",
            repo_id=repo_id,
            video_url=video_recorder.get_video_url(repo_id),
            message="Cached recording found.",
        )

    logger.info(f"[video] Queuing recording for {repo_id}")
    background.add_task(
        video_recorder.record_repo_walkthrough,
        repo_id,
        req.base_url,
    )
    return RecordResponse(
        status="recording",
        repo_id=repo_id,
        message="Recording started — poll /video/status/{repo_id} until ready.",
    )


@router.get("/status/{repo_id}", response_model=RecordResponse)
async def check_status(repo_id: str):
    """Poll whether a recording is ready."""
    if video_recorder.video_exists(repo_id):
        return RecordResponse(
            status="ready",
            repo_id=repo_id,
            video_url=video_recorder.get_video_url(repo_id),
            message="Recording is ready.",
        )
    return RecordResponse(
        status="not_found",
        repo_id=repo_id,
        message="Recording not yet available.",
    )


@router.delete("/recording/{repo_id}")
async def delete_recording(repo_id: str):
    """Invalidate a cached recording so it gets re-generated on next request."""
    path = video_recorder._video_path(repo_id)
    if path.exists():
        path.unlink()
        return {"status": "deleted", "repo_id": repo_id}
    return {"status": "not_found", "repo_id": repo_id}
