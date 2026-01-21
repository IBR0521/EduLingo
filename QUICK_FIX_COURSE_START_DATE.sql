-- ============================================================================
-- QUICK FIX: Add course_start_date column
-- ============================================================================
-- Run this in Supabase SQL Editor if you're getting:
-- "Could not find the 'course_start_date' column of 'group_students' in the schema cache"
-- ============================================================================

-- Add course_start_date column if it doesn't exist
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
    
    RAISE NOTICE '✅ Added course_start_date column';
  ELSE
    RAISE NOTICE 'ℹ️ course_start_date column already exists';
  END IF;
END $$;

-- Verify it was added
SELECT 
  column_name,
  data_type,
  column_default,
  is_nullable
FROM information_schema.columns
WHERE table_schema = 'public' 
  AND table_name = 'group_students'
  AND column_name = 'course_start_date';

-- ============================================================================
-- If you see 1 row above, the column was added successfully!
-- Refresh your browser and try again.
-- ============================================================================

