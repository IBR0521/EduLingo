-- RLS Policies for Enhanced File Management
-- Run this AFTER running 32_enhance_file_management.sql

-- Enable RLS on all file management tables
DO $$
BEGIN
  IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_schema = 'public' AND table_name = 'file_folders') THEN
    ALTER TABLE file_folders ENABLE ROW LEVEL SECURITY;
  END IF;
  IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_schema = 'public' AND table_name = 'file_versions') THEN
    ALTER TABLE file_versions ENABLE ROW LEVEL SECURITY;
  END IF;
  IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_schema = 'public' AND table_name = 'file_tags') THEN
    ALTER TABLE file_tags ENABLE ROW LEVEL SECURITY;
  END IF;
  IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_schema = 'public' AND table_name = 'file_tag_assignments') THEN
    ALTER TABLE file_tag_assignments ENABLE ROW LEVEL SECURITY;
  END IF;
  IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_schema = 'public' AND table_name = 'file_shares') THEN
    ALTER TABLE file_shares ENABLE ROW LEVEL SECURITY;
  END IF;
  IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_schema = 'public' AND table_name = 'storage_quotas') THEN
    ALTER TABLE storage_quotas ENABLE ROW LEVEL SECURITY;
  END IF;
END $$;

-- Drop existing policies if they exist
DO $$
BEGIN
  IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_schema = 'public' AND table_name = 'file_folders') THEN
    DROP POLICY IF EXISTS "Authenticated users can read folders" ON file_folders;
    DROP POLICY IF EXISTS "Users can manage own folders" ON file_folders;
    DROP POLICY IF EXISTS "Teachers can manage group folders" ON file_folders;
  END IF;
  IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_schema = 'public' AND table_name = 'file_versions') THEN
    DROP POLICY IF EXISTS "Authenticated users can read versions" ON file_versions;
    DROP POLICY IF EXISTS "Users can manage own file versions" ON file_versions;
  END IF;
  IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_schema = 'public' AND table_name = 'file_tags') THEN
    DROP POLICY IF EXISTS "Authenticated users can read tags" ON file_tags;
    DROP POLICY IF EXISTS "Authenticated users can create tags" ON file_tags;
  END IF;
  IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_schema = 'public' AND table_name = 'file_tag_assignments') THEN
    DROP POLICY IF EXISTS "Authenticated users can manage tag assignments" ON file_tag_assignments;
  END IF;
  IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_schema = 'public' AND table_name = 'file_shares') THEN
    DROP POLICY IF EXISTS "Users can read shared files" ON file_shares;
    DROP POLICY IF EXISTS "Users can manage own shares" ON file_shares;
  END IF;
  IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_schema = 'public' AND table_name = 'storage_quotas') THEN
    DROP POLICY IF EXISTS "Users can read own quotas" ON storage_quotas;
    DROP POLICY IF EXISTS "Teachers can read group quotas" ON storage_quotas;
  END IF;
END $$;

-- File Folders policies
DO $$
BEGIN
  IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_schema = 'public' AND table_name = 'file_folders') THEN
    -- Authenticated users can read folders for their groups
    IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_schema = 'public' AND table_name = 'group_students') THEN
      EXECUTE 'CREATE POLICY "Authenticated users can read folders"
        ON file_folders FOR SELECT
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

    -- Users can manage folders they created
    CREATE POLICY "Users can manage own folders"
      ON file_folders FOR ALL
      USING (created_by = auth.uid())
      WITH CHECK (created_by = auth.uid());

    -- Teachers can manage folders for their groups
    IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_schema = 'public' AND table_name = 'groups') THEN
      EXECUTE 'CREATE POLICY "Teachers can manage group folders"
        ON file_folders FOR ALL
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

-- File Versions policies
DO $$
BEGIN
  IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_schema = 'public' AND table_name = 'file_versions') AND
     EXISTS (SELECT 1 FROM information_schema.columns WHERE table_schema = 'public' AND table_name = 'file_versions' AND column_name = 'file_id') THEN
    -- Authenticated users can read versions for files they can access
    IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_schema = 'public' AND table_name = 'files') THEN
      EXECUTE 'CREATE POLICY "Authenticated users can read versions"
        ON file_versions FOR SELECT
        USING (
          auth.role() = ''authenticated'' AND
          file_id IN (SELECT id FROM files)
        )';
    END IF;

    -- Users can manage versions for their own files
    IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_schema = 'public' AND table_name = 'files') THEN
      EXECUTE 'CREATE POLICY "Users can manage own file versions"
        ON file_versions FOR ALL
        USING (
          file_id IN (SELECT id FROM files WHERE uploaded_by = auth.uid())
        )
        WITH CHECK (
          file_id IN (SELECT id FROM files WHERE uploaded_by = auth.uid())
        )';
    END IF;
  END IF;
END $$;

-- File Tags policies
DO $$
BEGIN
  IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_schema = 'public' AND table_name = 'file_tags') THEN
    -- Authenticated users can read tags
    CREATE POLICY "Authenticated users can read tags"
      ON file_tags FOR SELECT
      USING (auth.role() = 'authenticated');

    -- Authenticated users can create tags
    CREATE POLICY "Authenticated users can create tags"
      ON file_tags FOR INSERT
      WITH CHECK (auth.role() = 'authenticated');
  END IF;
END $$;

-- File Tag Assignments policies
DO $$
BEGIN
  IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_schema = 'public' AND table_name = 'file_tag_assignments') THEN
    -- Authenticated users can manage tag assignments for files they own
    IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_schema = 'public' AND table_name = 'files') THEN
      EXECUTE 'CREATE POLICY "Authenticated users can manage tag assignments"
        ON file_tag_assignments FOR ALL
        USING (
          auth.role() = ''authenticated'' AND
          file_id IN (SELECT id FROM files WHERE uploaded_by = auth.uid())
        )
        WITH CHECK (
          file_id IN (SELECT id FROM files WHERE uploaded_by = auth.uid())
        )';
    END IF;
  END IF;
END $$;

-- File Shares policies
DO $$
BEGIN
  IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_schema = 'public' AND table_name = 'file_shares') AND
     EXISTS (SELECT 1 FROM information_schema.columns WHERE table_schema = 'public' AND table_name = 'file_shares' AND column_name = 'shared_with_user_id') THEN
    -- Users can read files shared with them
    CREATE POLICY "Users can read shared files"
      ON file_shares FOR SELECT
      USING (shared_with_user_id = auth.uid());

    -- Users can manage shares for their own files
    IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_schema = 'public' AND table_name = 'files') THEN
      EXECUTE 'CREATE POLICY "Users can manage own shares"
        ON file_shares FOR ALL
        USING (
          file_id IN (SELECT id FROM files WHERE uploaded_by = auth.uid())
        )
        WITH CHECK (
          file_id IN (SELECT id FROM files WHERE uploaded_by = auth.uid())
        )';
    END IF;
  END IF;
END $$;

-- Storage Quotas policies
DO $$
BEGIN
  IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_schema = 'public' AND table_name = 'storage_quotas') AND
     EXISTS (SELECT 1 FROM information_schema.columns WHERE table_schema = 'public' AND table_name = 'storage_quotas' AND column_name = 'user_id') THEN
    -- Users can read their own quotas
    CREATE POLICY "Users can read own quotas"
      ON storage_quotas FOR SELECT
      USING (user_id = auth.uid());

    -- Teachers can read quotas for their groups
    IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_schema = 'public' AND table_name = 'groups') THEN
      EXECUTE 'CREATE POLICY "Teachers can read group quotas"
        ON storage_quotas FOR SELECT
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








