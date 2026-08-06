"""CRUD helpers — save and fetch analysis sessions from Supabase.

All functions gracefully no-op if Supabase is not configured.
"""

import logging
from typing import Any
from app.db.supabase_client import get_supabase

logger = logging.getLogger(__name__)


def save_analysis(user_id: str, result: dict[str, Any]) -> None:
    """Persist a completed manager analysis to the analysis_sessions table."""
    try:
        supabase = get_supabase()
        if supabase is None:
            logger.debug("[DB] Supabase not configured — skipping save_analysis")
            return
        supabase.table("analysis_sessions").insert({
            "user_id": user_id,
            "repo_url": result.get("repo_path", ""),
            "query": result.get("query", ""),
            "agents_run": result.get("agents_run", []),
            "statuses": result.get("statuses", {}),
            "executive_summary": result.get("executive_summary", ""),
            "explorer_result": result.get("explorer"),
            "trace_result": result.get("trace"),
            "security_result": result.get("security"),
            "visualization_result": result.get("visualization"),
        }).execute()
        logger.info(f"[DB] Analysis saved for user {user_id}")
    except Exception as e:
        # Non-fatal — log and continue so the API response still returns
        logger.error(f"[DB] Failed to save analysis: {e}")


def get_user_analyses(user_id: str) -> list[dict]:
    """Return all past analyses for a user, newest first."""
    try:
        supabase = get_supabase()
        if supabase is None:
            logger.debug("[DB] Supabase not configured — returning empty history")
            return []
        res = (
            supabase.table("analysis_sessions")
            .select(
                "id, repo_url, query, agents_run, statuses, executive_summary, created_at"
            )
            .eq("user_id", user_id)
            .order("created_at", desc=True)
            .execute()
        )
        return res.data or []
    except Exception as e:
        logger.error(f"[DB] Failed to fetch analyses: {e}")
        return []


def get_analysis_by_id(analysis_id: str, user_id: str) -> dict | None:
    """Return a single full analysis (including agent results) by ID, scoped to user."""
    try:
        supabase = get_supabase()
        if supabase is None:
            logger.debug("[DB] Supabase not configured — returning None")
            return None
        res = (
            supabase.table("analysis_sessions")
            .select("*")
            .eq("id", analysis_id)
            .eq("user_id", user_id)
            .single()
            .execute()
        )
        return res.data
    except Exception as e:
        logger.error(f"[DB] Failed to fetch analysis {analysis_id}: {e}")
        return None
