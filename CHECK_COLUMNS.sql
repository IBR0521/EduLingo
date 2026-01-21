-- ============================================================================
-- CHECK IF PAYMENT COLUMNS EXIST - Run this first to verify
-- ============================================================================

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

-- ============================================================================
-- EXPECTED: 5 rows should appear
-- If you see fewer than 5 rows, run RUN_THIS_NOW.sql below
-- ============================================================================

