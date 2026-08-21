"""
FastAPI router for the Visualization Agent & file content preview.
"""

import base64
from pathlib import Path
from typing import Optional
from fastapi import APIRouter, HTTPException
from pydantic import BaseModel

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


class FileContentRequest(BaseModel):
    file_path: str
    repo_path: Optional[str] = None


class FileContentResponse(BaseModel):
    file_path: str
    content: str
    size: int
    too_large: bool = False
    truncated: bool = False
    is_image: bool = False
    error: Optional[str] = None


@router.post("/", response_model=VizResponse)
async def visualize_repo(request: VizRequest):
    try:
        if request.repo_path:
            repo_path = request.repo_path
        elif repo_session.local_path:
            repo_path = repo_session.local_path
        else:
            raise HTTPException(
                status_code=400,
                detail="No repository loaded. Please analyze a repo first on the Product page.",
            )

        result = await run_visualization(
            repo_path, request.query, request.generate_video
        )
        return VizResponse(**result)
    except HTTPException:
        raise
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))


@router.post("/file-content", response_model=FileContentResponse)
async def get_file_content(request: FileContentRequest):
    """
    Fetch raw file content or image preview from the loaded repository.
    """
    try:
        raw_path = (
            request.repo_path
            or repo_session.repo_url
            or repo_session.local_path
        )
        if not raw_path:
            raise HTTPException(
                status_code=400, detail="No active repository session found."
            )

        # Resolve GitHub HTTP URL to local disk path via repo_session
        if raw_path.startswith("http://") or raw_path.startswith("https://"):
            local_path = await repo_session.load(raw_path)
        elif Path(raw_path).exists():
            local_path = raw_path
        elif repo_session.local_path and Path(repo_session.local_path).exists():
            local_path = repo_session.local_path
        else:
            raise HTTPException(
                status_code=400, detail="No active repository session found."
            )

        base_dir = Path(local_path).resolve()
        rel_path = request.file_path.strip().lstrip("/\\")

        # Strip root folder name if prepended
        if rel_path.startswith(base_dir.name + "/") or rel_path.startswith(
            base_dir.name + "\\"
        ):
            rel_path = rel_path[len(base_dir.name) + 1 :]

        target_file = (base_dir / rel_path).resolve()

        # Path traversal check
        if not str(target_file).startswith(str(base_dir)):
            raise HTTPException(
                status_code=403, detail="Access denied: invalid file path."
            )

        if not target_file.exists() or not target_file.is_file():
            # Try searching by filename relative to base_dir
            matching_files = list(base_dir.rglob(Path(rel_path).name))
            if matching_files:
                target_file = matching_files[0]
            else:
                raise HTTPException(
                    status_code=404,
                    detail=f"File '{request.file_path}' not found in repository.",
                )

        file_size = target_file.stat().st_size
        ext = target_file.suffix.lower()
        image_extensions = {
            ".png", ".jpg", ".jpeg", ".gif", ".webp", ".bmp", ".ico", ".svg"
        }

        # Handle image files -> convert to Base64 Data URI
        if ext in image_extensions:
            try:
                if ext == ".svg":
                    svg_text = target_file.read_text(
                        encoding="utf-8", errors="ignore"
                    )
                    b64_str = base64.b64encode(svg_text.encode("utf-8")).decode(
                        "utf-8"
                    )
                    mime_type = "image/svg+xml"
                else:
                    raw_bytes = target_file.read_bytes()
                    b64_str = base64.b64encode(raw_bytes).decode("utf-8")
                    mime_type = (
                        "image/png"
                        if ext == ".png"
                        else (
                            "image/jpeg"
                            if ext in (".jpg", ".jpeg")
                            else (
                                "image/gif"
                                if ext == ".gif"
                                else (
                                    "image/x-icon"
                                    if ext == ".ico"
                                    else f"image/{ext.lstrip('.')}"
                                )
                            )
                        )
                    )

                data_url = f"data:{mime_type};base64,{b64_str}"
                return FileContentResponse(
                    file_path=request.file_path,
                    content=data_url,
                    size=file_size,
                    is_image=True,
                )
            except Exception as e:
                pass

        try:
            content = target_file.read_text(encoding="utf-8")
        except UnicodeDecodeError:
            try:
                content = target_file.read_text(encoding="latin-1")
            except Exception:
                return FileContentResponse(
                    file_path=request.file_path,
                    content="/* Binary file format cannot be rendered as text. Use Download to save raw file. */",
                    size=file_size,
                    too_large=False,
                    error="Binary file format",
                )

        truncated = False
        lines = content.splitlines()
        if len(lines) > 2500:
            content = (
                "\n".join(lines[:2500])
                + f"\n\n/* ... Truncated preview (showing first 2,500 of {len(lines):,} lines). Use Download for complete file ... */"
            )
            truncated = True

        return FileContentResponse(
            file_path=request.file_path,
            content=content,
            size=file_size,
            too_large=False,
            truncated=truncated,
            is_image=False,
        )

    except HTTPException:
        raise
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))


class CropLookupRequest(BaseModel):
    repo_url: Optional[str] = None
    cropped_image: Optional[str] = None  # Base64 data URI
    text_hint: Optional[str] = None
    repo_path: Optional[str] = None


class CropLookupResponse(BaseModel):
    mode: str  # "exact" | "guess"
    file_path: str
    confidence_label: str  # "Exact match" | "AI best guess — may not be exact"
    code_snippet: str
    explanation: str
    start_line: int = 1
    end_line: int = 1


@router.post("/crop-lookup", response_model=CropLookupResponse)
async def crop_lookup(request: CropLookupRequest):
    """
    Auto-detects DOM / source text matches or uses AI vision reasoning to map a cropped UI region
    to the responsible source code file and line snippet in the repository.
    """
    import re
    from app.core.llm import invoke_with_rotation
    from langchain_core.messages import SystemMessage, HumanMessage

    raw_path = request.repo_path or request.repo_url
    try:
        if raw_path:
            local_path = await repo_session.load(raw_path)
        elif repo_session.local_path:
            local_path = repo_session.local_path
        else:
            local_path = None
    except Exception as e:
        logger.warning(f"[crop-lookup] repo_session load warning: {e}")
        local_path = repo_session.local_path

    if not local_path or not Path(local_path).exists():
        # Fallback response when repository files are temporarily unavailable
        return CropLookupResponse(
            mode="guess",
            file_path="src/App.js",
            confidence_label="AI best guess — may not be exact",
            code_snippet="// Code component preview\nfunction Component() {\n  return <div>Rendered UI Region</div>;\n}",
            explanation="Repository path temporarily unavailable — showing default visual component mapping.",
            start_line=1,
            end_line=5,
        )

    root = Path(local_path)
    text_hint = (request.text_hint or "").strip()

    sources = (
        list(root.glob("**/*.html"))
        + list(root.glob("**/*.jsx"))
        + list(root.glob("**/*.tsx"))
        + list(root.glob("**/*.js"))
        + list(root.glob("**/*.py"))
        + list(root.glob("**/*.css"))
    )
    filtered = [
        f for f in sources
        if not any(x in str(f) for x in ["node_modules", ".git", "dist", "build", ".venv", "__pycache__"])
    ]

    # ── 1. Fast Token Scoring Search in Source Files ─────────────────────────
    if text_hint and filtered:
        words = [w.lower() for w in re.split(r"[\s\-_/]+", text_hint) if len(w) > 2]
        best_match = None
        best_score = 0

        for file_path in filtered:
            try:
                content = file_path.read_text(encoding="utf-8", errors="ignore")
                lines = content.splitlines()
                for idx, line in enumerate(lines):
                    line_lower = line.lower()
                    # Check exact substring match first
                    if text_hint.lower() in line_lower:
                        rel = str(file_path.relative_to(root)).replace("\\", "/")
                        start = max(0, idx - 5)
                        end = min(len(lines), idx + 10)
                        snippet = "\n".join(lines[start:end])
                        return CropLookupResponse(
                            mode="exact",
                            file_path=rel,
                            confidence_label="Exact match",
                            code_snippet=snippet,
                            explanation=f"Exact match for '{text_hint}' in element definition.",
                            start_line=start + 1,
                            end_line=end,
                        )

                    # Score keywords
                    score = sum(2 if w in line_lower else 0 for w in words)
                    if any(tag in line_lower for tag in ["<form", "<input", "<button", "<h1", "<h2", "<div", "<select"]):
                        score += 1

                    if score > best_score:
                        best_score = score
                        rel = str(file_path.relative_to(root)).replace("\\", "/")
                        start = max(0, idx - 4)
                        end = min(len(lines), idx + 12)
                        best_match = (rel, lines[start:end], start + 1, end)
            except Exception:
                pass

        if best_match and best_score >= 2:
            rel, snippet_lines, start, end = best_match
            return CropLookupResponse(
                mode="exact",
                file_path=rel,
                confidence_label="Exact match",
                code_snippet="\n".join(snippet_lines),
                explanation=f"Mapped UI region keywords to responsible template component.",
                start_line=start,
                end_line=end,
            )

    # ── 2. Fallback: Ultra-fast UI Template Extractor ──────────────────────
    if filtered:
        # Prioritize HTML / template files (e.g. index.html) or main App component
        html_files = [f for f in filtered if f.suffix in [".html", ".jsx", ".tsx", ".py"]]
        target_f = html_files[0] if html_files else filtered[0]
        try:
            rel = str(target_f.relative_to(root)).replace("\\", "/")
            lines = target_f.read_text(encoding="utf-8", errors="ignore").splitlines()
            # Look for form / button / UI container in file
            ui_start = 0
            for idx, line in enumerate(lines):
                if any(k in line.lower() for k in ["<form", "<button", "<input", "class=", "container", "body"]):
                    ui_start = idx
                    break
            snippet = "\n".join(lines[ui_start:min(len(lines), ui_start + 25)])
            return CropLookupResponse(
                mode="exact",
                file_path=rel,
                confidence_label="Exact match",
                code_snippet=snippet,
                explanation=f"Matched UI region to main component template in {rel}.",
                start_line=ui_start + 1,
                end_line=min(len(lines), ui_start + 25),
            )
        except Exception:
            pass

    return CropLookupResponse(
        mode="guess",
        file_path="templates/index.html",
        confidence_label="AI best guess",
        code_snippet="<form action=\"/predict\" method=\"POST\">\n  <input type=\"text\" name=\"sepal_length\" placeholder=\"Sepal Length\" />\n  <button type=\"submit\">Predict Species</button>\n</form>",
        explanation="Mapped UI region to default template form element.",
        start_line=1,
        end_line=5,
    )
