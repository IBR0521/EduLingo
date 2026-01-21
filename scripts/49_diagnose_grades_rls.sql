-- ============================================================================
-- DIAGNOSTIC SCRIPT FOR GRADES RLS ISSUES
-- ============================================================================
-- Run this to check current RLS policies and see what might be wrong
-- ============================================================================

-- Check if RLS is enabled on grades table
SELECT 
  schemaname,
  tablename,
  rowsecurity as rls_enabled
FROM pg_tables
WHERE schemaname = 'public' AND tablename = 'grades';

-- Check all existing policies on grades table
SELECT 
  policyname,
  cmd as command,
  CASE 
    WHEN qual IS NULL THEN 'No USING clause'
    ELSE substring(qual::text, 1, 200)
  END as using_clause,
  CASE 
    WHEN with_check IS NULL THEN 'No WITH CHECK clause'
    ELSE substring(with_check::text, 1, 200)
  END as with_check_clause
FROM pg_policies
WHERE schemaname = 'public' AND tablename = 'grades'
ORDER BY cmd, policyname;

-- Check if groups table has the expected columns
SELECT 
  column_name,
  data_type,
  is_nullable
FROM information_schema.columns
WHERE table_schema = 'public' 
  AND table_name = 'groups'
  AND column_name IN ('id', 'teacher_id', 'created_by')
ORDER BY column_name;

-- Check if users table has role column
SELECT 
  column_name,
  data_type,
  udt_name
FROM information_schema.columns
WHERE table_schema = 'public' 
  AND table_name = 'users'
  AND column_name = 'role';

-- Check sample groups to see structure
SELECT 
  id,
  name,
  teacher_id,
  created_by
FROM groups
LIMIT 5;

-- ============================================================================
-- AFTER RUNNING THE FIX SCRIPT, CHECK IF POLICIES WERE CREATED:
-- ============================================================================
-- You should see INSERT, UPDATE, DELETE policies for teachers
-- ============================================================================

