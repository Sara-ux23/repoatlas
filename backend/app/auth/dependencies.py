"""JWT verification dependency for FastAPI routes.

Supabase issues a signed JWT for every authenticated user. We verify it
here using the SUPABASE_JWT_SECRET (found in Project Settings → API → JWT Settings).

If SUPABASE_JWT_SECRET is not configured, auth is bypassed and a default
anonymous user ID is returned — this lets the backend run standalone for
development/testing without Supabase.

Usage in any protected route:
    @router.post("/")
    async def my_endpoint(user_id: str = Depends(get_current_user)):
        ...
"""

import os
import logging
from fastapi import Depends, HTTPException, status
from fastapi.security import HTTPBearer, HTTPAuthorizationCredentials

logger = logging.getLogger(__name__)

# FastAPI security scheme — reads the "Authorization: Bearer <token>" header
# auto_error=False so we can fall back to anonymous when Supabase isn't configured
_bearer = HTTPBearer(auto_error=False)

ANONYMOUS_USER_ID = "anonymous"


def get_current_user(
    credentials: HTTPAuthorizationCredentials | None = Depends(_bearer),
) -> str:
    """Verify the Supabase JWT and return the user UUID (sub claim).

    If SUPABASE_JWT_SECRET is not set, returns ANONYMOUS_USER_ID so the
    backend can run without Supabase for development.
    Raises 401 if the token is missing, expired, or tampered with (only
    when Supabase auth is configured).
    """
    secret = os.environ.get("SUPABASE_JWT_SECRET", "").strip()

    # ── No Supabase configured → bypass auth ──────────────────────────
    if not secret:
        logger.debug("[Auth] SUPABASE_JWT_SECRET not set — running in anonymous mode")
        return ANONYMOUS_USER_ID

    # ── Supabase configured → verify JWT ──────────────────────────────
    if credentials is None:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Missing authorization token.",
            headers={"WWW-Authenticate": "Bearer"},
        )

    try:
        from jose import jwt, JWTError
    except ImportError:
        logger.error("[Auth] python-jose not installed — cannot verify JWT")
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail="Server auth misconfiguration (missing python-jose).",
        )

    token = credentials.credentials

    try:
        payload = jwt.decode(
            token,
            secret,
            algorithms=["HS256"],
            # Supabase tokens use "authenticated" as the audience
            options={"verify_aud": False},
        )
        user_id: str = payload.get("sub", "")
        if not user_id:
            raise HTTPException(
                status_code=status.HTTP_401_UNAUTHORIZED,
                detail="Token missing subject claim.",
            )
        return user_id
    except JWTError as exc:
        logger.warning(f"[Auth] JWT verification failed: {exc}")
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Invalid or expired token.",
            headers={"WWW-Authenticate": "Bearer"},
        )
