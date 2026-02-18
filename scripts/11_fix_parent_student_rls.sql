-- Fix infinite recursion in parent_student RLS policies
-- The issue is that the policy queries parent_student within its own USING clause
-- Error code: 42P17 - infinite recursion detected in policy

-- Step 1: Disable RLS temporarily to drop policies safely
ALTER TABLE parent_student DISABLE ROW LEVEL SECURITY;

-- Step 2: Drop ALL existing policies on parent_student (using DO block to handle any policy names)
DO $$
DECLARE
    r RECORD;
BEGIN
    FOR r IN (SELECT policyname FROM pg_policies WHERE schemaname = 'public' AND tablename = 'parent_student') LOOP
        EXECUTE 'DROP POLICY IF EXISTS ' || quote_ident(r.policyname) || ' ON parent_student';
        RAISE NOTICE 'Dropped policy: %', r.policyname;
    END LOOP;
END $$;

-- Step 3: Re-enable RLS
ALTER TABLE parent_student ENABLE ROW LEVEL SECURITY;

-- Step 4: Create fixed policies WITHOUT any recursive queries
-- Parents can read links where they are the parent (simple direct check)
CREATE POLICY "Parents can read own links"
  ON parent_student FOR SELECT
  USING (parent_id = auth.uid());

-- Students can read links where they are the student (simple direct check)
CREATE POLICY "Students can read own links"
  ON parent_student FOR SELECT
  USING (student_id = auth.uid());

-- Step 5: Verify the policies were created correctly
SELECT 
  'Fixed Policies' as check_type,
  policyname,
  cmd as command,
  CASE 
    WHEN qual IS NULL THEN 'No USING clause'
    ELSE substring(qual::text, 1, 100) || '...'
  END as using_clause
FROM pg_policies 
WHERE schemaname = 'public' 
  AND tablename = 'parent_student'
ORDER BY policyname;

-- Step 6: Test that RLS is working (this should not cause recursion)
-- Note: This will only work if you're authenticated
-- SELECT 'Test' as check_type, COUNT(*) as link_count FROM parent_student;







