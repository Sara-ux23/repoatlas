"""
Git tools for the Trace Agent.
Parses commit history, diffs, and branch info from a local repo.
"""

import subprocess
from pathlib import Path
from typing import Optional
from langchain_core.tools import tool


def _git(args: list, cwd: str) -> str:
    result = subprocess.run(
        ["git"] + args,
        cwd=cwd,
        capture_output=True,
        text=True,
        env={"GIT_SSL_NO_VERIFY": "true", "PATH": __import__("os").environ["PATH"]},
    )
    return result.stdout.strip()


@tool
def get_commit_log(repo_path: str, limit: int = 50) -> list[dict]:
    """
    Return the last N commits with hash, author, date, and message.

    Args:
        repo_path: Local path to the git repository.
        limit: Max number of commits to return (default 50).

    Returns:
        List of commit dicts sorted newest-first.
    """
    fmt = "%H|%an|%ae|%ad|%s"
    out = _git(["log", f"--max-count={limit}", f"--format={fmt}", "--date=iso"], repo_path)
    commits = []
    for line in out.splitlines():
        if "|" not in line:
            continue
        parts = line.split("|", 4)
        if len(parts) == 5:
            commits.append({
                "hash": parts[0],
                "short_hash": parts[0][:7],
                "author": parts[1],
                "email": parts[2],
                "date": parts[3].strip(),
                "message": parts[4],
            })
    return commits


@tool
def get_commit_diff(repo_path: str, commit_hash: str) -> str:
    """
    Return the diff introduced by a specific commit.

    Args:
        repo_path: Local path to the git repository.
        commit_hash: Full or short commit hash.

    Returns:
        Unified diff string (capped at 200 lines).
    """
    diff = _git(["show", "--stat", "--patch", commit_hash], repo_path)
    lines = diff.splitlines()
    if len(lines) > 200:
        lines = lines[:200] + ["... [truncated]"]
    return "\n".join(lines)


@tool
def get_file_history(repo_path: str, file_path: str, limit: int = 20) -> list[dict]:
    """
    Return commit history for a specific file.

    Args:
        repo_path: Local path to the git repository.
        file_path: Relative path to the file within the repo.
        limit: Max commits to return.

    Returns:
        List of commit dicts that touched this file.
    """
    fmt = "%H|%an|%ad|%s"
    out = _git(
        ["log", f"--max-count={limit}", f"--format={fmt}", "--date=iso", "--", file_path],
        repo_path,
    )
    commits = []
    for line in out.splitlines():
        parts = line.split("|", 3)
        if len(parts) == 4:
            commits.append({
                "hash": parts[0][:7],
                "author": parts[1],
                "date": parts[2].strip(),
                "message": parts[3],
            })
    return commits


@tool
def get_branch_info(repo_path: str) -> dict:
    """
    Return current branch and list of all branches.

    Args:
        repo_path: Local path to the git repository.

    Returns:
        Dict with 'current' branch and 'all' branches list.
    """
    current = _git(["rev-parse", "--abbrev-ref", "HEAD"], repo_path)
    all_branches = _git(["branch", "-a"], repo_path)
    return {
        "current": current,
        "all": [b.strip().lstrip("* ") for b in all_branches.splitlines()],
    }


@tool
def get_contributor_stats(repo_path: str) -> list[dict]:
    """
    Return commit count per author.

    Args:
        repo_path: Local path to the git repository.

    Returns:
        List of dicts with author name and commit count, sorted by count desc.
    """
    out = _git(["shortlog", "-sne", "--all"], repo_path)
    stats = []
    for line in out.splitlines():
        parts = line.strip().split("\t", 1)
        if len(parts) == 2:
            stats.append({"count": int(parts[0].strip()), "author": parts[1].strip()})
    return sorted(stats, key=lambda x: x["count"], reverse=True)
