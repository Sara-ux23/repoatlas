"""User Query Agent — conversational chatbot interface for repo analysis."""

import os
import asyncio
import warnings
import certifi
from typing import Optional

warnings.filterwarnings("ignore")
os.environ["REQUESTS_CA_BUNDLE"] = certifi.where()
os.environ["SSL_CERT_FILE"] = certifi.where()

from langchain_core.messages import HumanMessage, SystemMessage, AIMessage
from app.core.llm import invoke_with_rotation
from app.core.repo_session import repo_session
from app.tools.repo_tools import get_repo_tree, search_in_files
from app.tools.git_tools import get_commit_log, get_contributor_stats


SYSTEM_PROMPT = """You are a helpful AI assistant for RepoAtlas - an intelligent code repository analysis platform.

Your role:
- Answer questions about the currently loaded repository
- Provide code explanations, architecture insights, and development guidance
- Be conversational, friendly, and precise
- If you don't have enough context, say so and suggest what information is needed

Available context:
- Repository structure and file tree
- Recent commits and git history
- File contents (when relevant)
- Code patterns and architecture

Guidelines:
- Be concise but thorough (aim for 100-200 words)
- Use code examples when helpful
- Provide actionable insights
- Reference specific files/functions when discussing code
- If asked about security, traces, or visualizations, explain what those specialized agents do
"""


async def _get_repo_context(local_path: str, query: str) -> str:
    """Gather relevant repo context based on the query."""
    try:
        # Always include basic structure
        tree = get_repo_tree.invoke({"repo_path": local_path, "max_depth": 2})
        context_parts = [f"REPOSITORY STRUCTURE:\n{tree[:1000]}"]
        
        # Add git history if query mentions commits/history
        q_lower = query.lower()
        if any(word in q_lower for word in ["commit", "history", "when", "who", "author", "recent", "changes"]):
            commits = get_commit_log.invoke({"repo_path": local_path, "limit": 10})
            commit_summary = "\n".join([
                f"- {c['short_hash']}: {c['message'][:60]} by {c['author']} on {c['date'][:10]}"
                for c in commits[:5]
            ])
            context_parts.append(f"\nRECENT COMMITS:\n{commit_summary}")
        
        # Add contributor info if asked
        if any(word in q_lower for word in ["contributor", "developer", "author", "team", "who made"]):
            contributors = get_contributor_stats.invoke({"repo_path": local_path})
            context_parts.append(f"\nCONTRIBUTORS: {contributors}")
        
        # Search for specific files/patterns mentioned in query
        search_terms = [word for word in q_lower.split() if len(word) > 4][:3]
        if search_terms:
            try:
                search_results = search_in_files.invoke({
                    "repo_path": local_path,
                    "pattern": " ".join(search_terms)
                })
                if search_results.get("matches"):
                    matches_str = "\n".join([
                        f"- {m['file']} (line {m['line']}): {m['content'][:80]}"
                        for m in search_results["matches"][:5]
                    ])
                    context_parts.append(f"\nRELEVANT CODE:\n{matches_str}")
            except Exception:
                pass
        
        return "\n".join(context_parts)
    except Exception as e:
        return f"Error gathering context: {e}"


async def run_user_query(
    query: str,
    chat_history: Optional[list[dict]] = None,
    repo_path: Optional[str] = None
) -> dict:
    """
    Handle user conversational queries about the repository.
    
    Args:
        query: User's question
        chat_history: List of {role: "user"|"assistant", content: str}
        repo_path: Optional override for repo path
    
    Returns:
        dict with answer and metadata
    """
    # Get repo path from session or parameter
    if repo_path:
        local_path = await repo_session.load(repo_path)
    elif repo_session.local_path:
        local_path = repo_session.local_path
    else:
        return {
            "answer": "No repository is currently loaded. Please analyze a repository first using the 'Analyze Repo' button on the Product page.",
            "context_used": False,
            "error": "NO_REPO_LOADED"
        }
    
    # Gather relevant context
    context = await _get_repo_context(local_path, query)
    
    # Build conversation messages
    messages = [SystemMessage(content=SYSTEM_PROMPT)]
    
    # Add chat history if provided
    if chat_history:
        for msg in chat_history[-6:]:  # Last 6 messages for context
            if msg["role"] == "user":
                messages.append(HumanMessage(content=msg["content"]))
            elif msg["role"] == "assistant":
                messages.append(AIMessage(content=msg["content"]))
    
    # Add current query with context
    messages.append(HumanMessage(content=f"{context}\n\nUSER QUESTION: {query}"))
    
    # Get AI response
    try:
        answer = await invoke_with_rotation(messages, temperature=0.3)
        return {
            "answer": answer,
            "context_used": True,
            "repo_path": repo_session.repo_url or local_path
        }
    except Exception as e:
        return {
            "answer": f"I encountered an error: {str(e)}. Please try rephrasing your question.",
            "context_used": False,
            "error": str(e)
        }
