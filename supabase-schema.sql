-- TzoofTube Supabase Database Schema
-- Run this in your Supabase SQL Editor

-- Create config table for storing app configuration
CREATE TABLE IF NOT EXISTS config (
  key TEXT PRIMARY KEY,
  value INTEGER NOT NULL,
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Create usage table for tracking daily watch time
CREATE TABLE IF NOT EXISTS usage (
  date DATE PRIMARY KEY,
  seconds INTEGER NOT NULL DEFAULT 0,
  videos_count INTEGER NOT NULL DEFAULT 0,
  counted_videos JSONB DEFAULT '[]'::jsonb,
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Insert default configuration (3 hours = 10800 seconds)
INSERT INTO config (key, value, updated_at)
VALUES ('daily_time_limit', 10800, NOW())
ON CONFLICT (key) DO NOTHING;

-- Create index on usage date for faster queries
CREATE INDEX IF NOT EXISTS idx_usage_date ON usage(date);

-- Enable Row Level Security (RLS)
ALTER TABLE config ENABLE ROW LEVEL SECURITY;
ALTER TABLE usage ENABLE ROW LEVEL SECURITY;

-- Create policies to allow public read/write
-- Note: For production, you should restrict these policies
CREATE POLICY "Allow public read access on config"
  ON config FOR SELECT
  USING (true);

CREATE POLICY "Allow public write access on config"
  ON config FOR ALL
  USING (true);

CREATE POLICY "Allow public read access on usage"
  ON usage FOR SELECT
  USING (true);

CREATE POLICY "Allow public write access on usage"
  ON usage FOR ALL
  USING (true);
