-- Create the analysis_sessions table
CREATE TABLE IF NOT EXISTS analysis_sessions (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    user_id TEXT NOT NULL,
    repo_url TEXT NOT NULL,
    query TEXT NOT NULL,
    agents_run TEXT[] DEFAULT ARRAY[]::TEXT[],
    statuses JSONB DEFAULT '{}'::JSONB,
    executive_summary TEXT DEFAULT '',
    explorer_result JSONB,
    trace_result JSONB,
    security_result JSONB,
    visualization_result JSONB
);

-- Enable Row Level Security
ALTER TABLE analysis_sessions ENABLE ROW LEVEL SECURITY;

-- Create policy "Users see own analyses"
CREATE POLICY "Users see own analyses" 
ON analysis_sessions 
FOR ALL
TO authenticated
USING (auth.uid()::text = user_id);

-- If you want to allow service role to bypass RLS
CREATE POLICY "Service role full access"
ON analysis_sessions
FOR ALL
TO service_role
USING (true);

-- Create indexes for better performance
CREATE INDEX IF NOT EXISTS idx_analysis_sessions_user_id ON analysis_sessions(user_id);
CREATE INDEX IF NOT EXISTS idx_analysis_sessions_created_at ON analysis_sessions(created_at DESC);