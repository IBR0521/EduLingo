-- Add all missing columns to users table for registration
-- This script safely adds columns that may be missing

-- Ensure user_role enum exists
DO $$ BEGIN
  CREATE TYPE user_role AS ENUM ('main_teacher', 'teacher', 'student', 'parent');
EXCEPTION
  WHEN duplicate_object THEN null;
END $$;

-- Add phone number fields
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns 
    WHERE table_name = 'users' AND column_name = 'phone_number'
  ) THEN
    ALTER TABLE users ADD COLUMN phone_number VARCHAR(20);
  END IF;
  
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns 
    WHERE table_name = 'users' AND column_name = 'has_phone'
  ) THEN
    ALTER TABLE users ADD COLUMN has_phone BOOLEAN;
  END IF;
END $$;

-- Add age field (for both students and teachers)
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns 
    WHERE table_name = 'users' AND column_name = 'age'
  ) THEN
    ALTER TABLE users ADD COLUMN age INTEGER;
  END IF;
END $$;

-- Add student-specific fields
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns 
    WHERE table_name = 'users' AND column_name = 'english_level'
  ) THEN
    ALTER TABLE users ADD COLUMN english_level VARCHAR(50);
  END IF;
  
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns 
    WHERE table_name = 'users' AND column_name = 'certificate_type'
  ) THEN
    ALTER TABLE users ADD COLUMN certificate_type VARCHAR(50);
  END IF;
END $$;

-- Add teacher-specific fields
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns 
    WHERE table_name = 'users' AND column_name = 'ielts_score'
  ) THEN
    ALTER TABLE users ADD COLUMN ielts_score NUMERIC(3, 1);
  END IF;
  
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns 
    WHERE table_name = 'users' AND column_name = 'etk'
  ) THEN
    ALTER TABLE users ADD COLUMN etk VARCHAR(255);
  END IF;
  
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns 
    WHERE table_name = 'users' AND column_name = 'employment_start_date'
  ) THEN
    ALTER TABLE users ADD COLUMN employment_start_date DATE;
  END IF;
  
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns 
    WHERE table_name = 'users' AND column_name = 'salary_status'
  ) THEN
    ALTER TABLE users ADD COLUMN salary_status VARCHAR(50) DEFAULT 'pending';
  END IF;
END $$;

-- Add certificate_type constraint if it doesn't exist
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

-- Add comments for documentation
COMMENT ON COLUMN users.phone_number IS 'Phone number in international format (e.g., +998XXXXXXXXX)';
COMMENT ON COLUMN users.has_phone IS 'Whether the user has a phone number (required for parents, optional for students)';
COMMENT ON COLUMN users.age IS 'Age of the user (student or teacher)';
COMMENT ON COLUMN users.english_level IS 'English proficiency level (for students)';
COMMENT ON COLUMN users.certificate_type IS 'Type of certificate (IELTS or CEFR for students)';
COMMENT ON COLUMN users.ielts_score IS 'IELTS score (for teachers)';
COMMENT ON COLUMN users.etk IS 'ETK (English Teaching Knowledge) certification (for teachers)';
COMMENT ON COLUMN users.employment_start_date IS 'Date when teacher started employment';
COMMENT ON COLUMN users.salary_status IS 'Salary payment status (pending, paid, overdue)';

-- Verify all columns were added
SELECT 
  'Column Check' as check_type,
  column_name,
  data_type,
  is_nullable
FROM information_schema.columns
WHERE table_name = 'users'
  AND column_name IN (
    'phone_number',
    'has_phone',
    'age',
    'english_level',
    'certificate_type',
    'ielts_score',
    'etk',
    'employment_start_date',
    'salary_status'
  )
ORDER BY column_name;

