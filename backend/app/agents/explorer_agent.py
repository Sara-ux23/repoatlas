"""Explorer Agent — fast single-LLM-call repo explainer."""

import os, asyncio, warnings, certifi
from pathlib import Path
warnings.filterwarnings("ignore")
os.environ["REQUESTS_CA_BUNDLE"] = certifi.where()
os.environ["SSL_CERT_FILE"] = certifi.where()

from langchain_core.messages import HumanMessage, SystemMessage
from app.tools.github_tools import clone_repo, cleanup_repo
from app.tools.repo_tools import get_repo_tree
from app.core.llm import invoke_with_rotation

IGNORED = {".git","node_modules","__pycache__",".venv","dist","build",".next"}


def _build_context(local_path: str) -> str:
    tree = get_repo_tree.invoke({"repo_path": local_path, "max_depth": 3})
    snippets, root = [], Path(local_path)
    for fp in sorted(root.rglob("*")):
        if fp.is_file() and not any(p in IGNORED for p in fp.parts):
            if fp.stat().st_size < 3000:
                try:
                    snippets.append(f"### {fp.relative_to(root)}\n{fp.read_text(errors='replace')}")
                except Exception:
                    pass
        if len(snippets) >= 12:
            break
    return f"TREE:\n{tree}\n\nFILES:\n" + "\n\n".join(snippets)


async def run_explorer(repo_path: str, query: str) -> str:
    cloned = False
    local_path = repo_path
    if repo_path.startswith("http"):
        local_path = await asyncio.get_event_loop().run_in_executor(None, clone_repo, repo_path)
        cloned = True
    try:
        ctx = await asyncio.get_event_loop().run_in_executor(None, _build_context, local_path)
        return await invoke_with_rotation([
            SystemMessage(content="You are the Explorer Agent for RepoAtlas AI. Be concise — max 200 words. No repetition."),
            HumanMessage(content=f"{ctx}\n\nQUERY: {query}"),
        ])
    finally:
        if cloned: cleanup_repo(local_path)
