-- RLS Policies for announcements table
-- This enables Row Level Security and creates appropriate policies

-- Enable RLS on announcements table
ALTER TABLE announcements ENABLE ROW LEVEL SECURITY;

-- Drop existing policies if they exist (to avoid conflicts)
DROP POLICY IF EXISTS "Users can read announcements in their groups" ON announcements;
DROP POLICY IF EXISTS "Teachers can create announcements" ON announcements;
DROP POLICY IF EXISTS "Teachers can update announcements" ON announcements;
DROP POLICY IF EXISTS "Teachers can delete announcements" ON announcements;

-- Policy 1: Users can read announcements in their groups
-- Students can read announcements for groups they belong to
-- Teachers can read announcements for groups they manage
-- Main teachers can read all announcements
CREATE POLICY "Users can read announcements in their groups"
  ON announcements FOR SELECT
  USING (
    -- Students can read announcements for groups they belong to
    group_id IN (
      SELECT group_id 
      FROM group_students 
      WHERE student_id = auth.uid()
    )
    OR
    -- Teachers can read announcements for groups they manage
    group_id IN (
      SELECT id 
      FROM groups 
      WHERE teacher_id = auth.uid() 
         OR created_by = auth.uid()
    )
    OR
    -- Main teachers can read all announcements
    auth.uid() IN (SELECT id FROM users WHERE role = 'main_teacher')
  );

-- Policy 2: Teachers can create announcements
-- Teachers can create announcements for groups they manage
-- Main teachers can create announcements for any group
CREATE POLICY "Teachers can create announcements"
  ON announcements FOR INSERT
  WITH CHECK (
    -- Teachers can create announcements for groups they manage
    group_id IN (
      SELECT id 
      FROM groups 
      WHERE teacher_id = auth.uid() 
         OR created_by = auth.uid()
    )
    OR
    -- Main teachers can create announcements for any group
    auth.uid() IN (SELECT id FROM users WHERE role = 'main_teacher')
  );

-- Policy 3: Teachers can update announcements
-- Teachers can update announcements they created or in groups they manage
-- Main teachers can update any announcement
CREATE POLICY "Teachers can update announcements"
  ON announcements FOR UPDATE
  USING (
    -- Teachers can update announcements they created
    created_by = auth.uid()
    OR
    -- Teachers can update announcements in groups they manage
    group_id IN (
      SELECT id 
      FROM groups 
      WHERE teacher_id = auth.uid() 
         OR created_by = auth.uid()
    )
    OR
    -- Main teachers can update any announcement
    auth.uid() IN (SELECT id FROM users WHERE role = 'main_teacher')
  )
  WITH CHECK (
    -- Same conditions for the updated row
    created_by = auth.uid()
    OR
    group_id IN (
      SELECT id 
      FROM groups 
      WHERE teacher_id = auth.uid() 
         OR created_by = auth.uid()
    )
    OR
    auth.uid() IN (SELECT id FROM users WHERE role = 'main_teacher')
  );

-- Policy 4: Teachers can delete announcements
-- Teachers can delete announcements they created or in groups they manage
-- Main teachers can delete any announcement
CREATE POLICY "Teachers can delete announcements"
  ON announcements FOR DELETE
  USING (
    -- Teachers can delete announcements they created
    created_by = auth.uid()
    OR
    -- Teachers can delete announcements in groups they manage
    group_id IN (
      SELECT id 
      FROM groups 
      WHERE teacher_id = auth.uid() 
         OR created_by = auth.uid()
    )
    OR
    -- Main teachers can delete any announcement
    auth.uid() IN (SELECT id FROM users WHERE role = 'main_teacher')
  );



