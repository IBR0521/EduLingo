-- ============================================================================
-- FINAL FIX - Run this in Supabase SQL Editor
-- ============================================================================
-- This script will ensure the table exists and add all required columns
-- ============================================================================

-- Step 1: Ensure group_students table exists
CREATE TABLE IF NOT EXISTS group_students (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  group_id UUID,
  student_id UUID,
  enrolled_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  UNIQUE(group_id, student_id)
);

-- Step 2: Add foreign key constraints if they don't exist
DO $$
BEGIN
  -- Add foreign key to groups if groups table exists
  IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_name = 'groups') THEN
    IF NOT EXISTS (
      SELECT 1 FROM pg_constraint 
      WHERE conname = 'group_students_group_id_fkey'
    ) THEN
      ALTER TABLE group_students 
      ADD CONSTRAINT group_students_group_id_fkey 
      FOREIGN KEY (group_id) REFERENCES groups(id) ON DELETE CASCADE;
    END IF;
  END IF;

  -- Add foreign key to users if users table exists
  IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_name = 'users') THEN
    IF NOT EXISTS (
      SELECT 1 FROM pg_constraint 
      WHERE conname = 'group_students_student_id_fkey'
    ) THEN
      ALTER TABLE group_students 
      ADD CONSTRAINT group_students_student_id_fkey 
      FOREIGN KEY (student_id) REFERENCES users(id) ON DELETE CASCADE;
    END IF;
  END IF;
END $$;

-- Step 3: Add payment columns ONE BY ONE (more reliable)
DO $$
BEGIN
  -- Add monthly_payment_amount
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns 
    WHERE table_schema = 'public' 
    AND table_name = 'group_students' 
    AND column_name = 'monthly_payment_amount'
  ) THEN
    ALTER TABLE group_students ADD COLUMN monthly_payment_amount NUMERIC(10, 2);
    RAISE NOTICE '✓ Added monthly_payment_amount';
  ELSE
    RAISE NOTICE '✓ monthly_payment_amount already exists';
  END IF;

  -- Add payment_due_date
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns 
    WHERE table_schema = 'public' 
    AND table_name = 'group_students' 
    AND column_name = 'payment_due_date'
  ) THEN
    ALTER TABLE group_students ADD COLUMN payment_due_date DATE;
    RAISE NOTICE '✓ Added payment_due_date';
  ELSE
    RAISE NOTICE '✓ payment_due_date already exists';
  END IF;

  -- Add last_payment_date
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns 
    WHERE table_schema = 'public' 
    AND table_name = 'group_students' 
    AND column_name = 'last_payment_date'
  ) THEN
    ALTER TABLE group_students ADD COLUMN last_payment_date DATE;
    RAISE NOTICE '✓ Added last_payment_date';
  ELSE
    RAISE NOTICE '✓ last_payment_date already exists';
  END IF;

  -- Add payment_status
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns 
    WHERE table_schema = 'public' 
    AND table_name = 'group_students' 
    AND column_name = 'payment_status'
  ) THEN
    ALTER TABLE group_students ADD COLUMN payment_status VARCHAR(50) DEFAULT 'pending';
    RAISE NOTICE '✓ Added payment_status';
  ELSE
    RAISE NOTICE '✓ payment_status already exists';
  END IF;

  -- Add course_start_date
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns 
    WHERE table_schema = 'public' 
    AND table_name = 'group_students' 
    AND column_name = 'course_start_date'
  ) THEN
    ALTER TABLE group_students ADD COLUMN course_start_date DATE DEFAULT CURRENT_DATE;
    RAISE NOTICE '✓ Added course_start_date';
  ELSE
    RAISE NOTICE '✓ course_start_date already exists';
  END IF;
END $$;

-- Step 4: Add check constraint for payment_status
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint 
    WHERE conname = 'group_students_payment_status_check'
  ) THEN
    ALTER TABLE group_students 
    ADD CONSTRAINT group_students_payment_status_check 
    CHECK (payment_status IN ('paid', 'pending', 'overdue'));
    RAISE NOTICE '✓ Added payment_status check constraint';
  ELSE
    RAISE NOTICE '✓ payment_status check constraint already exists';
  END IF;
END $$;

-- Step 5: Add age to users table
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns 
    WHERE table_schema = 'public' 
    AND table_name = 'users' 
    AND column_name = 'age'
  ) THEN
    ALTER TABLE users ADD COLUMN age INTEGER;
    RAISE NOTICE '✓ Added age column to users';
  ELSE
    RAISE NOTICE '✓ age column already exists in users';
  END IF;
END $$;

-- Step 6: Create indexes
CREATE INDEX IF NOT EXISTS idx_group_students_payment ON group_students(payment_due_date, payment_status);
CREATE INDEX IF NOT EXISTS idx_group_students_course_start ON group_students(course_start_date);
CREATE INDEX IF NOT EXISTS idx_group_students_group ON group_students(group_id);
CREATE INDEX IF NOT EXISTS idx_group_students_student ON group_students(student_id);

-- Step 7: VERIFY - Check all columns exist
SELECT 
  'VERIFICATION' as status,
  column_name,
  data_type,
  column_default
FROM information_schema.columns
WHERE table_schema = 'public' 
  AND table_name = 'group_students'
  AND column_name IN ('monthly_payment_amount', 'payment_due_date', 'last_payment_date', 'payment_status', 'course_start_date')
ORDER BY column_name;

-- ============================================================================
-- EXPECTED OUTPUT: You should see 5 rows with the column names
-- If you see fewer than 5 rows, some columns are still missing
-- ============================================================================
-- AFTER RUNNING:
-- 1. Check the verification output above - should show 5 columns
-- 2. Wait 30-60 seconds for Supabase to refresh
-- 3. COMPLETELY RESTART your dev server (stop and start)
-- 4. Hard refresh browser (Cmd+Shift+R)
-- ============================================================================







