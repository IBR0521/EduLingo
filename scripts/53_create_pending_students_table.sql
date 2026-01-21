-- ============================================================================
-- CREATE PENDING_STUDENTS TABLE WITH RLS POLICIES
-- ============================================================================
-- This script creates the pending_students table if it doesn't exist
-- and sets up proper RLS policies
-- Run this in Supabase SQL Editor
-- ============================================================================

-- Create pending_students table if it doesn't exist
CREATE TABLE IF NOT EXISTS pending_students (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  email VARCHAR(255) UNIQUE NOT NULL,
  phone_number VARCHAR(20),
  created_by UUID REFERENCES users(id),
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Add index for email lookups
CREATE INDEX IF NOT EXISTS idx_pending_students_email ON pending_students(email);

-- Add index for created_by lookups
CREATE INDEX IF NOT EXISTS idx_pending_students_created_by ON pending_students(created_by);

-- Enable RLS
ALTER TABLE pending_students ENABLE ROW LEVEL SECURITY;

-- Drop existing policies if they exist (to avoid conflicts)
DROP POLICY IF EXISTS "Main teachers can insert pending students" ON pending_students;
DROP POLICY IF EXISTS "Main teachers can view pending students" ON pending_students;
DROP POLICY IF EXISTS "Main teachers can delete pending students" ON pending_students;
DROP POLICY IF EXISTS "Teachers can view pending students" ON pending_students;
DROP POLICY IF EXISTS "Service role has full access to pending_students" ON pending_students;
DROP POLICY IF EXISTS "Authenticated users can read pending students" ON pending_students;

-- Allow main teachers to insert pending students
CREATE POLICY "Main teachers can insert pending students" ON pending_students
FOR INSERT WITH CHECK (
  EXISTS (SELECT 1 FROM users WHERE id = auth.uid() AND role = 'main_teacher')
);

-- Allow main teachers and teachers to view pending students
CREATE POLICY "Teachers can view pending students" ON pending_students
FOR SELECT USING (
  EXISTS (SELECT 1 FROM users WHERE id = auth.uid() AND role IN ('main_teacher', 'teacher'))
);

-- Allow main teachers to delete pending students
CREATE POLICY "Main teachers can delete pending students" ON pending_students
FOR DELETE USING (
  EXISTS (SELECT 1 FROM users WHERE id = auth.uid() AND role = 'main_teacher')
);

-- Allow service role full access (for API routes)
CREATE POLICY "Service role has full access to pending_students" ON pending_students
FOR ALL USING (true) WITH CHECK (true);

-- Add comment
COMMENT ON TABLE pending_students IS 'Students added by main teacher before they complete registration';

-- Verify table was created
SELECT 
  table_name,
  column_name,
  data_type,
  is_nullable
FROM information_schema.columns
WHERE table_schema = 'public' 
  AND table_name = 'pending_students'
ORDER BY ordinal_position;

-- ============================================================================
-- EXPECTED RESULT: You should see 5 columns:
-- id (uuid)
-- email (varchar)
-- phone_number (varchar)
-- created_by (uuid)
-- created_at (timestamp with time zone)
-- ============================================================================

