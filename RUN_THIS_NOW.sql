-- ============================================================================
-- RUN THIS IN SUPABASE SQL EDITOR - COPY ALL AND RUN
-- ============================================================================
-- This will add ALL missing payment columns to group_students table
-- ============================================================================

-- Add monthly_payment_amount
DO $$
BEGIN
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
END $$;

-- Add payment_due_date
DO $$
BEGIN
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
END $$;

-- Add last_payment_date
DO $$
BEGIN
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
END $$;

-- Add payment_status
DO $$
BEGIN
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
END $$;

-- Add course_start_date
DO $$
BEGIN
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

-- Add check constraint for payment_status
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

-- ============================================================================
-- VERIFICATION - Check if all columns were added
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

-- Expected result: 5 rows
-- If you see 5 rows, columns were added successfully!
-- ============================================================================

