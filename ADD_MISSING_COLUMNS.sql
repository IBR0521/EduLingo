-- ============================================================================
-- ADD ALL MISSING COLUMNS - RUN THIS IN SUPABASE SQL EDITOR
-- ============================================================================
-- This will add all missing columns that are causing schema cache errors
-- ============================================================================

-- 1. Add payment columns to group_students table (one at a time to avoid issues)
ALTER TABLE group_students ADD COLUMN IF NOT EXISTS monthly_payment_amount NUMERIC(10, 2);
ALTER TABLE group_students ADD COLUMN IF NOT EXISTS payment_due_date DATE;
ALTER TABLE group_students ADD COLUMN IF NOT EXISTS last_payment_date DATE;
ALTER TABLE group_students ADD COLUMN IF NOT EXISTS payment_status VARCHAR(50) DEFAULT 'pending';
ALTER TABLE group_students ADD COLUMN IF NOT EXISTS course_start_date DATE DEFAULT CURRENT_DATE;

-- 2. Add check constraint for payment_status if it doesn't exist
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint 
    WHERE conname = 'group_students_payment_status_check'
  ) THEN
    ALTER TABLE group_students 
    ADD CONSTRAINT group_students_payment_status_check 
    CHECK (payment_status IN ('paid', 'pending', 'overdue'));
  END IF;
END $$;

-- 3. Add age column to users table
ALTER TABLE users 
ADD COLUMN IF NOT EXISTS age INTEGER;

-- 4. Add indexes for better performance
CREATE INDEX IF NOT EXISTS idx_group_students_payment ON group_students(payment_due_date, payment_status);
CREATE INDEX IF NOT EXISTS idx_group_students_course_start ON group_students(course_start_date);

-- 5. Verify columns were added
SELECT 
  'group_students' as table_name,
  column_name,
  data_type
FROM information_schema.columns
WHERE table_schema = 'public' 
  AND table_name = 'group_students'
  AND column_name IN ('monthly_payment_amount', 'payment_due_date', 'last_payment_date', 'payment_status', 'course_start_date')
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
-- AFTER RUNNING THIS:
-- 1. Wait 10-20 seconds for Supabase to refresh its schema cache
-- 2. Restart your Next.js dev server (stop with Ctrl+C, then run: npm run dev)
-- 3. Hard refresh your browser (Cmd+Shift+R or Ctrl+Shift+R)
-- 4. Try adding a student again
-- ============================================================================

