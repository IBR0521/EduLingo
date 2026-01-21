-- Add INSERT policy for parent_student table
-- This allows students to create their own parent_student records with access codes during registration

-- Drop existing INSERT policy if it exists
DROP POLICY IF EXISTS "Students can insert own parent_student" ON parent_student;

-- Students can insert their own parent_student records (for access code creation during registration)
CREATE POLICY "Students can insert own parent_student"
  ON parent_student FOR INSERT
  WITH CHECK (student_id = auth.uid());

-- Verify the policy was created
SELECT 
  'Policy Verification' as check_type,
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
  AND tablename = 'parent_student'
  AND policyname = 'Students can insert own parent_student';



