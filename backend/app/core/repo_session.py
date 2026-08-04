"""Repo Session — clone once, reuse across all agents."""

import asyncio
import shutil
import logging
from pathlib import Path

logger = logging.getLogger(__name__)


class RepoSession:
    def __init__(self):
        self.repo_url = None
        self.local_path = None
        self._lock = asyncio.Lock()

    async def load(self, repo_url: str) -> str:
        async with self._lock:
            if self.repo_url == repo_url and self.local_path and Path(self.local_path).exists():
                logger.info(f"[Session] Reusing: {self.local_path}")
                return self.local_path

            if self.local_path and Path(self.local_path).exists():
                shutil.rmtree(self.local_path, ignore_errors=True)

            if repo_url.startswith("http://") or repo_url.startswith("https://"):
                # Lazy import to avoid module-level hang
                from app.tools.github_tools import clone_repo
                local_path = await asyncio.get_event_loop().run_in_executor(None, clone_repo, repo_url)
            else:
                local_path = repo_url

            self.repo_url = repo_url
            self.local_path = local_path
            logger.info(f"[Session] Ready: {local_path}")
            return local_path

    def clear(self):
        if self.local_path and Path(self.local_path).exists():
            shutil.rmtree(self.local_path, ignore_errors=True)
        self.repo_url = None
        self.local_path = None


repo_session = RepoSession()
