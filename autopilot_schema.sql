-- Create autopilot_data table
CREATE TABLE IF NOT EXISTS autopilot_data (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID NOT NULL, -- You can add REFERENCES users(id) if you have a users table
    name TEXT NOT NULL,
    is_active BOOLEAN NOT NULL DEFAULT false,
    niche_preset_id TEXT, -- Nullable for custom niches
    niche_value TEXT NOT NULL,
    voice_id TEXT NOT NULL,
    platforms JSONB NOT NULL DEFAULT '{}'::jsonb,
    schedule_cron TEXT NOT NULL,
    last_run_at TIMESTAMPTZ,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- Add an index on user_id for faster queries
CREATE INDEX IF NOT EXISTS idx_autopilot_data_user_id ON autopilot_data(user_id);

-- Optional: Enable Row Level Security (RLS)
ALTER TABLE autopilot_data ENABLE ROW LEVEL SECURITY;

-- Optional: Add trigger for updated_at
CREATE OR REPLACE FUNCTION update_modified_column()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = NOW();
    RETURN NEW;
END;
$$ language 'plpgsql';

CREATE TRIGGER update_autopilot_data_modtime
BEFORE UPDATE ON autopilot_data
FOR EACH ROW
EXECUTE FUNCTION update_modified_column();