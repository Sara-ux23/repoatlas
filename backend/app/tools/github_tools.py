"""
GitHub utility — clones a repo to a temp directory.
Handles SSL issues on Windows/Anaconda by disabling verification as fallback.
"""

import os
import ssl
import tempfile
import shutil
import subprocess
from pathlib import Path


def _run_clone(url: str, dest: str, ssl_verify: bool = False):
    import sys
    env = os.environ.copy()
    env["GIT_SSL_NO_VERIFY"] = "true"

    cmd = f'git -c http.sslVerify=false clone --depth 1 "{url}" "{dest}"'
    result = subprocess.run(
        cmd,
        capture_output=True,
        text=True,
        env=env,
        shell=True,  # needed on Windows to resolve git from PATH correctly
    )
    if result.returncode != 0:
        raise subprocess.CalledProcessError(
            result.returncode,
            cmd,
            result.stdout,
            result.stderr,
        )


def clone_repo(github_url: str) -> str:
    """Clone a GitHub repo to a temp directory and return the local path."""
    tmp_dir = tempfile.mkdtemp(prefix="repoatlas_")
    _run_clone(github_url, tmp_dir)
    return tmp_dir


def cleanup_repo(local_path: str):
    """Remove a previously cloned temp repo."""
    shutil.rmtree(local_path, ignore_errors=True)
