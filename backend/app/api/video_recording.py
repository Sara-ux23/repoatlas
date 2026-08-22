"""
Isolated API endpoints for the repo walkthrough video-recording pipeline.
Records a walkthrough of the ACTUAL LOADED REPOSITORY's frontend UI
using headless Chrome + Playwright.
"""

import logging
from pathlib import Path
from typing import Optional, Dict, Any

from fastapi import APIRouter, BackgroundTasks
from fastapi.responses import FileResponse, Response
from pydantic import BaseModel

from app.services.video_recorder import video_recorder

router = APIRouter(prefix="/video", tags=["video-recording"])
logger = logging.getLogger(__name__)


class RecordRequest(BaseModel):
    repo_url: str
    base_url: Optional[str] = None
    session_data: Optional[Dict[str, Any]] = None
    force_refresh: Optional[bool] = False


class RecordResponse(BaseModel):
    status: str          # "exists" | "recording" | "ready" | "not_found"
    repo_id: str
    video_url: Optional[str] = None
    message: str


async def _run_recording(
    repo_id: str,
    repo_url: str,
    base_url: str,
    session_data: Optional[Dict[str, Any]],
) -> None:
    """Background task wrapper — logs errors instead of swallowing them."""
    try:
        await video_recorder.record_repo_walkthrough(
            repo_id,
            repo_url=repo_url,
            base_url=base_url,
            session_data=session_data,
        )
        logger.info(f"[video] Recording complete for {repo_id}")
    except Exception as e:
        logger.error(f"[video] Recording FAILED for {repo_id}: {e}", exc_info=True)


@router.post("/record", response_model=RecordResponse)
async def trigger_recording(req: RecordRequest, background: BackgroundTasks):
    """
    Start recording a walkthrough of the actual repo UI.
    Returns status: ready immediately so the frontend never times out.
    """
    repo_id = video_recorder.get_repo_id(req.repo_url)

    if req.force_refresh:
        video_recorder.clear_recording(repo_id)

    video_recorder.ensure_recording_exists(repo_id)

    base_url = req.base_url or os.getenv("FRONTEND_URL", "https://repoatlas-opal.vercel.app")
    logger.info(f"[video] Instant ready for {repo_id} ({req.repo_url}), scheduling background refresh...")
    background.add_task(_run_recording, repo_id, req.repo_url, base_url, req.session_data)

    return RecordResponse(
        status="ready",
        repo_id=repo_id,
        video_url=video_recorder.get_video_url(repo_id),
        message="Recording ready.",
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


@router.get("/stream/{repo_id}")
async def stream_video(repo_id: str):
    """
    Stream the generated .webm video file directly to the browser.
    """
    video_path = video_recorder.get_video_file_path(repo_id)
    if not video_path or not video_path.exists():
        video_recorder.clear_recording(repo_id)
        return Response(status_code=404, media_type="video/webm")

    return FileResponse(
        path=str(video_path),
        media_type="video/webm",
        headers={
            "Cache-Control": "no-cache, no-store, must-revalidate",
            "Pragma": "no-cache",
            "Expires": "0",
        },
    )


@router.delete("/recording/{repo_id}")
async def delete_recording(repo_id: str):
    """Invalidate a cached recording so it gets re-generated."""
    video_recorder.clear_recording(repo_id)
    return {"status": "deleted", "repo_id": repo_id}
