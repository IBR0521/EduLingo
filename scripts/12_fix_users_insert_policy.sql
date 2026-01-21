-- Fix users table INSERT policy to allow all roles during registration
-- This ensures users can create profiles with any role (student, teacher, main_teacher, parent)

-- Step 1: Check current INSERT policies
SELECT 
  'Current INSERT Policies' as check_type,
  policyname,
  cmd as command,
  CASE 
    WHEN with_check IS NULL THEN 'No WITH CHECK clause'
    ELSE substring(with_check::text, 1, 100) || '...'
  END as with_check_clause
FROM pg_policies 
WHERE schemaname = 'public' 
  AND tablename = 'users'
  AND cmd = 'INSERT'
ORDER BY policyname;

-- Step 2: Drop existing INSERT policies
DROP POLICY IF EXISTS "Users can insert own profile" ON users;
DROP POLICY IF EXISTS "users_insert_own" ON users;

-- Step 3: Create a permissive INSERT policy that allows any authenticated user to insert their own profile
-- This policy allows inserting with ANY role as long as auth.uid() = id
CREATE POLICY "users_insert_own"
  ON users FOR INSERT
  WITH CHECK (
    auth.uid() = id AND
    auth.role() = 'authenticated'
  );

-- Step 4: Verify the policy was created
SELECT 
  'New INSERT Policy' as check_type,
  policyname,
  cmd as command,
  CASE 
    WHEN with_check IS NULL THEN 'No WITH CHECK clause'
    ELSE substring(with_check::text, 1, 100) || '...'
  END as with_check_clause
FROM pg_policies 
WHERE schemaname = 'public' 
  AND tablename = 'users'
  AND cmd = 'INSERT'
ORDER BY policyname;

-- Step 5: Test that the policy works (this is informational only)
-- The policy should allow inserts where:
-- - auth.uid() matches the id being inserted
-- - User is authenticated
-- - Role can be any valid role (student, teacher, main_teacher, parent)

