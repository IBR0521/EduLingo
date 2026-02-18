-- Create Video Conferencing Integration System
-- This script creates tables for video conference management
-- Run this script in Supabase SQL Editor

-- ============================================================================
-- CLEANUP: Uncomment if you need to drop and recreate tables
-- ============================================================================
-- DROP TABLE IF EXISTS video_conference_participants CASCADE;
-- DROP TABLE IF EXISTS video_conferences CASCADE;

-- ============================================================================
-- STEP 1: Video Conferences Table
-- ============================================================================

CREATE TABLE IF NOT EXISTS video_conferences (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  schedule_id UUID REFERENCES schedule(id) ON DELETE SET NULL,
  group_id UUID REFERENCES groups(id) ON DELETE CASCADE,
  title VARCHAR(255) NOT NULL,
  description TEXT,
  provider VARCHAR(50) NOT NULL CHECK (provider IN ('zoom', 'google_meet', 'microsoft_teams', 'jitsi', 'custom')),
  meeting_id VARCHAR(255) NOT NULL,
  meeting_url TEXT NOT NULL,
  meeting_password VARCHAR(100),
  start_time TIMESTAMP WITH TIME ZONE NOT NULL,
  end_time TIMESTAMP WITH TIME ZONE,
  duration_minutes INTEGER,
  is_recording_enabled BOOLEAN DEFAULT FALSE,
  is_waiting_room_enabled BOOLEAN DEFAULT FALSE,
  recording_url TEXT,
  created_by UUID REFERENCES users(id),
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- ============================================================================
-- STEP 2: Video Conference Participants Table
-- ============================================================================

CREATE TABLE IF NOT EXISTS video_conference_participants (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  conference_id UUID REFERENCES video_conferences(id) ON DELETE CASCADE,
  user_id UUID REFERENCES users(id) ON DELETE CASCADE,
  joined_at TIMESTAMP WITH TIME ZONE,
  left_at TIMESTAMP WITH TIME ZONE,
  duration_seconds INTEGER DEFAULT 0,
  role VARCHAR(20) DEFAULT 'participant' CHECK (role IN ('host', 'co-host', 'participant')),
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  UNIQUE(conference_id, user_id)
);

-- ============================================================================
-- STEP 3: Video Conference Settings (for provider integrations)
-- ============================================================================

CREATE TABLE IF NOT EXISTS video_conference_settings (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID REFERENCES users(id) ON DELETE CASCADE,
  group_id UUID REFERENCES groups(id) ON DELETE CASCADE,
  provider VARCHAR(50) NOT NULL CHECK (provider IN ('zoom', 'google_meet', 'microsoft_teams', 'jitsi')),
  api_key TEXT, -- Encrypted
  api_secret TEXT, -- Encrypted
  account_id VARCHAR(255),
  is_default BOOLEAN DEFAULT FALSE,
  is_active BOOLEAN DEFAULT TRUE,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  UNIQUE(user_id, group_id, provider)
);

-- ============================================================================
-- STEP 4: Create Indexes
-- ============================================================================

DO $$
BEGIN
  IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_schema = 'public' AND table_name = 'video_conferences') THEN
    CREATE INDEX IF NOT EXISTS idx_video_conferences_schedule ON video_conferences(schedule_id);
    CREATE INDEX IF NOT EXISTS idx_video_conferences_group ON video_conferences(group_id);
    CREATE INDEX IF NOT EXISTS idx_video_conferences_start ON video_conferences(start_time);
    CREATE INDEX IF NOT EXISTS idx_video_conferences_provider ON video_conferences(provider);
  END IF;
  IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_schema = 'public' AND table_name = 'video_conference_participants') THEN
    CREATE INDEX IF NOT EXISTS idx_video_participants_conference ON video_conference_participants(conference_id);
    CREATE INDEX IF NOT EXISTS idx_video_participants_user ON video_conference_participants(user_id);
  END IF;
  IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_schema = 'public' AND table_name = 'video_conference_settings') THEN
    CREATE INDEX IF NOT EXISTS idx_video_settings_user ON video_conference_settings(user_id);
    CREATE INDEX IF NOT EXISTS idx_video_settings_group ON video_conference_settings(group_id);
    CREATE INDEX IF NOT EXISTS idx_video_settings_provider ON video_conference_settings(provider);
  END IF;
END $$;






