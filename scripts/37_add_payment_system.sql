-- Ensure user_role enum exists (required for users table)
DO $$ BEGIN
  CREATE TYPE user_role AS ENUM ('main_teacher', 'teacher', 'student', 'parent');
EXCEPTION
  WHEN duplicate_object THEN null;
END $$;

-- Ensure users table exists first (required for foreign keys)
-- Note: In Supabase, users.id references auth.users(id)
CREATE TABLE IF NOT EXISTS users (
  id UUID PRIMARY KEY,
  email VARCHAR(255) UNIQUE NOT NULL,
  full_name VARCHAR(255) NOT NULL,
  role user_role NOT NULL,
  age INTEGER,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- If users table already exists but doesn't have the foreign key to auth.users, try to add it
DO $$
BEGIN
  -- Check if the foreign key constraint doesn't exist
  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint 
    WHERE conname = 'users_id_fkey' 
    AND conrelid = 'users'::regclass
  ) THEN
    -- Try to add the foreign key (will fail silently if auth.users doesn't exist)
    BEGIN
      ALTER TABLE users 
      ADD CONSTRAINT users_id_fkey 
      FOREIGN KEY (id) REFERENCES auth.users(id) ON DELETE CASCADE;
    EXCEPTION
      WHEN undefined_table THEN
        -- auth.users doesn't exist, which is OK for standalone setup
        NULL;
    END;
  END IF;
END $$;

-- Ensure groups table exists (required for group_students foreign key)
CREATE TABLE IF NOT EXISTS groups (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name VARCHAR(255) NOT NULL,
  description TEXT,
  teacher_id UUID REFERENCES users(id) ON DELETE SET NULL,
  created_by UUID REFERENCES users(id),
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Ensure group_students table exists (create if it doesn't)
CREATE TABLE IF NOT EXISTS group_students (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  group_id UUID REFERENCES groups(id) ON DELETE CASCADE,
  student_id UUID REFERENCES users(id) ON DELETE CASCADE,
  enrolled_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  course_start_date DATE DEFAULT CURRENT_DATE,
  UNIQUE(group_id, student_id)
);

-- Create indexes if they don't exist
CREATE INDEX IF NOT EXISTS idx_group_students_group ON group_students(group_id);
CREATE INDEX IF NOT EXISTS idx_group_students_student ON group_students(student_id);
CREATE INDEX IF NOT EXISTS idx_group_students_course_start ON group_students(course_start_date);

-- Add payment fields to group_students table
ALTER TABLE group_students 
ADD COLUMN IF NOT EXISTS course_start_date DATE DEFAULT CURRENT_DATE,
ADD COLUMN IF NOT EXISTS monthly_payment_amount NUMERIC(10, 2),
ADD COLUMN IF NOT EXISTS payment_due_date DATE,
ADD COLUMN IF NOT EXISTS last_payment_date DATE,
ADD COLUMN IF NOT EXISTS payment_status VARCHAR(50) DEFAULT 'pending';

-- Add check constraint for payment_status if it doesn't exist
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

-- Add has_phone field to users table (to track if student has phone or not)
ALTER TABLE users 
ADD COLUMN IF NOT EXISTS has_phone BOOLEAN DEFAULT true,
ADD COLUMN IF NOT EXISTS age INTEGER;

-- Update phone_number to allow NULL for students who don't have phone
-- (Already nullable from previous migration, but ensure it's clear)

-- Create payment_reminders table to track sent reminders
CREATE TABLE IF NOT EXISTS payment_reminders (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  group_student_id UUID REFERENCES group_students(id) ON DELETE CASCADE,
  student_id UUID REFERENCES users(id) ON DELETE CASCADE,
  parent_id UUID REFERENCES users(id) ON DELETE SET NULL,
  reminder_type VARCHAR(50) NOT NULL CHECK (reminder_type IN ('due_soon', 'overdue', 'monthly')),
  sent_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  sent_to_email BOOLEAN DEFAULT false,
  sent_to_sms BOOLEAN DEFAULT false,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Create index for payment queries
CREATE INDEX IF NOT EXISTS idx_group_students_payment ON group_students(payment_due_date, payment_status);
CREATE INDEX IF NOT EXISTS idx_payment_reminders_student ON payment_reminders(student_id);
CREATE INDEX IF NOT EXISTS idx_payment_reminders_parent ON payment_reminders(parent_id);

-- Add comments
COMMENT ON COLUMN group_students.monthly_payment_amount IS 'Monthly payment amount for this student in this group';
COMMENT ON COLUMN group_students.payment_due_date IS 'Next payment due date';
COMMENT ON COLUMN group_students.last_payment_date IS 'Date of last payment received';
COMMENT ON COLUMN group_students.payment_status IS 'Current payment status: paid, pending, or overdue';
COMMENT ON COLUMN group_students.course_start_date IS 'Date when student started the course (used for payment reminders)';
COMMENT ON COLUMN users.has_phone IS 'Whether student has a phone number (false means no phone, use parent phone)';
COMMENT ON TABLE payment_reminders IS 'Tracks payment reminder notifications sent to students and parents';

