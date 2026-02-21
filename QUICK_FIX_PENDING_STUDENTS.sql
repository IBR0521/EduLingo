-- ============================================================================
-- QUICK FIX: CREATE PENDING_STUDENTS TABLE
-- ============================================================================
-- Run this in Supabase SQL Editor to fix the error
-- ============================================================================

-- Create pending_students table if it doesn't exist
CREATE TABLE IF NOT EXISTS pending_students (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  email VARCHAR(255) UNIQUE NOT NULL,
  phone_number VARCHAR(20),
  created_by UUID REFERENCES users(id),
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Add indexes
CREATE INDEX IF NOT EXISTS idx_pending_students_email ON pending_students(email);
CREATE INDEX IF NOT EXISTS idx_pending_students_created_by ON pending_students(created_by);

-- Enable RLS
ALTER TABLE pending_students ENABLE ROW LEVEL SECURITY;

-- Drop existing policies if they exist
DROP POLICY IF EXISTS "Main teachers can insert pending students" ON pending_students;
DROP POLICY IF EXISTS "Teachers can view pending students" ON pending_students;
DROP POLICY IF EXISTS "Main teachers can delete pending students" ON pending_students;
DROP POLICY IF EXISTS "Service role has full access to pending_students" ON pending_students;

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

-- Verify table was created
SELECT 
  '✅ Table created successfully!' as status,
  COUNT(*) as column_count
FROM information_schema.columns
WHERE table_schema = 'public' 
  AND table_name = 'pending_students';






