-- Migration: Add agent column to chat_messages table for scoping chat history by agent type

ALTER TABLE chat_messages 
    ADD COLUMN IF NOT EXISTS agent TEXT DEFAULT 'user_query';

-- Index to optimize querying chat history by user, repo, and agent
CREATE INDEX IF NOT EXISTS idx_chat_messages_user_repo_agent
    ON chat_messages(user_id, repo_url, agent, created_at ASC);
