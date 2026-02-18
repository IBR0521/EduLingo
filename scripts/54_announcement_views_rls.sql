-- RLS Policies for announcement_views table
-- This enables Row Level Security and creates appropriate policies

-- Enable RLS on announcement_views table
ALTER TABLE announcement_views ENABLE ROW LEVEL SECURITY;

-- Drop existing policies if they exist (to avoid conflicts)
DROP POLICY IF EXISTS "Users can insert own view records" ON announcement_views;
DROP POLICY IF EXISTS "Users can read own view records" ON announcement_views;
DROP POLICY IF EXISTS "Users can read view counts for their groups" ON announcement_views;
DROP POLICY IF EXISTS "Teachers can read view counts for their groups" ON announcement_views;

-- Policy 1: Users can insert their own view records
-- This allows students to mark announcements as viewed
-- Users can only insert view records for themselves and only for announcements in groups they belong to
CREATE POLICY "Users can insert own view records"
  ON announcement_views FOR INSERT
  WITH CHECK (
    auth.uid() = user_id AND
    -- Ensure the announcement exists and belongs to a group the user is part of
    announcement_id IN (
      SELECT a.id 
      FROM announcements a
      WHERE a.group_id IN (
        SELECT group_id 
        FROM group_students 
        WHERE student_id = auth.uid()
        UNION
        SELECT id 
        FROM groups 
        WHERE teacher_id = auth.uid() 
           OR created_by = auth.uid()
           OR auth.uid() IN (SELECT id FROM users WHERE role = 'main_teacher')
      )
    )
  );

-- Policy 2: Users can read view records for announcements in their groups
-- This allows users to:
-- - Check which announcements they've viewed (their own records)
-- - See view counts for announcements in groups they belong to (for analytics)
CREATE POLICY "Users can read view records for their groups"
  ON announcement_views FOR SELECT
  USING (
    -- Users can read their own view records
    auth.uid() = user_id
    OR
    -- Users can read view counts for announcements in groups they belong to
    announcement_id IN (
      SELECT a.id 
      FROM announcements a
      WHERE a.group_id IN (
        SELECT group_id 
        FROM group_students 
        WHERE student_id = auth.uid()
        UNION
        SELECT id 
        FROM groups 
        WHERE teacher_id = auth.uid() 
           OR created_by = auth.uid()
           OR auth.uid() IN (SELECT id FROM users WHERE role = 'main_teacher')
      )
    )
  );

