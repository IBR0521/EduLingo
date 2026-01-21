-- RLS Policies for Video Conferencing System
-- Run this AFTER running 34_create_video_conferencing.sql

-- Enable RLS on all video conferencing tables
DO $$
BEGIN
  IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_schema = 'public' AND table_name = 'video_conferences') THEN
    ALTER TABLE video_conferences ENABLE ROW LEVEL SECURITY;
  END IF;
  IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_schema = 'public' AND table_name = 'video_conference_participants') THEN
    ALTER TABLE video_conference_participants ENABLE ROW LEVEL SECURITY;
  END IF;
  IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_schema = 'public' AND table_name = 'video_conference_settings') THEN
    ALTER TABLE video_conference_settings ENABLE ROW LEVEL SECURITY;
  END IF;
END $$;

-- Drop existing policies if they exist
DO $$
BEGIN
  IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_schema = 'public' AND table_name = 'video_conferences') THEN
    DROP POLICY IF EXISTS "Authenticated users can read conferences" ON video_conferences;
    DROP POLICY IF EXISTS "Teachers can manage conferences" ON video_conferences;
  END IF;
  IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_schema = 'public' AND table_name = 'video_conference_participants') THEN
    DROP POLICY IF EXISTS "Users can read own participation" ON video_conference_participants;
    DROP POLICY IF EXISTS "Teachers can read participants" ON video_conference_participants;
    DROP POLICY IF EXISTS "Users can manage own participation" ON video_conference_participants;
  END IF;
  IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_schema = 'public' AND table_name = 'video_conference_settings') THEN
    DROP POLICY IF EXISTS "Users can read own settings" ON video_conference_settings;
    DROP POLICY IF EXISTS "Users can manage own settings" ON video_conference_settings;
  END IF;
END $$;

-- Video Conferences policies
DO $$
BEGIN
  IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_schema = 'public' AND table_name = 'video_conferences') THEN
    -- Authenticated users can read conferences for their groups
    IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_schema = 'public' AND table_name = 'group_students') THEN
      EXECUTE 'CREATE POLICY "Authenticated users can read conferences"
        ON video_conferences FOR SELECT
        USING (
          auth.role() = ''authenticated'' AND (
            group_id IN (
              SELECT group_id FROM group_students WHERE student_id = auth.uid()
            ) OR
            group_id IN (
              SELECT id FROM groups WHERE
                teacher_id = auth.uid() OR
                created_by = auth.uid() OR
                auth.uid() IN (SELECT id FROM users WHERE role = ''main_teacher'')
            )
          )
        )';
    END IF;

    -- Teachers can manage conferences
    IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_schema = 'public' AND table_name = 'groups') THEN
      EXECUTE 'CREATE POLICY "Teachers can manage conferences"
        ON video_conferences FOR ALL
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
  END IF;
END $$;

-- Video Conference Participants policies
DO $$
BEGIN
  IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_schema = 'public' AND table_name = 'video_conference_participants') AND
     EXISTS (SELECT 1 FROM information_schema.columns WHERE table_schema = 'public' AND table_name = 'video_conference_participants' AND column_name = 'user_id') THEN
    -- Users can read their own participation
    CREATE POLICY "Users can read own participation"
      ON video_conference_participants FOR SELECT
      USING (user_id = auth.uid());

    -- Teachers can read participants for their conferences
    IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_schema = 'public' AND table_name = 'video_conferences') THEN
      EXECUTE 'CREATE POLICY "Teachers can read participants"
        ON video_conference_participants FOR SELECT
        USING (
          auth.uid() IN (SELECT id FROM users WHERE role IN (''main_teacher'', ''teacher'')) AND
          conference_id IN (
            SELECT id FROM video_conferences WHERE
              created_by = auth.uid() OR
              auth.uid() IN (SELECT id FROM users WHERE role = ''main_teacher'')
          )
        )';
    END IF;

    -- Users can manage their own participation
    CREATE POLICY "Users can manage own participation"
      ON video_conference_participants FOR ALL
      USING (user_id = auth.uid())
      WITH CHECK (user_id = auth.uid());
  END IF;
END $$;

-- Video Conference Settings policies
DO $$
BEGIN
  IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_schema = 'public' AND table_name = 'video_conference_settings') AND
     EXISTS (SELECT 1 FROM information_schema.columns WHERE table_schema = 'public' AND table_name = 'video_conference_settings' AND column_name = 'user_id') THEN
    -- Users can read their own settings
    CREATE POLICY "Users can read own settings"
      ON video_conference_settings FOR SELECT
      USING (user_id = auth.uid());

    -- Users can manage their own settings
    CREATE POLICY "Users can manage own settings"
      ON video_conference_settings FOR ALL
      USING (user_id = auth.uid())
      WITH CHECK (user_id = auth.uid());
  END IF;
END $$;



