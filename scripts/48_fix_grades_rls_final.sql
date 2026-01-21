-- ============================================================================
-- FINAL FIX FOR GRADES RLS POLICIES
-- ============================================================================
-- This version properly handles main_teachers and regular teachers
-- Run this in Supabase SQL Editor
-- ============================================================================

-- Drop existing policies if they exist
DROP POLICY IF EXISTS "Teachers can insert grades" ON grades;
DROP POLICY IF EXISTS "Teachers can update grades" ON grades;
DROP POLICY IF EXISTS "Teachers can delete grades" ON grades;
DROP POLICY IF EXISTS "Teachers can manage grades" ON grades;

-- INSERT Policy: Teachers can insert grades for students in their groups
-- Main teachers can insert for any group, regular teachers only for their groups
CREATE POLICY "Teachers can insert grades"
  ON grades FOR INSERT
  WITH CHECK (
    -- Must be authenticated
    auth.role() = 'authenticated'
    AND
    (
      -- Main teachers can insert grades for any group
      auth.uid() IN (SELECT id FROM users WHERE role = 'main_teacher')
      OR
      -- Regular teachers can insert grades for groups they manage
      (
        auth.uid() IN (SELECT id FROM users WHERE role = 'teacher')
        AND
        group_id IN (
          SELECT id FROM groups 
          WHERE teacher_id = auth.uid() OR created_by = auth.uid()
        )
      )
    )
  );

-- UPDATE Policy: Teachers can update grades for their groups
CREATE POLICY "Teachers can update grades"
  ON grades FOR UPDATE
  USING (
    -- Must be authenticated
    auth.role() = 'authenticated'
    AND
    (
      -- Main teachers can update any grade
      auth.uid() IN (SELECT id FROM users WHERE role = 'main_teacher')
      OR
      -- Regular teachers can update grades for groups they manage
      (
        auth.uid() IN (SELECT id FROM users WHERE role = 'teacher')
        AND
        group_id IN (
          SELECT id FROM groups 
          WHERE teacher_id = auth.uid() OR created_by = auth.uid()
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
        group_id IN (
          SELECT id FROM groups 
          WHERE teacher_id = auth.uid() OR created_by = auth.uid()
        )
      )
    )
  );

-- DELETE Policy: Teachers can delete grades for their groups
CREATE POLICY "Teachers can delete grades"
  ON grades FOR DELETE
  USING (
    -- Must be authenticated
    auth.role() = 'authenticated'
    AND
    (
      -- Main teachers can delete any grade
      auth.uid() IN (SELECT id FROM users WHERE role = 'main_teacher')
      OR
      -- Regular teachers can delete grades for groups they manage
      (
        auth.uid() IN (SELECT id FROM users WHERE role = 'teacher')
        AND
        group_id IN (
          SELECT id FROM groups 
          WHERE teacher_id = auth.uid() OR created_by = auth.uid()
        )
      )
    )
  );

-- Verify policies were created
SELECT 
  policyname,
  cmd as command,
  qual as using_clause,
  with_check
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

