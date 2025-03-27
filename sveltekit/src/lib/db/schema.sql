-- Create user_trials table for managing free trials
CREATE TABLE IF NOT EXISTS user_trials (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
    trial_start TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT NOW(),
    trial_end TIMESTAMP WITH TIME ZONE NOT NULL,
    is_active BOOLEAN NOT NULL DEFAULT TRUE,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Create index on user_id for faster lookups
CREATE INDEX IF NOT EXISTS idx_user_trials_user_id ON user_trials(user_id);

-- Create index on is_active for filtering active trials
CREATE INDEX IF NOT EXISTS idx_user_trials_is_active ON user_trials(is_active);

-- Add RLS policies to protect the user_trials table
ALTER TABLE user_trials ENABLE ROW LEVEL SECURITY;

-- Users can only see their own trial information
CREATE POLICY user_trials_select_policy ON user_trials 
    FOR SELECT USING (auth.uid() = user_id);

-- Only authenticated users can insert their own trial records
CREATE POLICY user_trials_insert_policy ON user_trials 
    FOR INSERT WITH CHECK (auth.uid() = user_id);

-- Only authenticated users can update their own trial records
CREATE POLICY user_trials_update_policy ON user_trials 
    FOR UPDATE USING (auth.uid() = user_id);

-- Add function to update updated_at timestamp
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = NOW();
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Add trigger to update updated_at on user_trials
CREATE TRIGGER update_user_trials_updated_at
BEFORE UPDATE ON user_trials
FOR EACH ROW EXECUTE FUNCTION update_updated_at_column(); 