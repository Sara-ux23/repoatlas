"""Repo Session — clone once, reuse across all agents."""

import asyncio
import shutil
import logging
import json
from pathlib import Path

logger = logging.getLogger(__name__)

SESSION_FILE = Path(__file__).resolve().parent.parent.parent / ".repoatlas_session.json"


class RepoSession:
    def __init__(self):
        self.repo_url = None
        self.local_path = None
        self._lock = asyncio.Lock()
        self._load_from_disk()

    def _load_from_disk(self):
        """Load session from disk on startup."""
        try:
            if SESSION_FILE.exists():
                data = json.loads(SESSION_FILE.read_text())
                self.repo_url = data.get("repo_url")
                self.local_path = data.get("local_path")
                # Verify path still exists
                if self.local_path and not Path(self.local_path).exists():
                    self.repo_url = None
                    self.local_path = None
                    SESSION_FILE.unlink(missing_ok=True)
                else:
                    logger.info(f"[Session] Restored from disk: {self.repo_url}")
        except Exception as e:
            logger.warning(f"[Session] Could not load from disk: {e}")

    def _save_to_disk(self):
        """Save session to disk for persistence."""
        try:
            SESSION_FILE.write_text(json.dumps({
                "repo_url": self.repo_url,
                "local_path": self.local_path
            }))
            logger.info(f"[Session] Saved to disk: {self.repo_url}")
        except Exception as e:
            logger.warning(f"[Session] Could not save to disk: {e}")

    async def load(self, repo_url: str) -> str:
        async with self._lock:
            if self.repo_url == repo_url and self.local_path and Path(self.local_path).exists():
                logger.info(f"[Session] Reusing: {self.local_path}")
                return self.local_path

            if self.local_path and Path(self.local_path).exists():
                # Only delete if it was a cloned temp repository (URL-based)
                if self.repo_url and (self.repo_url.startswith("http://") or self.repo_url.startswith("https://")):
                    shutil.rmtree(self.local_path, ignore_errors=True)

            if repo_url.startswith("http://") or repo_url.startswith("https://"):
                # Lazy import to avoid module-level hang
                from app.tools.github_tools import clone_repo
                local_path = await asyncio.get_event_loop().run_in_executor(None, clone_repo, repo_url)
            else:
                local_path = repo_url

            self.repo_url = repo_url
            self.local_path = local_path
            self._save_to_disk()
            logger.info(f"[Session] Ready: {local_path}")
            return local_path

    def clear(self):
        if self.local_path and Path(self.local_path).exists():
            # Only delete if it was a cloned temp repository (URL-based)
            if self.repo_url and (self.repo_url.startswith("http://") or self.repo_url.startswith("https://")):
                shutil.rmtree(self.local_path, ignore_errors=True)
        self.repo_url = None
        self.local_path = None
        SESSION_FILE.unlink(missing_ok=True)
        logger.info("[Session] Cleared")


repo_session = RepoSession()
