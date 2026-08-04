"""
Repo tools used by the Explorer Agent.
These are LangChain @tool decorated functions the LLM can call.
"""

import os
import fnmatch
from pathlib import Path
from langchain_core.tools import tool


IGNORED_DIRS = {".git", "node_modules", "__pycache__", ".venv", "dist", "build", ".next"}
MAX_FILE_BYTES = 50_000  # 50 KB cap for file reads


def _is_ignored(name: str) -> bool:
    return name in IGNORED_DIRS or name.startswith(".")


@tool
def get_repo_tree(repo_path: str, max_depth: int = 3) -> dict:
    """
    Return a nested dictionary representing the repo's file/folder structure.

    Args:
        repo_path: Absolute or relative path to the repo root.
        max_depth: How many directory levels deep to traverse.

    Returns:
        Nested dict with keys 'name', 'type' ('file'|'dir'), and 'children'.
    """
    root = Path(repo_path)
    if not root.exists():
        return {"error": f"Path does not exist: {repo_path}"}

    def _walk(path: Path, depth: int) -> dict:
        node = {"name": path.name, "type": "dir" if path.is_dir() else "file"}
        if path.is_dir() and depth > 0:
            children = []
            for child in sorted(path.iterdir()):
                if not _is_ignored(child.name):
                    children.append(_walk(child, depth - 1))
            node["children"] = children
        return node

    return _walk(root, max_depth)


@tool
def read_file_content(file_path: str) -> str:
    """
    Read and return the content of a file (capped at 50 KB).

    Args:
        file_path: Absolute or relative path to the file.

    Returns:
        File content as a string, or an error message.
    """
    path = Path(file_path)
    if not path.exists():
        return f"File not found: {file_path}"
    if not path.is_file():
        return f"Not a file: {file_path}"

    size = path.stat().st_size
    if size > MAX_FILE_BYTES:
        # Read first 50 KB only
        with open(path, "r", errors="replace") as f:
            content = f.read(MAX_FILE_BYTES)
        return content + f"\n\n[truncated — file is {size} bytes, showing first {MAX_FILE_BYTES}]"

    try:
        return path.read_text(errors="replace")
    except Exception as e:
        return f"Error reading file: {e}"


@tool
def search_in_repo(repo_path: str, pattern: str, file_glob: str = "*.py") -> list[dict]:
    """
    Search for a text pattern across files in the repo.

    Args:
        repo_path: Root path of the repository.
        pattern: String to search for (case-insensitive).
        file_glob: Glob pattern to filter files (default: '*.py').

    Returns:
        List of dicts with 'file', 'line_number', and 'line' for each match.
    """
    root = Path(repo_path)
    results = []
    pattern_lower = pattern.lower()

    for filepath in root.rglob(file_glob):
        # Skip ignored directories
        if any(_is_ignored(part) for part in filepath.parts):
            continue
        try:
            lines = filepath.read_text(errors="replace").splitlines()
            for i, line in enumerate(lines, start=1):
                if pattern_lower in line.lower():
                    results.append({
                        "file": str(filepath.relative_to(root)),
                        "line_number": i,
                        "line": line.strip(),
                    })
        except Exception:
            continue

    return results[:50]  # cap at 50 matches


@tool
def get_file_summary(file_path: str) -> dict:
    """
    Return a lightweight summary of a file: size, extension, line count, and first 20 lines.

    Args:
        file_path: Path to the file.

    Returns:
        Dict with metadata and a preview.
    """
    path = Path(file_path)
    if not path.exists() or not path.is_file():
        return {"error": f"File not found or not a file: {file_path}"}

    content = path.read_text(errors="replace")
    lines = content.splitlines()

    return {
        "name": path.name,
        "extension": path.suffix,
        "size_bytes": path.stat().st_size,
        "line_count": len(lines),
        "preview": "\n".join(lines[:20]),
    }
