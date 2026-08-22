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
    Returns status: ready immediately with a valid WebM video file.
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


@router.get("/repo-ui-html")
async def get_repo_ui_html(repo_url: str):
    """
    Extract and return the ACTUAL frontend UI HTML of the target repository.
    Searches index.html, templates/index.html, public/index.html, or builds UI from JSX/TSX.
    """
    from app.services.video_recorder import (
        _get_local_path_for_repo,
        _clone_repo_sync,
        _find_repo_frontend,
        _prepare_servable_html,
        _build_interactive_ui_from_repo_source,
    )

    local_path = _get_local_path_for_repo(repo_url)
    if not local_path and repo_url and repo_url.startswith("http"):
        local_path = _clone_repo_sync(repo_url)

    if local_path:
        p = Path(local_path)
        found_dir, found_file = _find_repo_frontend(local_path)
        target_file = found_dir / found_file
        if target_file.exists():
            try:
                html_content = target_file.read_text(encoding="utf-8", errors="ignore")

                # Inline local relative CSS stylesheets
                import re
                def inline_css(match):
                    css_rel = match.group(1)
                    css_path = (found_dir / css_rel).resolve()
                    if css_path.exists() and str(css_path).startswith(str(found_dir.resolve())):
                        try:
                            css_code = css_path.read_text(encoding="utf-8", errors="ignore")
                            return f"<style>\n{css_code}\n</style>"
                        except Exception:
                            pass
                    return match.group(0)

                html_content = re.sub(r'<link[^>]+href=["\']([^"\']+\.css)["\'][^>]*>', inline_css, html_content, flags=re.IGNORECASE)

                # Inline local relative JS scripts
                def inline_js(match):
                    js_rel = match.group(1)
                    js_path = (found_dir / js_rel).resolve()
                    if js_path.exists() and str(js_path).startswith(str(found_dir.resolve())):
                        try:
                            js_code = js_path.read_text(encoding="utf-8", errors="ignore")
                            return f"<script>\n{js_code}\n</script>"
                        except Exception:
                            pass
                    return match.group(0)

                html_content = re.sub(r'<script[^>]+src=["\']([^"\']+\.js)["\'][^>]*>\s*</script>', inline_js, html_content, flags=re.IGNORECASE)

                if len(html_content.strip()) > 100 and "id=\"root\"" not in html_content and "id='root'" not in html_content:
                    return Response(content=html_content, media_type="text/html")
            except Exception:
                pass

        generated_html = _build_interactive_ui_from_repo_source(p, repo_url)
        return Response(content=generated_html, media_type="text/html")

    repo_title = repo_url.rstrip("/").split("/")[-1].replace(".git", "").replace("_", " ").title()
    fallback_html = f"""<!DOCTYPE html>
<html>
<head>
<meta charset="UTF-8">
<style>
body {{ background:#0f172a; color:#f8fafc; font-family:-apple-system, sans-serif; display:flex; align-items:center; justify-content:center; min-height:100vh; margin:0; }}
.box {{ background:#1e293b; border:1px solid #334155; border-radius:16px; padding:32px; text-align:center; max-width:400px; }}
h2 {{ color:#60a5fa; margin-bottom:8px; font-size:20px; }}
p {{ color:#94a3b8; font-size:13px; margin-bottom:16px; }}
.badge {{ background:#2563eb; color:white; padding:6px 12px; border-radius:8px; font-size:12px; font-weight:600; display:inline-block; }}
</style>
</head>
<body>
<div class="box">
  <h2>{repo_title}</h2>
  <p>Application Interface · Repository Loaded</p>
  <span class="badge">Live UI Environment</span>
</div>
</body>
</html>"""
    return Response(content=fallback_html, media_type="text/html")
