-- Enhance File Management with Cloud Storage Integration
-- This script extends the files table and adds cloud storage support
-- Run this script in Supabase SQL Editor

-- ============================================================================
-- STEP 1: Extend files table with enhanced fields
-- ============================================================================

DO $$
BEGIN
  IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_schema = 'public' AND table_name = 'files') THEN
    -- Add cloud storage fields
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_schema = 'public' AND table_name = 'files' AND column_name = 'storage_provider') THEN
      ALTER TABLE files ADD COLUMN storage_provider VARCHAR(50) DEFAULT 'supabase' CHECK (storage_provider IN ('supabase', 'google_drive', 'dropbox', 'onedrive', 's3', 'local'));
    END IF;
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_schema = 'public' AND table_name = 'files' AND column_name = 'storage_path') THEN
      ALTER TABLE files ADD COLUMN storage_path TEXT; -- Path in cloud storage
    END IF;
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_schema = 'public' AND table_name = 'files' AND column_name = 'storage_file_id') THEN
      ALTER TABLE files ADD COLUMN storage_file_id VARCHAR(255); -- External file ID from cloud provider
    END IF;
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_schema = 'public' AND table_name = 'files' AND column_name = 'folder_id') THEN
      ALTER TABLE files ADD COLUMN folder_id UUID REFERENCES file_folders(id) ON DELETE SET NULL; -- Will create folders table
    END IF;
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_schema = 'public' AND table_name = 'files' AND column_name = 'is_public') THEN
      ALTER TABLE files ADD COLUMN is_public BOOLEAN DEFAULT FALSE;
    END IF;
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_schema = 'public' AND table_name = 'files' AND column_name = 'download_count') THEN
      ALTER TABLE files ADD COLUMN download_count INTEGER DEFAULT 0;
    END IF;
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_schema = 'public' AND table_name = 'files' AND column_name = 'thumbnail_url') THEN
      ALTER TABLE files ADD COLUMN thumbnail_url TEXT; -- For image/video previews
    END IF;
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_schema = 'public' AND table_name = 'files' AND column_name = 'mime_type') THEN
      ALTER TABLE files ADD COLUMN mime_type VARCHAR(100); -- More specific than file_type
    END IF;
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_schema = 'public' AND table_name = 'files' AND column_name = 'checksum') THEN
      ALTER TABLE files ADD COLUMN checksum VARCHAR(64); -- For file integrity verification
    END IF;
  END IF;
END $$;

-- ============================================================================
-- STEP 2: Create File Folders Table
-- ============================================================================

CREATE TABLE IF NOT EXISTS file_folders (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name VARCHAR(255) NOT NULL,
  description TEXT,
  parent_folder_id UUID REFERENCES file_folders(id) ON DELETE CASCADE,
  group_id UUID REFERENCES groups(id) ON DELETE CASCADE,
  course_id UUID, -- REFERENCES courses(id) ON DELETE SET NULL, -- Add FK later if courses table exists
  created_by UUID REFERENCES users(id),
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- ============================================================================
-- STEP 3: Create File Versions Table
-- ============================================================================

CREATE TABLE IF NOT EXISTS file_versions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  file_id UUID REFERENCES files(id) ON DELETE CASCADE,
  version_number INTEGER NOT NULL,
  file_url TEXT NOT NULL,
  storage_path TEXT,
  file_size INTEGER,
  checksum VARCHAR(64),
  uploaded_by UUID REFERENCES users(id),
  change_notes TEXT,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  UNIQUE(file_id, version_number)
);

-- ============================================================================
-- STEP 4: Create File Tags Table
-- ============================================================================

CREATE TABLE IF NOT EXISTS file_tags (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name VARCHAR(50) NOT NULL,
  color VARCHAR(7), -- Hex color code
  created_by UUID REFERENCES users(id),
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  UNIQUE(name)
);

-- ============================================================================
-- STEP 5: Create File-Tag Junction Table
-- ============================================================================

CREATE TABLE IF NOT EXISTS file_tag_assignments (
  file_id UUID REFERENCES files(id) ON DELETE CASCADE,
  tag_id UUID REFERENCES file_tags(id) ON DELETE CASCADE,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  PRIMARY KEY (file_id, tag_id)
);

-- ============================================================================
-- STEP 6: Create File Shares Table (for sharing files with specific users)
-- ============================================================================

CREATE TABLE IF NOT EXISTS file_shares (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  file_id UUID REFERENCES files(id) ON DELETE CASCADE,
  shared_with_user_id UUID REFERENCES users(id) ON DELETE CASCADE,
  permission VARCHAR(20) DEFAULT 'view' CHECK (permission IN ('view', 'download', 'edit')),
  expires_at TIMESTAMP WITH TIME ZONE,
  shared_by UUID REFERENCES users(id),
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  UNIQUE(file_id, shared_with_user_id)
);

-- ============================================================================
-- STEP 7: Create Storage Quotas Table
-- ============================================================================

CREATE TABLE IF NOT EXISTS storage_quotas (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID REFERENCES users(id) ON DELETE CASCADE,
  group_id UUID REFERENCES groups(id) ON DELETE CASCADE,
  quota_bytes BIGINT DEFAULT 1073741824, -- Default 1GB
  used_bytes BIGINT DEFAULT 0,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  UNIQUE(user_id, group_id)
);

-- ============================================================================
-- STEP 8: Add Foreign Key Constraints (if courses table exists)
-- ============================================================================

DO $$
BEGIN
  IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_schema = 'public' AND table_name = 'courses') THEN
    IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_schema = 'public' AND table_name = 'file_folders') THEN
      IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'file_folders_course_id_fkey') THEN
        ALTER TABLE file_folders ADD CONSTRAINT file_folders_course_id_fkey FOREIGN KEY (course_id) REFERENCES courses(id) ON DELETE SET NULL;
      END IF;
    END IF;
  END IF;
END $$;

-- ============================================================================
-- STEP 9: Create Indexes
-- ============================================================================

DO $$
BEGIN
  IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_schema = 'public' AND table_name = 'files') THEN
    CREATE INDEX IF NOT EXISTS idx_files_storage_provider ON files(storage_provider);
    CREATE INDEX IF NOT EXISTS idx_files_folder ON files(folder_id);
    CREATE INDEX IF NOT EXISTS idx_files_public ON files(is_public);
    CREATE INDEX IF NOT EXISTS idx_files_assignment ON files(assignment_id);
  END IF;
  IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_schema = 'public' AND table_name = 'file_folders') THEN
    CREATE INDEX IF NOT EXISTS idx_file_folders_parent ON file_folders(parent_folder_id);
    CREATE INDEX IF NOT EXISTS idx_file_folders_group ON file_folders(group_id);
    CREATE INDEX IF NOT EXISTS idx_file_folders_course ON file_folders(course_id);
  END IF;
  IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_schema = 'public' AND table_name = 'file_versions') THEN
    CREATE INDEX IF NOT EXISTS idx_file_versions_file ON file_versions(file_id);
    CREATE INDEX IF NOT EXISTS idx_file_versions_number ON file_versions(file_id, version_number);
  END IF;
  IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_schema = 'public' AND table_name = 'file_tag_assignments') THEN
    CREATE INDEX IF NOT EXISTS idx_file_tag_assignments_file ON file_tag_assignments(file_id);
    CREATE INDEX IF NOT EXISTS idx_file_tag_assignments_tag ON file_tag_assignments(tag_id);
  END IF;
  IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_schema = 'public' AND table_name = 'file_shares') THEN
    CREATE INDEX IF NOT EXISTS idx_file_shares_file ON file_shares(file_id);
    CREATE INDEX IF NOT EXISTS idx_file_shares_user ON file_shares(shared_with_user_id);
  END IF;
  IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_schema = 'public' AND table_name = 'storage_quotas') THEN
    CREATE INDEX IF NOT EXISTS idx_storage_quotas_user ON storage_quotas(user_id);
    CREATE INDEX IF NOT EXISTS idx_storage_quotas_group ON storage_quotas(group_id);
  END IF;
END $$;

-- ============================================================================
-- STEP 10: Create Function to Update Storage Quota
-- ============================================================================

-- Drop existing function if it exists
DROP FUNCTION IF EXISTS update_storage_quota(UUID, UUID, BIGINT) CASCADE;

-- Create function to update storage quota
CREATE OR REPLACE FUNCTION update_storage_quota(
  p_user_id UUID,
  p_group_id UUID,
  p_size_change BIGINT
)
RETURNS VOID AS $$
BEGIN
  INSERT INTO storage_quotas (user_id, group_id, used_bytes)
  VALUES (p_user_id, p_group_id, GREATEST(0, p_size_change))
  ON CONFLICT (user_id, group_id)
  DO UPDATE SET
    used_bytes = GREATEST(0, storage_quotas.used_bytes + p_size_change),
    updated_at = NOW();
END;
$$ LANGUAGE plpgsql;






