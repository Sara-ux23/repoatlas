"""CRUD helpers — save and fetch analysis sessions and chat messages from Supabase.

All functions gracefully no-op if Supabase is not configured.
"""

import logging
import uuid
from typing import Any, Optional
from datetime import datetime, timezone, timedelta
from app.db.supabase_client import get_supabase

logger = logging.getLogger(__name__)

# How long a cached analysis is considered fresh (hours)
CACHE_TTL_HOURS = 24


def _to_valid_uuid(user_id: Optional[str]) -> Optional[str]:
    """Return valid UUID string if user_id is a valid UUID, otherwise None for anonymous/unauthenticated users."""
    if not user_id or user_id == "anonymous":
        return None
    try:
        uuid.UUID(str(user_id))
        return user_id
    except ValueError:
        return None


# ─── Analysis sessions ────────────────────────────────────────────────────────

def save_analysis(user_id: str, result: dict[str, Any]) -> None:
    """Persist a completed manager analysis to the analysis_sessions table."""
    logger.info(f"[DB] save_analysis() called for user_id={user_id}, repo={result.get('repo_path', 'unknown')}")
    
    try:
        supabase = get_supabase()
        if supabase is None:
            logger.warning("[DB] Supabase client is None - skipping save")
            return
        
        db_user_id = _to_valid_uuid(user_id)
        
        payload = {
            "user_id": db_user_id,
            "repo_url": result.get("repo_path", ""),
            "query": result.get("query", ""),
            "agents_run": result.get("agents_run", []),
            "statuses": result.get("statuses", {}),
            "executive_summary": result.get("executive_summary", ""),
            "explorer_result": result.get("explorer"),
            "trace_result": result.get("trace"),
            "security_result": result.get("security"),
            "visualization_result": result.get("visualization"),
        }
        
        logger.info(f"[DB] Inserting analysis: user_id={db_user_id}, repo={payload['repo_url']}, agents={payload['agents_run']}")
        
        try:
            supabase.table("analysis_sessions").insert(payload).execute()
            logger.info(f"[DB] ✅ Analysis saved successfully (user_id: {db_user_id}, repo: {payload['repo_url']})")
        except Exception as insert_err:
            err_str = str(insert_err).lower()
            if ("foreign key constraint" in err_str or "23503" in err_str) and db_user_id is not None:
                logger.warning(f"[DB] user_id '{db_user_id}' not present in auth.users, retrying with user_id=None")
                payload["user_id"] = None
                supabase.table("analysis_sessions").insert(payload).execute()
                logger.info(f"[DB] ✅ Analysis saved successfully with user_id=None (repo: {payload['repo_url']})")
            else:
                raise insert_err
        
    except Exception as e:
        logger.error(f"[DB] ❌ Failed to save analysis: {e}", exc_info=True)


def get_cached_analysis(user_id: str, repo_url: str) -> dict | None:
    """Return the most recent full analysis for this user+repo if it's within CACHE_TTL_HOURS."""
    try:
        supabase = get_supabase()
        if supabase is None:
            return None

        cutoff = (datetime.now(timezone.utc) - timedelta(hours=CACHE_TTL_HOURS)).isoformat()

        query = (
            supabase.table("analysis_sessions")
            .select("*")
            .eq("repo_url", repo_url)
            .gte("created_at", cutoff)
        )
        
        db_user_id = _to_valid_uuid(user_id)
        if db_user_id:
            query = query.eq("user_id", db_user_id)

        res = query.order("created_at", desc=True).limit(1).execute()

        if res.data:
            row = res.data[0]
            logger.info(f"[DB] Cache HIT for {repo_url} (user {user_id})")
            return {
                "repo_path": row["repo_url"],
                "query": row["query"],
                "agents_run": row.get("agents_run", []),
                "statuses": row.get("statuses", {}),
                "executive_summary": row.get("executive_summary", ""),
                "explorer": row.get("explorer_result"),
                "trace": row.get("trace_result"),
                "security": row.get("security_result"),
                "visualization": row.get("visualization_result"),
                "cached": True,
            }

        logger.info(f"[DB] Cache MISS for {repo_url} (user {user_id})")
        return None
    except Exception as e:
        logger.error(f"[DB] Cache lookup failed: {e}")
        return None


def get_user_analyses(user_id: str) -> list[dict]:
    """Return all past analyses for a user (or all anonymous analyses if anonymous), newest first."""
    try:
        supabase = get_supabase()
        if supabase is None:
            return []
        query = (
            supabase.table("analysis_sessions")
            .select("id, repo_url, query, agents_run, statuses, executive_summary, created_at")
        )
        db_user_id = _to_valid_uuid(user_id)
        if db_user_id:
            query = query.eq("user_id", db_user_id)
        res = query.order("created_at", desc=True).execute()
        return res.data or []
    except Exception as e:
        logger.error(f"[DB] Failed to fetch analyses: {e}")
        return []


def get_analysis_by_id(analysis_id: str, user_id: str) -> dict | None:
    """Return a single full analysis (including agent results) by ID."""
    try:
        supabase = get_supabase()
        if supabase is None:
            return None
        query = supabase.table("analysis_sessions").select("*").eq("id", analysis_id)
        db_user_id = _to_valid_uuid(user_id)
        if db_user_id:
            query = query.eq("user_id", db_user_id)
        res = query.single().execute()
        return res.data
    except Exception as e:
        logger.error(f"[DB] Failed to fetch analysis {analysis_id}: {e}")
        return None


# ─── Chat messages ────────────────────────────────────────────────────────────

def save_chat_message(
    user_id: str,
    repo_url: str,
    role: str,
    content: str,
    agent: Optional[str] = None,
    session_id: Optional[str] = None,
) -> None:
    """Persist a single chat message to chat_messages and chat_history tables."""
    if not user_id:
        user_id = "anonymous"
    
    logger.info(f"[DB] save_chat_message() called: user={user_id}, role={role}, repo={repo_url}")
    
    try:
        supabase = get_supabase()
        if supabase is None:
            logger.warning("[DB] Supabase client is None - skipping chat save")
            return
        
        # 1. Primary insert: chat_messages table (user_id, repo_url, role, content)
        msg_payload = {
            "user_id": user_id,
            "repo_url": repo_url,
            "role": role,
            "content": content,
        }
        
        logger.info(f"[DB] Inserting chat message into chat_messages: user={user_id}, role={role}")
        supabase.table("chat_messages").insert(msg_payload).execute()
        logger.info(f"[DB] ✅ Chat message saved to chat_messages: {role} for {repo_url}")
        
        # 2. Sync insert: chat_history table (session_id, repo_url, user_message, assistant_message)
        try:
            hist_payload = {
                "session_id": session_id or f"session_{repo_url}",
                "repo_url": repo_url,
                "user_message": content if role == "user" else "",
                "assistant_message": content if role == "assistant" else "",
            }
            supabase.table("chat_history").insert(hist_payload).execute()
            logger.info(f"[DB] ✅ Chat message synced to chat_history: {role} for {repo_url}")
        except Exception as sync_err:
            logger.debug(f"[DB] Note: chat_history sync: {sync_err}")

    except Exception as e:
        logger.error(f"[DB] ❌ Failed to save chat message: {e}", exc_info=True)


def get_chat_history(
    user_id: str,
    repo_url: str,
    limit: int = 50,
    agent: Optional[str] = None,
) -> list[dict]:
    """Return the most recent `limit` chat messages for a user+repo, oldest first."""
    try:
        supabase = get_supabase()
        if supabase is None:
            return []
        
        query = (
            supabase.table("chat_messages")
            .select("id, role, content, created_at")
            .eq("repo_url", repo_url)
        )
        if user_id and user_id != "anonymous":
            query = query.eq("user_id", user_id)
            
        res = query.order("created_at", desc=False).limit(limit).execute()
        return res.data or []
    except Exception as e:
        logger.error(f"[DB] Failed to fetch chat history: {e}")
        return []


def get_all_chat_repos(user_id: str) -> list[dict]:
    """Return every distinct repo_url that has chat messages for this user.

    Each entry has: repo_url, last_message_at, message_count.
    Sorted newest-first by last_message_at.
    """
    try:
        supabase = get_supabase()
        if supabase is None:
            return []
        query = supabase.table("chat_messages").select("repo_url, created_at")
        if user_id and user_id != "anonymous":
            query = query.eq("user_id", user_id)
        
        res = query.order("created_at", desc=True).limit(2000).execute()
        rows = res.data or []

        agg: dict[str, dict] = {}
        for row in rows:
            url = row["repo_url"]
            if url not in agg:
                agg[url] = {"repo_url": url, "last_message_at": row["created_at"], "message_count": 0}
            agg[url]["message_count"] += 1

        return sorted(agg.values(), key=lambda x: x["last_message_at"], reverse=True)
    except Exception as e:
        logger.error(f"[DB] Failed to fetch chat repos: {e}")
        return []


def clear_chat_history(
    user_id: str,
    repo_url: str,
    agent: Optional[str] = None,
) -> None:
    """Delete all chat messages for a user+repo pair."""
    try:
        supabase = get_supabase()
        if supabase is None:
            return
        
        q1 = supabase.table("chat_messages").delete().eq("repo_url", repo_url)
        if user_id and user_id != "anonymous":
            q1 = q1.eq("user_id", user_id)
        q1.execute()
        
        try:
            q2 = supabase.table("chat_history").delete().eq("repo_url", repo_url)
            q2.execute()
        except Exception:
            pass
            
        logger.info(f"[DB] Chat history cleared for {repo_url} (user {user_id})")
    except Exception as e:
        logger.error(f"[DB] Failed to clear chat history: {e}")


