-- ============================================================================
-- VERIFY AND FIX MISSING COLUMNS
-- ============================================================================
-- Run this to check if columns exist and add them if they don't
-- ============================================================================

-- First, check what columns currently exist
SELECT 
  column_name,
  data_type,
  is_nullable
FROM information_schema.columns
WHERE table_schema = 'public' 
  AND table_name = 'group_students'
  AND column_name IN ('monthly_payment_amount', 'payment_due_date', 'last_payment_date', 'payment_status', 'course_start_date')
ORDER BY column_name;

-- If the above query returns no rows or missing columns, run these:

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
    RAISE NOTICE 'Added monthly_payment_amount column';
  ELSE
    RAISE NOTICE 'monthly_payment_amount column already exists';
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
    RAISE NOTICE 'Added payment_due_date column';
  ELSE
    RAISE NOTICE 'payment_due_date column already exists';
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
    RAISE NOTICE 'Added last_payment_date column';
  ELSE
    RAISE NOTICE 'last_payment_date column already exists';
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
    RAISE NOTICE 'Added payment_status column';
  ELSE
    RAISE NOTICE 'payment_status column already exists';
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
    RAISE NOTICE 'Added course_start_date column';
  ELSE
    RAISE NOTICE 'course_start_date column already exists';
  END IF;
END $$;

-- Add age to users
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns 
    WHERE table_schema = 'public' 
    AND table_name = 'users' 
    AND column_name = 'age'
  ) THEN
    ALTER TABLE users ADD COLUMN age INTEGER;
    RAISE NOTICE 'Added age column to users';
  ELSE
    RAISE NOTICE 'age column already exists in users';
  END IF;
END $$;

-- Verify all columns now exist
SELECT 
  'group_students' as table_name,
  column_name,
  data_type
FROM information_schema.columns
WHERE table_schema = 'public' 
  AND table_name = 'group_students'
  AND column_name IN ('monthly_payment_amount', 'payment_due_date', 'last_payment_date', 'payment_status', 'course_start_date')
ORDER BY column_name;

-- ============================================================================
-- IMPORTANT: After running this
-- 1. Wait 30 seconds for Supabase to refresh
-- 2. RESTART your Next.js dev server completely (stop and start)
-- 3. Clear browser cache or hard refresh (Cmd+Shift+R)
-- ============================================================================

