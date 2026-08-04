from pathlib import Path

from dotenv import load_dotenv
from fastapi import FastAPI
from fastapi.staticfiles import StaticFiles

load_dotenv(Path(__file__).resolve().parent.parent / ".env")

from app.api.explorer import router as explorer_router
from app.api.trace import router as trace_router
from app.api.security import router as security_router
from app.api.visualization import router as viz_router
from app.api.manager import router as manager_router

app = FastAPI(title="RepoAtlas AI", version="0.1.0")

# Serve generated videos
static_dir = Path(__file__).resolve().parent.parent / "static"
static_dir.mkdir(exist_ok=True)
app.mount("/static", StaticFiles(directory=str(static_dir)), name="static")

app.include_router(explorer_router)
app.include_router(trace_router)
app.include_router(security_router)
app.include_router(viz_router)
app.include_router(manager_router)


@app.get("/health")
def health():
    return {"status": "ok"}
