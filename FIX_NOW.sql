-- ============================================================================
-- COPY AND PASTE THIS ENTIRE SCRIPT INTO SUPABASE SQL EDITOR AND RUN IT
-- ============================================================================
-- This will fix both errors:
-- 1. "Could not find the 'age' column of 'users'"
-- 2. "Could not find the 'course_start_date' column of 'group_students'"
-- ============================================================================

-- Fix 1: Add age column to users table
ALTER TABLE users 
ADD COLUMN IF NOT EXISTS age INTEGER;

-- Fix 2: Add course_start_date to group_students table
ALTER TABLE group_students 
ADD COLUMN IF NOT EXISTS course_start_date DATE DEFAULT CURRENT_DATE;

-- Fix 3: Add index for course_start_date
CREATE INDEX IF NOT EXISTS idx_group_students_course_start ON group_students(course_start_date);

-- Verify the columns were added (you should see results)
SELECT 
  'users' as table_name,
  column_name,
  data_type
FROM information_schema.columns
WHERE table_schema = 'public' 
  AND table_name = 'users'
  AND column_name = 'age';

SELECT 
  'group_students' as table_name,
  column_name,
  data_type
FROM information_schema.columns
WHERE table_schema = 'public' 
  AND table_name = 'group_students'
  AND column_name = 'course_start_date';

-- ============================================================================
-- AFTER RUNNING THIS:
-- 1. Wait 10-20 seconds for Supabase to refresh its schema cache
-- 2. Restart your Next.js dev server (stop with Ctrl+C, then run: npm run dev)
-- 3. Hard refresh your browser (Cmd+Shift+R or Ctrl+Shift+R)
-- 4. Try again!
-- ============================================================================


