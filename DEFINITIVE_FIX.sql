-- ============================================================================
-- DEFINITIVE FIX FOR STUDENT MANAGEMENT - RUN THIS ONCE
-- ============================================================================
-- This script ensures all required columns exist in group_students and users tables
-- Run this in Supabase SQL Editor
-- ============================================================================

-- Step 1: Ensure user_role enum exists
DO $$ BEGIN
  CREATE TYPE user_role AS ENUM ('main_teacher', 'teacher', 'student', 'parent');
EXCEPTION
  WHEN duplicate_object THEN null;
END $$;

-- Step 2: Ensure users table exists with all required columns
CREATE TABLE IF NOT EXISTS users (
  id UUID PRIMARY KEY,
  email VARCHAR(255) UNIQUE NOT NULL,
  full_name VARCHAR(255) NOT NULL,
  role user_role NOT NULL,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Step 3: Add optional columns to users table (if they don't exist)
ALTER TABLE users 
ADD COLUMN IF NOT EXISTS age INTEGER,
ADD COLUMN IF NOT EXISTS phone_number VARCHAR(20),
ADD COLUMN IF NOT EXISTS has_phone BOOLEAN DEFAULT true,
ADD COLUMN IF NOT EXISTS english_level VARCHAR(50),
ADD COLUMN IF NOT EXISTS certificate_type VARCHAR(10);

-- Step 4: Ensure groups table exists
CREATE TABLE IF NOT EXISTS groups (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name VARCHAR(255) NOT NULL,
  description TEXT,
  teacher_id UUID REFERENCES users(id) ON DELETE SET NULL,
  created_by UUID REFERENCES users(id),
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Step 5: Ensure group_students table exists (with basic structure)
CREATE TABLE IF NOT EXISTS group_students (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  group_id UUID REFERENCES groups(id) ON DELETE CASCADE,
  student_id UUID REFERENCES users(id) ON DELETE CASCADE,
  enrolled_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  UNIQUE(group_id, student_id)
);

-- Step 6: Add ALL payment-related columns to group_students (if they don't exist)
-- This is the critical part - we add all columns in one operation
DO $$
BEGIN
  -- Add course_start_date
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns 
    WHERE table_schema = 'public' 
    AND table_name = 'group_students' 
    AND column_name = 'course_start_date'
  ) THEN
    ALTER TABLE group_students ADD COLUMN course_start_date DATE DEFAULT CURRENT_DATE;
    RAISE NOTICE 'Added course_start_date';
  END IF;

  -- Add monthly_payment_amount
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns 
    WHERE table_schema = 'public' 
    AND table_name = 'group_students' 
    AND column_name = 'monthly_payment_amount'
  ) THEN
    ALTER TABLE group_students ADD COLUMN monthly_payment_amount NUMERIC(10, 2);
    RAISE NOTICE 'Added monthly_payment_amount';
  END IF;

  -- Add payment_due_date
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns 
    WHERE table_schema = 'public' 
    AND table_name = 'group_students' 
    AND column_name = 'payment_due_date'
  ) THEN
    ALTER TABLE group_students ADD COLUMN payment_due_date DATE;
    RAISE NOTICE 'Added payment_due_date';
  END IF;

  -- Add last_payment_date
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns 
    WHERE table_schema = 'public' 
    AND table_name = 'group_students' 
    AND column_name = 'last_payment_date'
  ) THEN
    ALTER TABLE group_students ADD COLUMN last_payment_date DATE;
    RAISE NOTICE 'Added last_payment_date';
  END IF;

  -- Add payment_status
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns 
    WHERE table_schema = 'public' 
    AND table_name = 'group_students' 
    AND column_name = 'payment_status'
  ) THEN
    ALTER TABLE group_students ADD COLUMN payment_status VARCHAR(50) DEFAULT 'pending';
    RAISE NOTICE 'Added payment_status';
  END IF;
END $$;

-- Step 7: Add check constraint for payment_status (if it doesn't exist)
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint 
    WHERE conname = 'group_students_payment_status_check'
  ) THEN
    ALTER TABLE group_students 
    ADD CONSTRAINT group_students_payment_status_check 
    CHECK (payment_status IN ('paid', 'pending', 'overdue'));
    RAISE NOTICE 'Added payment_status check constraint';
  END IF;
END $$;

-- Step 8: Create indexes for performance
CREATE INDEX IF NOT EXISTS idx_group_students_group ON group_students(group_id);
CREATE INDEX IF NOT EXISTS idx_group_students_student ON group_students(student_id);
CREATE INDEX IF NOT EXISTS idx_group_students_course_start ON group_students(course_start_date);
CREATE INDEX IF NOT EXISTS idx_group_students_payment ON group_students(payment_due_date, payment_status);

-- Step 9: Verify all columns exist (this should return 5 rows)
SELECT 
  column_name,
  data_type,
  is_nullable,
  column_default
FROM information_schema.columns
WHERE table_schema = 'public' 
  AND table_name = 'group_students'
  AND column_name IN ('course_start_date', 'monthly_payment_amount', 'payment_due_date', 'last_payment_date', 'payment_status')
ORDER BY column_name;

-- ============================================================================
-- EXPECTED RESULT: 5 rows showing all payment columns
-- If you see 5 rows, all columns are correctly added!
-- ============================================================================

