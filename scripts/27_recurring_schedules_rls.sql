-- RLS Policies for Recurring Schedules and Calendar Sync
-- Run this AFTER running 26_create_recurring_schedules.sql

-- Enable RLS on calendar_sync_settings (schedule table already has RLS if enabled)
DO $$
BEGIN
  IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_schema = 'public' AND table_name = 'calendar_sync_settings') THEN
    ALTER TABLE calendar_sync_settings ENABLE ROW LEVEL SECURITY;
  END IF;
END $$;

-- Drop existing policies if they exist
DO $$
BEGIN
  IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_schema = 'public' AND table_name = 'calendar_sync_settings') THEN
    DROP POLICY IF EXISTS "Users can read own calendar settings" ON calendar_sync_settings;
    DROP POLICY IF EXISTS "Users can manage own calendar settings" ON calendar_sync_settings;
    DROP POLICY IF EXISTS "Teachers can read group calendar settings" ON calendar_sync_settings;
  END IF;
END $$;

-- Calendar Sync Settings policies
DO $$
BEGIN
  IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_schema = 'public' AND table_name = 'calendar_sync_settings') AND
     EXISTS (SELECT 1 FROM information_schema.columns WHERE table_schema = 'public' AND table_name = 'calendar_sync_settings' AND column_name = 'user_id') THEN
    -- Users can read their own calendar settings
    CREATE POLICY "Users can read own calendar settings"
      ON calendar_sync_settings FOR SELECT
      USING (user_id = auth.uid());

    -- Teachers can read calendar settings for their groups
    IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_schema = 'public' AND table_name = 'groups') THEN
      EXECUTE 'CREATE POLICY "Teachers can read group calendar settings"
        ON calendar_sync_settings FOR SELECT
        USING (
          auth.uid() IN (SELECT id FROM users WHERE role IN (''main_teacher'', ''teacher'')) AND
          group_id IN (
            SELECT id FROM groups WHERE
              teacher_id = auth.uid() OR
              created_by = auth.uid() OR
              auth.uid() IN (SELECT id FROM users WHERE role = ''main_teacher'')
          )
        )';
    END IF;

    -- Users can manage their own calendar settings
    CREATE POLICY "Users can manage own calendar settings"
      ON calendar_sync_settings FOR ALL
      USING (user_id = auth.uid())
      WITH CHECK (user_id = auth.uid());
  END IF;
END $$;






