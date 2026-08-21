"""Chat history API — save and retrieve persistent chat messages per user+repo."""

from fastapi import APIRouter, HTTPException, Depends, Query
from pydantic import BaseModel
from typing import Optional

from app.auth.dependencies import get_current_user
from app.db.crud import save_chat_message, get_chat_history, clear_chat_history, get_all_chat_repos

router = APIRouter(prefix="/chat", tags=["Chat History"])


class ChatMessageIn(BaseModel):
    repo_url: str
    role: str   # "user" or "assistant"
    content: str
    agent: Optional[str] = None


class ChatMessageOut(BaseModel):
    id: str
    role: str
    content: str
    created_at: str
    agent: Optional[str] = None


class ChatHistoryResponse(BaseModel):
    repo_url: str
    messages: list[ChatMessageOut]


@router.post("/message", status_code=201)
def post_chat_message(
    body: ChatMessageIn,
    user_id: str = Depends(get_current_user),
):
    """Persist a single chat message (user or assistant) for a repo."""
    if body.role not in ("user", "assistant"):
        raise HTTPException(status_code=422, detail="role must be 'user' or 'assistant'")
    save_chat_message(user_id, body.repo_url, body.role, body.content, agent=body.agent)
    return {"status": "saved"}


@router.get("/history", response_model=ChatHistoryResponse)
def get_history(
    repo_url: str = Query(..., description="Full repo URL to fetch history for"),
    limit: int = Query(50, ge=1, le=200),
    agent: Optional[str] = Query(None, description="Optional agent type (e.g. 'explorer', 'user_query')"),
    user_id: str = Depends(get_current_user),
):
    """Return persisted chat messages for a user+repo, oldest first."""
    messages = get_chat_history(user_id, repo_url, limit=limit, agent=agent)
    return ChatHistoryResponse(
        repo_url=repo_url,
        messages=[
            ChatMessageOut(
                id=m["id"],
                role=m["role"],
                content=m["content"],
                created_at=m["created_at"],
                agent=m.get("agent"),
            )
            for m in messages
        ],
    )


@router.delete("/history")
def delete_history(
    repo_url: str = Query(..., description="Full repo URL to clear history for"),
    agent: Optional[str] = Query(None, description="Optional agent type to clear"),
    user_id: str = Depends(get_current_user),
):
    """Clear chat messages for a user+repo pair (optionally filtered by agent)."""
    clear_chat_history(user_id, repo_url, agent=agent)
    return {"status": "cleared"}


class ChatRepoItem(BaseModel):
    repo_url: str
    last_message_at: str
    message_count: int


@router.get("/repos", response_model=list[ChatRepoItem])
def get_chat_repos(user_id: str = Depends(get_current_user)):
    """Return every distinct repo that has chat messages for this user, newest first."""
    return get_all_chat_repos(user_id)
