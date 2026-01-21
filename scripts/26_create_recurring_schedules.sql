-- Create Recurring Schedule Management System
-- This script extends the schedule table with recurring patterns and calendar sync
-- Run this script in Supabase SQL Editor

-- ============================================================================
-- STEP 1: Add recurring schedule fields to existing schedule table
-- ============================================================================

DO $$
BEGIN
  -- Add recurring pattern fields
  IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_schema = 'public' AND table_name = 'schedule') THEN
    -- Check if columns exist before adding
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_schema = 'public' AND table_name = 'schedule' AND column_name = 'is_recurring') THEN
      ALTER TABLE schedule ADD COLUMN is_recurring BOOLEAN DEFAULT FALSE;
    END IF;
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_schema = 'public' AND table_name = 'schedule' AND column_name = 'recurrence_pattern') THEN
      ALTER TABLE schedule ADD COLUMN recurrence_pattern VARCHAR(50); -- 'daily', 'weekly', 'monthly', 'custom'
    END IF;
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_schema = 'public' AND table_name = 'schedule' AND column_name = 'recurrence_end_date') THEN
      ALTER TABLE schedule ADD COLUMN recurrence_end_date TIMESTAMP WITH TIME ZONE;
    END IF;
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_schema = 'public' AND table_name = 'schedule' AND column_name = 'recurrence_interval') THEN
      ALTER TABLE schedule ADD COLUMN recurrence_interval INTEGER DEFAULT 1; -- Every N days/weeks/months
    END IF;
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_schema = 'public' AND table_name = 'schedule' AND column_name = 'recurrence_days_of_week') THEN
      ALTER TABLE schedule ADD COLUMN recurrence_days_of_week INTEGER[]; -- [1,3,5] for Mon, Wed, Fri (1=Monday)
    END IF;
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_schema = 'public' AND table_name = 'schedule' AND column_name = 'recurrence_day_of_month') THEN
      ALTER TABLE schedule ADD COLUMN recurrence_day_of_month INTEGER; -- For monthly: day of month (1-31)
    END IF;
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_schema = 'public' AND table_name = 'schedule' AND column_name = 'parent_schedule_id') THEN
      ALTER TABLE schedule ADD COLUMN parent_schedule_id UUID REFERENCES schedule(id) ON DELETE CASCADE; -- For recurring instances
    END IF;
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_schema = 'public' AND table_name = 'schedule' AND column_name = 'calendar_sync_id') THEN
      ALTER TABLE schedule ADD COLUMN calendar_sync_id VARCHAR(255); -- For Google Calendar, Outlook, etc.
    END IF;
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_schema = 'public' AND table_name = 'schedule' AND column_name = 'calendar_provider') THEN
      ALTER TABLE schedule ADD COLUMN calendar_provider VARCHAR(50); -- 'google', 'outlook', 'apple', 'ics'
    END IF;
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_schema = 'public' AND table_name = 'schedule' AND column_name = 'is_cancelled') THEN
      ALTER TABLE schedule ADD COLUMN is_cancelled BOOLEAN DEFAULT FALSE; -- For cancelling specific instances
    END IF;
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_schema = 'public' AND table_name = 'schedule' AND column_name = 'location') THEN
      ALTER TABLE schedule ADD COLUMN location VARCHAR(255); -- Physical or virtual location
    END IF;
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_schema = 'public' AND table_name = 'schedule' AND column_name = 'meeting_url') THEN
      ALTER TABLE schedule ADD COLUMN meeting_url TEXT; -- For video conferencing
    END IF;
  END IF;
END $$;

-- ============================================================================
-- STEP 2: Create Calendar Sync Settings Table
-- ============================================================================

CREATE TABLE IF NOT EXISTS calendar_sync_settings (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID REFERENCES users(id) ON DELETE CASCADE,
  group_id UUID REFERENCES groups(id) ON DELETE CASCADE,
  provider VARCHAR(50) NOT NULL CHECK (provider IN ('google', 'outlook', 'apple', 'ics')),
  access_token TEXT, -- Encrypted token
  refresh_token TEXT, -- Encrypted refresh token
  calendar_id VARCHAR(255), -- External calendar ID
  is_active BOOLEAN DEFAULT TRUE,
  last_sync_at TIMESTAMP WITH TIME ZONE,
  sync_direction VARCHAR(20) DEFAULT 'bidirectional' CHECK (sync_direction IN ('import', 'export', 'bidirectional')),
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  UNIQUE(user_id, group_id, provider)
);

-- ============================================================================
-- STEP 3: Create Indexes
-- ============================================================================

DO $$
BEGIN
  IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_schema = 'public' AND table_name = 'schedule') THEN
    CREATE INDEX IF NOT EXISTS idx_schedule_recurring ON schedule(is_recurring);
    CREATE INDEX IF NOT EXISTS idx_schedule_parent ON schedule(parent_schedule_id);
    CREATE INDEX IF NOT EXISTS idx_schedule_calendar_sync ON schedule(calendar_sync_id);
  END IF;
  IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_schema = 'public' AND table_name = 'calendar_sync_settings') THEN
    CREATE INDEX IF NOT EXISTS idx_calendar_sync_user ON calendar_sync_settings(user_id);
    CREATE INDEX IF NOT EXISTS idx_calendar_sync_group ON calendar_sync_settings(group_id);
    CREATE INDEX IF NOT EXISTS idx_calendar_sync_provider ON calendar_sync_settings(provider);
  END IF;
END $$;



