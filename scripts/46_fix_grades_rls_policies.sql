-- ============================================================================
-- FIX GRADES RLS POLICIES - Add INSERT, UPDATE, DELETE policies
-- ============================================================================
-- This script adds missing INSERT, UPDATE, and DELETE policies for the grades table
-- Run this in Supabase SQL Editor
-- ============================================================================

-- Drop existing policies if they exist (to avoid conflicts)
DROP POLICY IF EXISTS "Teachers can insert grades" ON grades;
DROP POLICY IF EXISTS "Teachers can update grades" ON grades;
DROP POLICY IF EXISTS "Teachers can delete grades" ON grades;
DROP POLICY IF EXISTS "Teachers can manage grades" ON grades;

-- INSERT Policy: Teachers can insert grades for students in their groups
-- In WITH CHECK, we can reference columns directly (they refer to the new row)
CREATE POLICY "Teachers can insert grades"
  ON grades FOR INSERT
  WITH CHECK (
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

-- UPDATE Policy: Teachers can update grades they created or for their groups
CREATE POLICY "Teachers can update grades"
  ON grades FOR UPDATE
  USING (
    -- Must be a teacher or main teacher
    auth.uid() IN (
      SELECT id FROM users WHERE role IN ('main_teacher', 'teacher')
    )
    AND
    -- The group must be managed by this teacher
    (
      group_id IN (
        SELECT id FROM groups 
        WHERE teacher_id = auth.uid() 
        OR created_by = auth.uid()
        OR auth.uid() IN (SELECT id FROM users WHERE role = 'main_teacher')
      )
    )
  )
  WITH CHECK (
    -- Same check for the updated row
    auth.uid() IN (
      SELECT id FROM users WHERE role IN ('main_teacher', 'teacher')
    )
    AND
    (
      group_id IN (
        SELECT id FROM groups 
        WHERE teacher_id = auth.uid() 
        OR created_by = auth.uid()
        OR auth.uid() IN (SELECT id FROM users WHERE role = 'main_teacher')
      )
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
    (
      group_id IN (
        SELECT id FROM groups 
        WHERE teacher_id = auth.uid() 
        OR created_by = auth.uid()
        OR auth.uid() IN (SELECT id FROM users WHERE role = 'main_teacher')
      )
    )
  );

-- Verify policies were created
SELECT 
  schemaname,
  tablename,
  policyname,
  cmd as command,
  CASE
    WHEN qual IS NULL THEN 'No USING clause'
    ELSE substring(qual::text, 1, 100) || '...'
  END as using_clause,
  CASE
    WHEN with_check IS NULL THEN 'No WITH CHECK clause'
    ELSE substring(with_check::text, 1, 100) || '...'
  END as with_check_clause
FROM pg_policies
WHERE schemaname = 'public'
  AND tablename = 'grades'
ORDER BY policyname;

-- ============================================================================
-- EXPECTED RESULT: You should see policies for SELECT, INSERT, UPDATE, DELETE
-- ============================================================================

