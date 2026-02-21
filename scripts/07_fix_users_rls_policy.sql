-- Fix the users table RLS policy to allow reading own profile
-- This is a more permissive policy that should work

-- Drop the existing restrictive policy
DROP POLICY IF EXISTS "Users can read own profile" ON users;

-- Create a policy that allows users to read their own profile
-- This uses auth.uid() which should work after login
CREATE POLICY "Users can read own profile"
  ON users FOR SELECT
  USING (auth.uid() = id);

-- Also ensure the "read all users" policy exists (for basic info)
DROP POLICY IF EXISTS "Users can read all users" ON users;

CREATE POLICY "Users can read all users"
  ON users FOR SELECT
  USING (true);

-- Verify the policies
SELECT 
  policyname,
  cmd,
  qual
FROM pg_policies 
WHERE schemaname = 'public' 
  AND tablename = 'users'
ORDER BY policyname;








