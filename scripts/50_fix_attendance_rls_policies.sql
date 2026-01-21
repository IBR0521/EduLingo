-- ============================================================================
-- FIX ATTENDANCE RLS POLICIES - Add INSERT, UPDATE, DELETE policies
-- ============================================================================
-- This script adds missing INSERT, UPDATE, and DELETE policies for the attendance table
-- Run this in Supabase SQL Editor
-- ============================================================================

-- Drop existing policies if they exist (to avoid conflicts)
DROP POLICY IF EXISTS "Teachers can insert attendance" ON attendance;
DROP POLICY IF EXISTS "Teachers can update attendance" ON attendance;
DROP POLICY IF EXISTS "Teachers can delete attendance" ON attendance;
DROP POLICY IF EXISTS "Teachers can manage attendance" ON attendance;

-- INSERT Policy: Teachers can insert attendance for students in their groups
-- Main teachers can insert for any group, regular teachers only for their groups
CREATE POLICY "Teachers can insert attendance"
  ON attendance FOR INSERT
  WITH CHECK (
    -- Must be authenticated
    auth.role() = 'authenticated'
    AND
    (
      -- Main teachers can insert attendance for any schedule
      auth.uid() IN (SELECT id FROM users WHERE role = 'main_teacher')
      OR
      -- Regular teachers can insert attendance for schedules in groups they manage
      (
        auth.uid() IN (SELECT id FROM users WHERE role = 'teacher')
        AND
        schedule_id IN (
          SELECT s.id FROM schedule s
          INNER JOIN groups g ON s.group_id = g.id
          WHERE g.teacher_id = auth.uid() OR g.created_by = auth.uid()
        )
      )
    )
  );

-- UPDATE Policy: Teachers can update attendance for their groups
CREATE POLICY "Teachers can update attendance"
  ON attendance FOR UPDATE
  USING (
    -- Must be authenticated
    auth.role() = 'authenticated'
    AND
    (
      -- Main teachers can update any attendance
      auth.uid() IN (SELECT id FROM users WHERE role = 'main_teacher')
      OR
      -- Regular teachers can update attendance for schedules in groups they manage
      (
        auth.uid() IN (SELECT id FROM users WHERE role = 'teacher')
        AND
        schedule_id IN (
          SELECT s.id FROM schedule s
          INNER JOIN groups g ON s.group_id = g.id
          WHERE g.teacher_id = auth.uid() OR g.created_by = auth.uid()
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
        schedule_id IN (
          SELECT s.id FROM schedule s
          INNER JOIN groups g ON s.group_id = g.id
          WHERE g.teacher_id = auth.uid() OR g.created_by = auth.uid()
        )
      )
    )
  );

-- DELETE Policy: Teachers can delete attendance for their groups
CREATE POLICY "Teachers can delete attendance"
  ON attendance FOR DELETE
  USING (
    -- Must be authenticated
    auth.role() = 'authenticated'
    AND
    (
      -- Main teachers can delete any attendance
      auth.uid() IN (SELECT id FROM users WHERE role = 'main_teacher')
      OR
      -- Regular teachers can delete attendance for schedules in groups they manage
      (
        auth.uid() IN (SELECT id FROM users WHERE role = 'teacher')
        AND
        schedule_id IN (
          SELECT s.id FROM schedule s
          INNER JOIN groups g ON s.group_id = g.id
          WHERE g.teacher_id = auth.uid() OR g.created_by = auth.uid()
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
  AND tablename = 'attendance'
ORDER BY cmd, policyname;

-- ============================================================================
-- EXPECTED RESULT: You should see 4 policies:
-- 1. Users can read attendance (SELECT)
-- 2. Teachers can insert attendance (INSERT)
-- 3. Teachers can update attendance (UPDATE)
-- 4. Teachers can delete attendance (DELETE)
-- ============================================================================

