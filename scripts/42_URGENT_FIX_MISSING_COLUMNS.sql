-- ============================================================================
-- URGENT FIX: Add missing columns that are causing schema cache errors
-- ============================================================================
-- Run this script IMMEDIATELY in Supabase SQL Editor
-- This will fix: "Could not find the 'course_start_date' column" error
-- ============================================================================

-- 1. Add course_start_date to group_students table
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns 
    WHERE table_schema = 'public' 
    AND table_name = 'group_students' 
    AND column_name = 'course_start_date'
  ) THEN
    ALTER TABLE group_students 
    ADD COLUMN course_start_date DATE DEFAULT CURRENT_DATE;
    
    RAISE NOTICE 'Added course_start_date column to group_students';
  ELSE
    RAISE NOTICE 'course_start_date column already exists in group_students';
  END IF;
END $$;

-- 2. Add index for course_start_date
CREATE INDEX IF NOT EXISTS idx_group_students_course_start ON group_students(course_start_date);

-- 3. Add age column to users table
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns 
    WHERE table_schema = 'public' 
    AND table_name = 'users' 
    AND column_name = 'age'
  ) THEN
    ALTER TABLE users 
    ADD COLUMN age INTEGER;
    
    RAISE NOTICE 'Added age column to users';
  ELSE
    RAISE NOTICE 'age column already exists in users';
  END IF;
END $$;

-- 4. Verify columns were added
SELECT 
  'group_students' as table_name,
  column_name,
  data_type
FROM information_schema.columns
WHERE table_schema = 'public' 
  AND table_name = 'group_students'
  AND column_name IN ('course_start_date', 'monthly_payment_amount', 'payment_due_date', 'payment_status')
ORDER BY column_name;

SELECT 
  'users' as table_name,
  column_name,
  data_type
FROM information_schema.columns
WHERE table_schema = 'public' 
  AND table_name = 'users'
  AND column_name = 'age';

-- ============================================================================
-- After running this script:
-- 1. Restart your Next.js dev server (stop and start again)
-- 2. Clear browser cache or do a hard refresh (Cmd+Shift+R or Ctrl+Shift+R)
-- 3. Try adding a student again
-- ============================================================================

