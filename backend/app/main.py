from pathlib import Path

from dotenv import load_dotenv
from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from fastapi.staticfiles import StaticFiles

load_dotenv(Path(__file__).resolve().parent.parent / ".env")

from app.api.explorer import router as explorer_router
from app.api.trace import router as trace_router
from app.api.security import router as security_router
from app.api.visualization import router as viz_router
from app.api.manager import router as manager_router
from app.api.user_query import router as user_query_router
from app.api.video_recording import router as video_recording_router
from app.api.history import router as history_router
from app.api.chat import router as chat_router

app = FastAPI(title="RepoAtlas AI", version="0.1.0")

import os

frontend_url = os.getenv("FRONTEND_URL", "https://repoatlas-opal.vercel.app")

app.add_middleware(
    CORSMiddleware,
    allow_origins=[
        frontend_url,
        "http://localhost:3000",
        "http://127.0.0.1:3000",
        "http://localhost:3001",
        "http://127.0.0.1:3001",
    ],
    allow_origin_regex=r"https://.*\.vercel\.app",
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# Serve generated videos / static files
static_dir = Path(__file__).resolve().parent.parent / "static"
static_dir.mkdir(exist_ok=True)
app.mount("/static", StaticFiles(directory=str(static_dir)), name="static")

app.include_router(explorer_router)
app.include_router(trace_router)
app.include_router(security_router)
app.include_router(viz_router)
app.include_router(manager_router)
app.include_router(user_query_router)
app.include_router(video_recording_router)
app.include_router(history_router)
app.include_router(chat_router)


@app.get("/")
def root():
    return {"status": "ok", "service": "repoatlas backend"}


@app.get("/health")
def health():
    return {"status": "healthy"}

