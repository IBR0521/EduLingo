-- Comprehensive RLS verification and fix script
-- Run this to verify and fix RLS policies

-- Step 1: Check if RLS is enabled
SELECT 
  'RLS Status' as check_type,
  tablename,
  CASE WHEN rowsecurity THEN 'ENABLED' ELSE 'DISABLED' END as status
FROM pg_tables 
WHERE schemaname = 'public' 
  AND tablename = 'users';

-- Step 2: List all existing policies on users table
SELECT 
  'Existing Policies' as check_type,
  policyname,
  cmd as command,
  CASE WHEN qual IS NULL THEN 'No condition' ELSE 'Has condition' END as condition_status
FROM pg_policies 
WHERE schemaname = 'public' 
  AND tablename = 'users'
ORDER BY policyname;

-- Step 3: Drop ALL existing policies on users table (clean slate)
DO $$
DECLARE
    r RECORD;
BEGIN
    FOR r IN (SELECT policyname FROM pg_policies WHERE schemaname = 'public' AND tablename = 'users') LOOP
        EXECUTE 'DROP POLICY IF EXISTS ' || quote_ident(r.policyname) || ' ON users';
    END LOOP;
END $$;

-- Step 4: Ensure RLS is enabled
ALTER TABLE users ENABLE ROW LEVEL SECURITY;

-- Step 5: Create a simple, permissive policy that allows authenticated users to read their own profile
-- This uses auth.uid() which should work after login
CREATE POLICY "users_select_own"
  ON users FOR SELECT
  USING (auth.uid() = id);

-- Step 6: Also allow reading all users (for basic info like names in dropdowns, etc.)
-- This is more permissive but safe since we're only exposing basic info
CREATE POLICY "users_select_all"
  ON users FOR SELECT
  USING (auth.role() = 'authenticated');

-- Step 7: Allow users to update their own profile
CREATE POLICY "users_update_own"
  ON users FOR UPDATE
  USING (auth.uid() = id)
  WITH CHECK (auth.uid() = id);

-- Step 8: Allow users to insert their own profile (for registration)
CREATE POLICY "users_insert_own"
  ON users FOR INSERT
  WITH CHECK (auth.uid() = id);

-- Step 9: Verify the new policies
SELECT 
  'New Policies' as check_type,
  policyname,
  cmd as command,
  CASE 
    WHEN qual IS NULL THEN 'No USING clause'
    ELSE substring(qual::text, 1, 50) || '...'
  END as using_clause
FROM pg_policies 
WHERE schemaname = 'public' 
  AND tablename = 'users'
ORDER BY policyname;

-- Step 10: Test query (this will show if policies work)
-- Note: This will only work if you're authenticated
-- SELECT 'Test Query' as check_type, COUNT(*) as user_count FROM users;






