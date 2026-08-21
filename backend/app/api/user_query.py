from fastapi import APIRouter, HTTPException
from pydantic import BaseModel
from typing import Optional, Any
from app.db.crud import save_chat_message
from app.core.repo_session import repo_session

router = APIRouter(prefix="/user-query", tags=["User Query Agent"])


class ChatMessage(BaseModel):
    role: str  # "user" or "assistant"
    content: str


class UserQueryRequest(BaseModel):
    query: str
    chat_history: Optional[list[ChatMessage]] = None
    repo_path: Optional[str] = None
    user_id: Optional[str] = "anonymous"  # Add user_id support


class UserQueryResponse(BaseModel):
    answer: str
    context_used: bool
    repo_path: Optional[str] = None
    error: Optional[str] = None


@router.post("/", response_model=UserQueryResponse)
async def user_query(request: UserQueryRequest):
    from app.agents.user_query_agent import run_user_query
    import logging
    
    logger = logging.getLogger(__name__)
    logger.info(f"[User Query API] Received query from user_id={request.user_id}, repo={request.repo_path}")
    
    try:
        # Convert Pydantic models to dicts for the agent
        chat_history_dicts = None
        if request.chat_history:
            chat_history_dicts = [{"role": msg.role, "content": msg.content} for msg in request.chat_history]
        
        result = await run_user_query(
            query=request.query,
            chat_history=chat_history_dicts,
            repo_path=request.repo_path
        )
        
        # Save both user message and assistant response to database
        repo_url = result.get("repo_path") or repo_session.repo_url or "unknown"
        user_id = request.user_id or "anonymous"
        
        logger.info(f"[User Query API] Saving chat messages to database (user={user_id}, repo={repo_url})")
        
        # Save user's query
        save_chat_message(
            user_id=user_id,
            repo_url=repo_url,
            role="user",
            content=request.query,
            agent="user_query"
        )
        
        # Save assistant's response
        save_chat_message(
            user_id=user_id,
            repo_url=repo_url,
            role="assistant",
            content=result.get("answer", ""),
            agent="user_query"
        )
        
        logger.info(f"[User Query API] Chat messages saved successfully")
        
        return UserQueryResponse(**result)
    except Exception as e:
        logger.error(f"[User Query API] Query failed: {e}", exc_info=True)
        raise HTTPException(status_code=500, detail=str(e))
