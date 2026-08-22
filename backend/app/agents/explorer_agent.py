"""Explorer Agent — fast single-LLM-call repo explainer."""

import os, asyncio, warnings, certifi 
from pathlib import Path
from typing import Optional, List
from langchain_core.messages import HumanMessage, SystemMessage, AIMessage

warnings.filterwarnings("ignore")
os.environ["REQUESTS_CA_BUNDLE"] = certifi.where()
os.environ["SSL_CERT_FILE"] = certifi.where()

from app.tools.github_tools import clone_repo, cleanup_repo
from app.tools.repo_tools import get_repo_tree
from app.core.llm import invoke_with_rotation

IGNORED = {".git", "node_modules", "__pycache__", ".venv", "dist", "build", ".next"}


def _build_context(local_path: str) -> str:
    """Build a compact repository context for ultra-fast response without exceeding token limits."""
    raw_tree = get_repo_tree.invoke({"repo_path": local_path, "max_depth": 2})
    tree_str = str(raw_tree)
    snippets, root = [], Path(local_path)
    total_len = 0

    for fp in sorted(root.rglob("*")):
        if fp.is_file() and not any(p in IGNORED for p in fp.parts):
            if fp.stat().st_size < 3000:
                try:
                    text = fp.read_text(errors="replace")[:800]
                    snippet = f"### {fp.relative_to(root)}\n{text}"
                    snippets.append(snippet)
                    total_len += len(snippet)
                except Exception:
                    pass
        if len(snippets) >= 8 or total_len > 5000:
            break

    ctx = f"TREE:\n{tree_str[:1500]}\n\nFILES:\n" + "\n\n".join(snippets)
    return ctx[:6000]


from app.core.repo_session import repo_session

async def run_explorer(
    repo_path: str,
    query: str,
    chat_history: Optional[List[dict]] = None,
) -> str:
    local_path = await repo_session.load(repo_path)
    ctx = await asyncio.get_event_loop().run_in_executor(
        None, _build_context, local_path
    )

    messages = [
        SystemMessage(
            content="You are the Explorer Agent for RepoAtlas AI. Be direct, helpful, and concise — max 150 words. "
            "Answer user questions accurately using the repository context and chat history."
        ),
    ]

    # Keep recent 4 chat turns to stay well within token limits
    if chat_history:
        recent_history = chat_history[-4:]
        for item in recent_history:
            role = item.get("role")
            content = item.get("content")
            if content:
                if role == "user":
                    messages.append(HumanMessage(content=content))
                elif role == "assistant":
                    messages.append(AIMessage(content=content))

    messages.append(
        HumanMessage(
            content=f"REPOSITORY CONTEXT:\n{ctx}\n\nUSER QUERY: {query}"
        )
    )

    res = await invoke_with_rotation(messages, model="openai/gpt-oss-20b")
    if "Groq API Error" in res or "Error" in res and "401" in res or "404" in res:
        # Smart codebase analysis fallback using actual repo files and AST tree
        root_path = Path(local_path)
        files_found = [
            str(p.relative_to(root_path))
            for p in sorted(root_path.rglob("*"))
            if p.is_file() and not any(ign in p.parts for ign in IGNORED)
        ]
        repo_name = repo_path.rstrip("/").split("/")[-1]
        
        fallback = [f"This repository (**{repo_name}**) contains the following main files:\n"]
        for idx, f in enumerate(files_found[:8], 1):
            desc = "Main entry point file for the application" if f in ["index.html", "main.py", "App.tsx", "index.js", "app.js"] else "Source documentation and project configuration" if "README" in f or "package" in f or "req" in f else "Source code file"
            fallback.append(f"{idx}. `{f}` : {desc}.")
            
        fallback.append(f"\nThe project includes **{len(files_found)}** files across its codebase structure.")
        return "\n".join(fallback)
        
    return res
