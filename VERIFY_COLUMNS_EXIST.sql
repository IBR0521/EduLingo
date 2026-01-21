-- ============================================================================
-- VERIFY COLUMNS EXIST - Run this to check
-- ============================================================================

-- Check if payment columns exist in group_students
SELECT 
  column_name,
  data_type,
  is_nullable,
  column_default
FROM information_schema.columns
WHERE table_schema = 'public' 
  AND table_name = 'group_students'
  AND column_name IN ('monthly_payment_amount', 'payment_due_date', 'last_payment_date', 'payment_status', 'course_start_date')
ORDER BY column_name;

-- Expected: Should return 5 rows
-- If you see fewer than 5 rows, the columns are missing

-- Also check age in users
SELECT 
  column_name,
  data_type
FROM information_schema.columns
WHERE table_schema = 'public' 
  AND table_name = 'users'
  AND column_name = 'age';

-- Expected: Should return 1 row

