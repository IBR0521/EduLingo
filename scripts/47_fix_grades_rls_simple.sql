-- ============================================================================
-- SIMPLE FIX FOR GRADES RLS POLICIES
-- ============================================================================
-- This is a simpler version that should work correctly
-- Run this in Supabase SQL Editor
-- ============================================================================

-- Drop existing policies if they exist
DROP POLICY IF EXISTS "Teachers can insert grades" ON grades;
DROP POLICY IF EXISTS "Teachers can update grades" ON grades;
DROP POLICY IF EXISTS "Teachers can delete grades" ON grades;
DROP POLICY IF EXISTS "Teachers can manage grades" ON grades;

-- INSERT Policy: Teachers can insert grades for students in their groups
-- Use a simpler approach that references columns directly
CREATE POLICY "Teachers can insert grades"
  ON grades FOR INSERT
  WITH CHECK (
    -- Must be authenticated
    auth.role() = 'authenticated'
    AND
    -- Must be a teacher or main teacher
    auth.uid() IN (
      SELECT id FROM users WHERE role IN ('main_teacher', 'teacher')
    )
    AND
    -- The group must be managed by this teacher
    group_id IN (
      SELECT id FROM groups 
      WHERE 
        teacher_id = auth.uid() 
        OR created_by = auth.uid()
        OR auth.uid() IN (SELECT id FROM users WHERE role = 'main_teacher')
    )
  );

-- UPDATE Policy: Teachers can update grades for their groups
CREATE POLICY "Teachers can update grades"
  ON grades FOR UPDATE
  USING (
    -- Must be a teacher or main teacher
    auth.uid() IN (
      SELECT id FROM users WHERE role IN ('main_teacher', 'teacher')
    )
    AND
    -- The group must be managed by this teacher
    group_id IN (
      SELECT id FROM groups 
      WHERE 
        teacher_id = auth.uid() 
        OR created_by = auth.uid()
        OR auth.uid() IN (SELECT id FROM users WHERE role = 'main_teacher')
    )
  )
  WITH CHECK (
    -- Same check for the updated row
    auth.uid() IN (
      SELECT id FROM users WHERE role IN ('main_teacher', 'teacher')
    )
    AND
    group_id IN (
      SELECT id FROM groups 
      WHERE 
        teacher_id = auth.uid() 
        OR created_by = auth.uid()
        OR auth.uid() IN (SELECT id FROM users WHERE role = 'main_teacher')
    )
  );

-- DELETE Policy: Teachers can delete grades for their groups
CREATE POLICY "Teachers can delete grades"
  ON grades FOR DELETE
  USING (
    -- Must be a teacher or main teacher
    auth.uid() IN (
      SELECT id FROM users WHERE role IN ('main_teacher', 'teacher')
    )
    AND
    -- The group must be managed by this teacher
    group_id IN (
      SELECT id FROM groups 
      WHERE 
        teacher_id = auth.uid() 
        OR created_by = auth.uid()
        OR auth.uid() IN (SELECT id FROM users WHERE role = 'main_teacher')
    )
  );

-- Verify policies were created
SELECT 
  policyname,
  cmd as command
FROM pg_policies
WHERE schemaname = 'public'
  AND tablename = 'grades'
ORDER BY cmd, policyname;

-- ============================================================================
-- EXPECTED RESULT: You should see 5 policies:
-- 1. Students can read own grades (SELECT)
-- 2. Teachers can read grades (SELECT)
-- 3. Teachers can insert grades (INSERT)
-- 4. Teachers can update grades (UPDATE)
-- 5. Teachers can delete grades (DELETE)
-- ============================================================================

