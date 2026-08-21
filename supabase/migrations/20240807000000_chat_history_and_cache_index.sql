-- Index to speed up cache lookups by repo_url
CREATE INDEX IF NOT EXISTS idx_analysis_sessions_repo_url
    ON analysis_sessions(repo_url, created_at DESC);

-- Chat messages table for persistent chat history
CREATE TABLE IF NOT EXISTS chat_messages (
    id          UUID                     DEFAULT gen_random_uuid() PRIMARY KEY,
    created_at  TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    user_id     TEXT        NOT NULL,
    repo_url    TEXT        NOT NULL,
    role        TEXT        NOT NULL CHECK (role IN ('user', 'assistant')),
    content     TEXT        NOT NULL
);

-- Enable Row Level Security
ALTER TABLE chat_messages ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users see own messages"
    ON chat_messages FOR ALL TO authenticated
    USING (auth.uid()::text = user_id);

CREATE POLICY "Service role full access on chat"
    ON chat_messages FOR ALL TO service_role
    USING (true);

CREATE INDEX IF NOT EXISTS idx_chat_messages_user_repo
    ON chat_messages(user_id, repo_url, created_at ASC);
