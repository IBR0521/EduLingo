-- Quick test to check if RLS policies exist
-- Run this in Supabase SQL Editor to diagnose the issue

-- Check if RLS is enabled
SELECT 
  schemaname,
  tablename,
  rowsecurity as rls_enabled
FROM pg_tables 
WHERE schemaname = 'public' 
  AND tablename = 'users';

-- Check existing policies on users table
SELECT 
  schemaname,
  tablename,
  policyname,
  permissive,
  roles,
  cmd,
  qual,
  with_check
FROM pg_policies 
WHERE schemaname = 'public' 
  AND tablename = 'users';

-- If the above returns no rows, RLS policies are missing!
-- Run scripts/06_setup_rls_policies.sql to fix this








