"""JWT verification dependency for FastAPI routes.

Supabase issues HS256-signed JWTs. We verify using SUPABASE_JWT_SECRET.
If the secret is not set, auth is bypassed (anonymous mode for dev).
"""

import os
import logging
import base64
from fastapi import Depends, HTTPException, status
from fastapi.security import HTTPBearer, HTTPAuthorizationCredentials

logger = logging.getLogger(__name__)

_bearer = HTTPBearer(auto_error=False)
ANONYMOUS_USER_ID = "anonymous"


def _decode_secret(secret: str) -> str:
    """
    Supabase JWT secrets are base64url-encoded.
    python-jose needs the raw decoded bytes (passed as a bytes object)
    OR the raw base64 string — try both.
    """
    # First try to decode as base64 (Supabase format)
    try:
        # Add padding if needed
        padding = 4 - len(secret) % 4
        padded = secret + ("=" * (padding % 4))
        decoded = base64.b64decode(padded.replace("-", "+").replace("_", "/"))
        return decoded
    except Exception:
        # Fall back to using the secret as-is
        return secret.encode() if isinstance(secret, str) else secret


def get_current_user(
    credentials: HTTPAuthorizationCredentials | None = Depends(_bearer),
) -> str:
    """
    Verify Supabase JWT and return the user UUID.
    Falls back to 'anonymous' if SUPABASE_JWT_SECRET is not configured.
    """
    secret = os.environ.get("SUPABASE_JWT_SECRET", "").strip()

    # ── Dev bypass: no secret configured ──────────────────────────────
    if not secret:
        logger.debug("[Auth] No JWT secret — anonymous mode")
        return ANONYMOUS_USER_ID

    # ── No token sent → anonymous (don't force login) ─────────────────
    if credentials is None:
        logger.debug("[Auth] No token provided — anonymous mode")
        return ANONYMOUS_USER_ID

    try:
        import jwt as pyjwt  # PyJWT

        token = credentials.credentials

        # Decode the base64 secret Supabase provides
        secret_bytes = _decode_secret(secret)

        payload = pyjwt.decode(
            token,
            secret_bytes,
            algorithms=["HS256"],
            options={"verify_aud": False},
        )
        user_id = payload.get("sub", "")
        if not user_id:
            logger.warning("[Auth] Token has no sub claim")
            return ANONYMOUS_USER_ID

        logger.debug(f"[Auth] Verified user: {user_id[:8]}…")
        return user_id

    except Exception as exc:
        logger.warning(f"[Auth] JWT verification failed: {exc} — falling back to anonymous")
        # Don't block the request — let analysis work even if token parsing fails
        return ANONYMOUS_USER_ID
