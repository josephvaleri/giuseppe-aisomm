-- Create table for storing moderation decisions for model retraining
CREATE TABLE IF NOT EXISTS moderation_decisions (
    id SERIAL PRIMARY KEY,
    qa_id INTEGER NOT NULL REFERENCES questions_answers(qa_id) ON DELETE CASCADE,
    moderator_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
    decision VARCHAR(20) NOT NULL CHECK (decision IN ('accepted', 'rejected', 'edited')),
    edited_answer TEXT,
    moderation_notes TEXT,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Add RLS policies
ALTER TABLE moderation_decisions ENABLE ROW LEVEL SECURITY;

-- Policy for moderators to insert decisions
CREATE POLICY "Moderators can insert decisions" ON moderation_decisions
    FOR INSERT WITH CHECK (
        EXISTS (
            SELECT 1 FROM profiles 
            WHERE user_id = auth.uid() 
            AND role_id IN ('moderator', 'admin')
        )
    );

-- Policy for moderators to view all decisions
CREATE POLICY "Moderators can view decisions" ON moderation_decisions
    FOR SELECT USING (
        EXISTS (
            SELECT 1 FROM profiles 
            WHERE user_id = auth.uid() 
            AND role_id IN ('moderator', 'admin')
        )
    );

-- Policy for moderators to update their own decisions
CREATE POLICY "Moderators can update decisions" ON moderation_decisions
    FOR UPDATE USING (
        EXISTS (
            SELECT 1 FROM profiles 
            WHERE user_id = auth.uid() 
            AND role_id IN ('moderator', 'admin')
        )
    );

-- Create index for efficient queries
CREATE INDEX IF NOT EXISTS idx_moderation_decisions_qa_id ON moderation_decisions(qa_id);
CREATE INDEX IF NOT EXISTS idx_moderation_decisions_decision ON moderation_decisions(decision);
CREATE INDEX IF NOT EXISTS idx_moderation_decisions_created_at ON moderation_decisions(created_at);
