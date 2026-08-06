"""Supabase client — initialised once, reused across the app.

Returns None if Supabase env vars are not configured, allowing the
backend to run without Supabase for development/testing.
"""

import os
import logging

logger = logging.getLogger(__name__)

_client = None
_initialized = False


def get_supabase():
    """Return a singleton Supabase client using the SERVICE ROLE key
    (bypasses Row Level Security on the backend — safe because we
    enforce user_id scoping manually in crud.py).

    Returns None if SUPABASE_URL or SUPABASE_SERVICE_ROLE_KEY are not set.
    """
    global _client, _initialized
    if _initialized:
        return _client

    _initialized = True
    url = os.environ.get("SUPABASE_URL", "").strip()
    key = os.environ.get("SUPABASE_SERVICE_ROLE_KEY", "").strip()

    if not url or not key:
        logger.info("[DB] Supabase not configured (SUPABASE_URL / SUPABASE_SERVICE_ROLE_KEY missing) — DB features disabled")
        _client = None
        return _client

    try:
        from supabase import create_client
        _client = create_client(url, key)
        logger.info("[DB] Supabase client initialized")
    except ImportError:
        logger.warning("[DB] supabase package not installed — DB features disabled")
        _client = None
    except Exception as e:
        logger.error(f"[DB] Failed to create Supabase client: {e}")
        _client = None

    return _client
