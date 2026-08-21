"""
Visualization tools — produce structured data for charts, graphs, and diagrams.
All outputs are JSON-serializable and ready for frontend rendering (React Flow, D3, Chart.js).
"""

import re
import json
from pathlib import Path
from collections import defaultdict
from langchain_core.tools import tool

IGNORED_DIRS = {
    ".git", "node_modules", "__pycache__", ".venv", "dist", "build", ".next",
    "coverage", ".cache", ".idea", ".vscode", "vendor", "out", "target"
}
IGNORED_EXTS = {".map", ".min.js", ".min.css", ".png", ".jpg", ".jpeg", ".gif", ".ico", ".svg", ".zip", ".tar", ".gz"}


def _iter_files(root: Path):
    for fp in sorted(root.rglob("*")):
        if fp.is_file() and not any(p in IGNORED_DIRS for p in fp.parts):
            if fp.suffix.lower() in IGNORED_EXTS or fp.name.endswith(".min.js") or fp.name.endswith(".min.css"):
                continue
            try:
                if fp.stat().st_size > 1_000_000:  # Skip files larger than 1MB
                    continue
            except Exception:
                continue
            yield fp


# ── 1. Folder tree (for tree-map / sunburst) ──────────────────────────────────

@tool
def get_folder_size_tree(repo_path: str) -> dict:
    """
    Return folder sizes as a nested tree for treemap/sunburst charts.
    Each node has name, size (bytes), and children.
    """
    root = Path(repo_path)

    def _walk(path: Path) -> dict:
        node = {"name": path.name, "children": [], "size": 0}
        if path.is_dir():
            for child in sorted(path.iterdir()):
                if child.name in IGNORED_DIRS or child.name.startswith("."):
                    continue
                child_node = _walk(child)
                node["children"].append(child_node)
                node["size"] += child_node["size"]
        else:
            node["size"] = path.stat().st_size
            node.pop("children")
        return node

    return _walk(root)


# ── 2. Language breakdown (for pie/donut chart) ────────────────────────────────

@tool
def get_language_breakdown(repo_path: str) -> list[dict]:
    """
    Return lines-of-code per language for pie/donut charts.
    Returns list of {language, lines, files, color}.
    """
    LANG_MAP = {
        ".py": ("Python", "#3572A5"),
        ".js": ("JavaScript", "#f1e05a"),
        ".jsx": ("JavaScript", "#f1e05a"),
        ".ts": ("TypeScript", "#2b7489"),
        ".tsx": ("TypeScript", "#2b7489"),
        ".html": ("HTML", "#e34c26"),
        ".css": ("CSS", "#563d7c"),
        ".scss": ("SCSS", "#c6538c"),
        ".json": ("JSON", "#292929"),
        ".md": ("Markdown", "#083fa1"),
        ".yml": ("YAML", "#cb171e"),
        ".yaml": ("YAML", "#cb171e"),
        ".sh": ("Shell", "#89e051"),
        ".dockerfile": ("Docker", "#384d54"),
        ".sql": ("SQL", "#e38c00"),
    }

    stats = defaultdict(lambda: {"lines": 0, "files": 0})
    root = Path(repo_path)

    for fp in _iter_files(root):
        ext = fp.suffix.lower()
        lang, _ = LANG_MAP.get(ext, ("Other", "#ededed"))
        try:
            lines = len(fp.read_text(errors="replace").splitlines())
            stats[ext]["lines"] += lines
            stats[ext]["files"] += 1
        except Exception:
            pass

    result = []
    for ext, data in sorted(stats.items(), key=lambda x: -x[1]["lines"]):
        lang, color = LANG_MAP.get(ext, ("Other", "#ededed"))
        result.append({
            "language": lang,
            "extension": ext,
            "lines": data["lines"],
            "files": data["files"],
            "color": color,
        })
    return result


# ── 3. File dependency graph (for node graph / React Flow) ────────────────────

@tool
def get_dependency_graph(repo_path: str) -> dict:
    """
    Build a file dependency graph by parsing import/require statements.
    Returns nodes and edges compatible with React Flow / D3 force graph.
    """
    root = Path(repo_path)
    nodes = {}
    edges = []
    edge_set = set()

    IMPORT_PATTERNS = [
        r"^import\s+.*?\s+from\s+['\"]([^'\"]+)['\"]",       # ES6 import
        r"^import\s+['\"]([^'\"]+)['\"]",                      # side-effect import
        r"(?:const|let|var)\s+\w+\s*=\s*require\(['\"]([^'\"]+)['\"]\)",  # require
        r"^from\s+([.\w]+)\s+import",                           # Python import
    ]

    SUPPORTED_EXTS = {
        ".js", ".jsx", ".ts", ".tsx", ".py", ".html", ".css", ".scss", ".json",
        ".md", ".java", ".c", ".cpp", ".h", ".hpp", ".go", ".rs", ".php", ".rb",
        ".vue", ".svelte", ".yaml", ".yml", ".sql"
    }

    for fp in _iter_files(root):
        if fp.suffix.lower() not in SUPPORTED_EXTS:
            continue
        rel = str(fp.relative_to(root)).replace("\\", "/")
        node_id = rel
        nodes[node_id] = {
            "id": node_id,
            "label": fp.name,
            "type": fp.suffix.lstrip(".") or "file",
            "path": rel,
        }
        try:
            for line in fp.read_text(errors="replace").splitlines():
                line = line.strip()
                for pattern in IMPORT_PATTERNS:
                    m = re.match(pattern, line)
                    if m:
                        imp = m.group(1)
                        # Only track relative imports
                        if imp.startswith("."):
                            target = (fp.parent / imp).resolve()
                            for ext in ["", ".js", ".jsx", ".ts", ".tsx", ".py"]:
                                candidate = Path(str(target) + ext)
                                if candidate.exists():
                                    target_rel = str(candidate.relative_to(root)).replace("\\", "/")
                                    edge_key = f"{node_id}->{target_rel}"
                                    if edge_key not in edge_set:
                                        edge_set.add(edge_key)
                                        edges.append({
                                            "id": edge_key,
                                            "source": node_id,
                                            "target": target_rel,
                                        })
                                    break
        except Exception:
            continue

    return {
        "nodes": list(nodes.values()),
        "edges": edges,
        "node_count": len(nodes),
        "edge_count": len(edges),
    }


# ── 4. Commit activity heatmap (GitHub-style) ─────────────────────────────────

@tool
def get_commit_heatmap(repo_path: str) -> list[dict]:
    """
    Return daily commit counts for a GitHub-style activity heatmap.
    Returns list of {date, count, day_of_week, week}.
    """
    import subprocess
    from datetime import datetime

    env = {"GIT_SSL_NO_VERIFY": "true", "PATH": __import__("os").environ["PATH"]}
    result = subprocess.run(
        ["git", "log", "--format=%ad", "--date=short"],
        cwd=repo_path, capture_output=True, text=True, env=env,
    )
    date_counts = defaultdict(int)
    for line in result.stdout.strip().splitlines():
        date_counts[line.strip()] += 1

    heatmap = []
    for date_str, count in sorted(date_counts.items()):
        try:
            dt = datetime.strptime(date_str, "%Y-%m-%d")
            heatmap.append({
                "date": date_str,
                "count": count,
                "day_of_week": dt.weekday(),
                "week": dt.strftime("%Y-W%W"),
                "month": dt.strftime("%Y-%m"),
            })
        except Exception:
            continue

    return heatmap


# ── 5. Contributor activity (bar chart) ───────────────────────────────────────

@tool
def get_contributor_activity(repo_path: str) -> list[dict]:
    """
    Return per-author commit counts by month for stacked bar charts.
    Returns list of {author, month, commits}.
    """
    import subprocess

    env = {"GIT_SSL_NO_VERIFY": "true", "PATH": __import__("os").environ["PATH"]}
    result = subprocess.run(
        ["git", "log", "--format=%an|%ad", "--date=format:%Y-%m"],
        cwd=repo_path, capture_output=True, text=True, env=env,
    )
    data = defaultdict(lambda: defaultdict(int))
    for line in result.stdout.strip().splitlines():
        parts = line.split("|")
        if len(parts) == 2:
            author, month = parts
            data[author.strip()][month.strip()] += 1

    result_list = []
    for author, months in data.items():
        for month, count in months.items():
            result_list.append({"author": author, "month": month, "commits": count})

    return sorted(result_list, key=lambda x: x["month"])
