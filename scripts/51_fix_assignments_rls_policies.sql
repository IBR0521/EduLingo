-- ============================================================================
-- FIX ASSIGNMENTS RLS POLICIES - Add UPDATE and DELETE policies
-- ============================================================================
-- This script adds missing UPDATE and DELETE policies for the assignments table
-- Run this in Supabase SQL Editor
-- ============================================================================

-- Drop existing policies if they exist (to avoid conflicts)
DROP POLICY IF EXISTS "Teachers can update assignments" ON assignments;
DROP POLICY IF EXISTS "Teachers can delete assignments" ON assignments;
DROP POLICY IF EXISTS "Teachers can manage assignments" ON assignments;

-- UPDATE Policy: Teachers can update assignments for their groups
CREATE POLICY "Teachers can update assignments"
  ON assignments FOR UPDATE
  USING (
    -- Must be authenticated
    auth.role() = 'authenticated'
    AND
    (
      -- Main teachers can update any assignment
      auth.uid() IN (SELECT id FROM users WHERE role = 'main_teacher')
      OR
      -- Regular teachers can update assignments they created or for groups they manage
      (
        auth.uid() IN (SELECT id FROM users WHERE role = 'teacher')
        AND
        (
          created_by = auth.uid()
          OR
          group_id IN (
            SELECT id FROM groups 
            WHERE teacher_id = auth.uid() OR created_by = auth.uid()
          )
        )
      )
    )
  )
  WITH CHECK (
    -- Same check for the updated row
    auth.role() = 'authenticated'
    AND
    (
      auth.uid() IN (SELECT id FROM users WHERE role = 'main_teacher')
      OR
      (
        auth.uid() IN (SELECT id FROM users WHERE role = 'teacher')
        AND
        (
          created_by = auth.uid()
          OR
          group_id IN (
            SELECT id FROM groups 
            WHERE teacher_id = auth.uid() OR created_by = auth.uid()
          )
        )
      )
    )
  );

-- DELETE Policy: Teachers can delete assignments for their groups
CREATE POLICY "Teachers can delete assignments"
  ON assignments FOR DELETE
  USING (
    -- Must be authenticated
    auth.role() = 'authenticated'
    AND
    (
      -- Main teachers can delete any assignment
      auth.uid() IN (SELECT id FROM users WHERE role = 'main_teacher')
      OR
      -- Regular teachers can delete assignments they created or for groups they manage
      (
        auth.uid() IN (SELECT id FROM users WHERE role = 'teacher')
        AND
        (
          created_by = auth.uid()
          OR
          group_id IN (
            SELECT id FROM groups 
            WHERE teacher_id = auth.uid() OR created_by = auth.uid()
          )
        )
      )
    )
  );

-- Verify policies were created
SELECT 
  policyname,
  cmd as command,
  CASE 
    WHEN qual IS NULL THEN 'No USING clause'
    ELSE substring(qual::text, 1, 150)
  END as using_clause,
  CASE 
    WHEN with_check IS NULL THEN 'No WITH CHECK clause'
    ELSE substring(with_check::text, 1, 150)
  END as with_check_clause
FROM pg_policies
WHERE schemaname = 'public'
  AND tablename = 'assignments'
ORDER BY cmd, policyname;

-- ============================================================================
-- EXPECTED RESULT: You should see 3 policies:
-- 1. Users can read assignments (SELECT)
-- 2. Teachers can create assignments (INSERT)
-- 3. Teachers can update assignments (UPDATE)
-- 4. Teachers can delete assignments (DELETE)
-- ============================================================================

