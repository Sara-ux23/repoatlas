from fastapi import APIRouter, HTTPException
from pydantic import BaseModel
from typing import Optional, Any

router = APIRouter(prefix="/user-query", tags=["User Query Agent"])


class ChatMessage(BaseModel):
    role: str  # "user" or "assistant"
    content: str


class UserQueryRequest(BaseModel):
    query: str
    chat_history: Optional[list[ChatMessage]] = None
    repo_path: Optional[str] = None


class UserQueryResponse(BaseModel):
    answer: str
    context_used: bool
    repo_path: Optional[str] = None
    error: Optional[str] = None


@router.post("/", response_model=UserQueryResponse)
async def user_query(request: UserQueryRequest):
    from app.agents.user_query_agent import run_user_query
    
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
        
        return UserQueryResponse(**result)
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))
