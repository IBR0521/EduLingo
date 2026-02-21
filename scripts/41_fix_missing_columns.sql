-- Quick fix script to add missing columns
-- Run this if you're getting schema cache errors

-- Add age column to users table (for both students and teachers)
ALTER TABLE users 
ADD COLUMN IF NOT EXISTS age INTEGER;

-- Add course_start_date to group_students table
ALTER TABLE group_students 
ADD COLUMN IF NOT EXISTS course_start_date DATE DEFAULT CURRENT_DATE;

-- Add index for course_start_date if it doesn't exist
CREATE INDEX IF NOT EXISTS idx_group_students_course_start ON group_students(course_start_date);

-- Ensure all teacher salary fields exist with correct names
-- Check if monthly_salary_amount exists, if not add it
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns 
    WHERE table_name = 'users' AND column_name = 'monthly_salary_amount'
  ) THEN
    -- Add monthly_salary_amount if it doesn't exist
    ALTER TABLE users ADD COLUMN monthly_salary_amount NUMERIC(10, 2);
    
    -- If salary_amount exists, copy its values to monthly_salary_amount
    IF EXISTS (
      SELECT 1 FROM information_schema.columns 
      WHERE table_name = 'users' AND column_name = 'salary_amount'
    ) THEN
      UPDATE users 
      SET monthly_salary_amount = salary_amount 
      WHERE monthly_salary_amount IS NULL AND salary_amount IS NOT NULL;
    END IF;
  END IF;
END $$;

-- Ensure salary_payment_status exists
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns 
    WHERE table_name = 'users' AND column_name = 'salary_payment_status'
  ) THEN
    ALTER TABLE users ADD COLUMN salary_payment_status VARCHAR(50) DEFAULT 'pending';
    
    -- If salary_status exists, copy its values
    IF EXISTS (
      SELECT 1 FROM information_schema.columns 
      WHERE table_name = 'users' AND column_name = 'salary_status'
    ) THEN
      UPDATE users 
      SET salary_payment_status = salary_status 
      WHERE salary_payment_status IS NULL AND salary_status IS NOT NULL;
    END IF;
  END IF;
END $$;

-- Ensure last_salary_payment_date exists
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns 
    WHERE table_name = 'users' AND column_name = 'last_salary_payment_date'
  ) THEN
    ALTER TABLE users ADD COLUMN last_salary_payment_date DATE;
    
    -- If last_salary_date exists, copy its values
    IF EXISTS (
      SELECT 1 FROM information_schema.columns 
      WHERE table_name = 'users' AND column_name = 'last_salary_date'
    ) THEN
      UPDATE users 
      SET last_salary_payment_date = last_salary_date 
      WHERE last_salary_payment_date IS NULL AND last_salary_date IS NOT NULL;
    END IF;
  END IF;
END $$;

-- Ensure all other teacher fields exist
ALTER TABLE users 
ADD COLUMN IF NOT EXISTS ielts_score NUMERIC(3, 1),
ADD COLUMN IF NOT EXISTS etk VARCHAR(255),
ADD COLUMN IF NOT EXISTS salary_due_date DATE,
ADD COLUMN IF NOT EXISTS employment_start_date DATE;

-- Ensure all student fields exist
ALTER TABLE users 
ADD COLUMN IF NOT EXISTS english_level VARCHAR(50),
ADD COLUMN IF NOT EXISTS certificate_type VARCHAR(50);

-- Add check constraint for certificate_type if it doesn't exist
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint 
    WHERE conname = 'users_certificate_type_check'
  ) THEN
    ALTER TABLE users 
    ADD CONSTRAINT users_certificate_type_check 
    CHECK (certificate_type IN ('IELTS', 'CEFR', NULL));
  END IF;
END $$;

-- Add comments
COMMENT ON COLUMN users.age IS 'Age of the user (student or teacher)';
COMMENT ON COLUMN group_students.course_start_date IS 'Date when student started the course (used for payment reminders)';







