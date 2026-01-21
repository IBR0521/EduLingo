-- Fix parent_student RLS policies to allow parents to read by access_code
-- This allows parents to find students using access codes before linking

-- Drop existing SELECT policies
DROP POLICY IF EXISTS "Parents can read own links" ON parent_student;
DROP POLICY IF EXISTS "Parents can read by access_code" ON parent_student;
DROP POLICY IF EXISTS "Students can read own links" ON parent_student;
DROP POLICY IF EXISTS "Parents can update by access_code" ON parent_student;

-- Parents can read links where they are the parent (after linking)
CREATE POLICY "Parents can read own links"
  ON parent_student FOR SELECT
  USING (parent_id = auth.uid());

-- Parents can also read by access_code to find students to link
-- This allows parents to search for students using access codes
CREATE POLICY "Parents can read by access_code"
  ON parent_student FOR SELECT
  USING (
    auth.uid() IN (
      SELECT id FROM users WHERE role = 'parent'
    )
  );

-- Students can read links where they are the student
CREATE POLICY "Students can read own links"
  ON parent_student FOR SELECT
  USING (student_id = auth.uid());

-- Parents can update parent_student records to link students
-- This allows parents to update records where is_linked = false
CREATE POLICY "Parents can update by access_code"
  ON parent_student FOR UPDATE
  USING (
    auth.uid() IN (
      SELECT id FROM users WHERE role = 'parent'
    )
    AND is_linked = false
  )
  WITH CHECK (
    auth.uid() IN (
      SELECT id FROM users WHERE role = 'parent'
    )
    AND parent_id = auth.uid()
    AND is_linked = true
  );

-- Verify the policies
SELECT 
  'Policy Verification' as check_type,
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

