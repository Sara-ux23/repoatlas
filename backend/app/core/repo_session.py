"""Repo Session — clone once, git-pull on repeat, reuse across all agents."""

import asyncio
import subprocess
import shutil
import logging
import json
import os
from pathlib import Path

logger = logging.getLogger(__name__)

SESSION_FILE = Path(__file__).resolve().parent.parent.parent / ".repoatlas_session.json"


def _git_pull(local_path: str) -> bool:
    """Run `git pull` in the cloned directory. Returns True if new commits came in."""
    try:
        env = os.environ.copy()
        env["GIT_SSL_NO_VERIFY"] = "true"
        before = subprocess.run(
            "git rev-parse HEAD",
            shell=True, capture_output=True, text=True, cwd=local_path, env=env,
        ).stdout.strip()

        subprocess.run(
            "git -c http.sslVerify=false pull --ff-only --quiet",
            shell=True, capture_output=True, text=True, cwd=local_path, env=env, timeout=15
        )

        after = subprocess.run(
            "git rev-parse HEAD",
            shell=True, capture_output=True, text=True, cwd=local_path, env=env,
        ).stdout.strip()

        new_commits = before != after
        if new_commits:
            logger.info(f"[Session] git pull brought new commits ({before[:7]} → {after[:7]})")
        else:
            logger.info(f"[Session] git pull — already up to date ({after[:7]})")
        return new_commits
    except Exception as e:
        logger.warning(f"[Session] git pull failed (continuing with existing clone): {e}")
        return False


def _normalize_repo_url(url: str) -> str:
    if not url:
        return ""
    u = url.strip()
    if os.path.exists(u) or Path(u).is_absolute():
        return u
    if not u.startswith("http://") and not u.startswith("https://"):
        if "/" in u and not u.startswith("/"):
            u = f"https://github.com/{u}"
    return u.rstrip("/")


class RepoSession:
    def __init__(self):
        self.repo_url = None
        self.local_path = None
        self._lock = asyncio.Lock()
        self._load_from_disk()

    def _load_from_disk(self):
        try:
            if SESSION_FILE.exists():
                data = json.loads(SESSION_FILE.read_text())
                self.repo_url = data.get("repo_url")
                self.local_path = data.get("local_path")
                if self.local_path and not Path(self.local_path).exists():
                    self.repo_url = None
                    self.local_path = None
                    SESSION_FILE.unlink(missing_ok=True)
                else:
                    logger.info(f"[Session] Restored from disk: {self.repo_url}")
        except Exception as e:
            logger.warning(f"[Session] Could not load from disk: {e}")

    def _save_to_disk(self):
        try:
            SESSION_FILE.write_text(json.dumps({
                "repo_url": self.repo_url,
                "local_path": self.local_path,
            }))
        except Exception as e:
            logger.warning(f"[Session] Could not save to disk: {e}")

    async def load(self, raw_repo_url: str) -> str:
        if not raw_repo_url:
            return self.local_path or ""

        if os.path.exists(raw_repo_url) and Path(raw_repo_url).is_dir():
            return raw_repo_url

        repo_url = _normalize_repo_url(raw_repo_url)
        async with self._lock:
            local_exists = self.local_path and Path(self.local_path).exists()

            # ── Same repo already on disk → just git pull ─────────────────────
            if self.repo_url and repo_url and (
                self.repo_url == repo_url or
                self.repo_url.lower().rstrip("/").endswith(repo_url.lower().replace("https://github.com/", "").rstrip("/")) or
                repo_url.lower().rstrip("/").endswith(self.repo_url.lower().replace("https://github.com/", "").rstrip("/"))
            ) and local_exists:
                logger.info(f"[Session] Repo already cloned at {self.local_path} — pulling latest")
                await asyncio.get_event_loop().run_in_executor(None, _git_pull, self.local_path)
                return self.local_path

            # ── Different repo → delete old clone, clone fresh ────────────────
            if local_exists and self.repo_url != repo_url:
                if self.repo_url and (
                    self.repo_url.startswith("http://") or self.repo_url.startswith("https://")
                ):
                    shutil.rmtree(self.local_path, ignore_errors=True)

            if repo_url.startswith("http://") or repo_url.startswith("https://"):
                from app.tools.github_tools import clone_repo
                local_path = await asyncio.get_event_loop().run_in_executor(None, clone_repo, repo_url)
            else:
                local_path = repo_url

            self.repo_url = repo_url
            self.local_path = local_path
            self._save_to_disk()
            logger.info(f"[Session] Cloned fresh: {local_path}")
            return local_path

    def has_repo(self, raw_repo_url: str) -> bool:
        """True if this repo is already cloned and on disk."""
        repo_url = _normalize_repo_url(raw_repo_url)
        if not self.repo_url or not self.local_path or not Path(self.local_path).exists():
            return False
        return (
            self.repo_url == repo_url or
            self.repo_url.lower().rstrip("/").endswith(repo_url.lower().replace("https://github.com/", "").rstrip("/")) or
            repo_url.lower().rstrip("/").endswith(self.repo_url.lower().replace("https://github.com/", "").rstrip("/"))
        )

    def clear(self):
        if self.local_path and Path(self.local_path).exists():
            if self.repo_url and (
                self.repo_url.startswith("http://") or self.repo_url.startswith("https://")
            ):
                shutil.rmtree(self.local_path, ignore_errors=True)
        self.repo_url = None
        self.local_path = None
        SESSION_FILE.unlink(missing_ok=True)
        logger.info("[Session] Cleared")


repo_session = RepoSession()
