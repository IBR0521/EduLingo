-- ============================================================================
-- SIMPLE ONE-STEP FIX - Copy and paste this ENTIRE script into Supabase SQL Editor
-- ============================================================================

-- Add all payment columns at once using ALTER TABLE (simpler than DO blocks)
ALTER TABLE group_students 
ADD COLUMN IF NOT EXISTS monthly_payment_amount NUMERIC(10, 2),
ADD COLUMN IF NOT EXISTS payment_due_date DATE,
ADD COLUMN IF NOT EXISTS last_payment_date DATE,
ADD COLUMN IF NOT EXISTS payment_status VARCHAR(50) DEFAULT 'pending',
ADD COLUMN IF NOT EXISTS course_start_date DATE DEFAULT CURRENT_DATE;

-- Add constraint if it doesn't exist
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint WHERE conname = 'group_students_payment_status_check'
  ) THEN
    ALTER TABLE group_students 
    ADD CONSTRAINT group_students_payment_status_check 
    CHECK (payment_status IN ('paid', 'pending', 'overdue'));
  END IF;
END $$;

-- Verify columns were added (should show 5 rows)
SELECT column_name, data_type 
FROM information_schema.columns
WHERE table_schema = 'public' 
  AND table_name = 'group_students'
  AND column_name IN ('monthly_payment_amount', 'payment_due_date', 'last_payment_date', 'payment_status', 'course_start_date')
ORDER BY column_name;

-- ============================================================================
-- IF YOU SEE 5 ROWS ABOVE, COLUMNS ARE ADDED!
-- Then: Wait 60 seconds, restart dev server, hard refresh browser
-- ============================================================================

