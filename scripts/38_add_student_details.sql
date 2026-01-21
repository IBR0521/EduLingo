-- Add student-specific fields to users table
ALTER TABLE users 
ADD COLUMN IF NOT EXISTS age INTEGER,
ADD COLUMN IF NOT EXISTS english_level VARCHAR(50),
ADD COLUMN IF NOT EXISTS certificate_type VARCHAR(50) CHECK (certificate_type IN ('IELTS', 'CEFR', NULL));

-- Ensure group_students table exists (create if it doesn't)
CREATE TABLE IF NOT EXISTS group_students (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  group_id UUID REFERENCES groups(id) ON DELETE CASCADE,
  student_id UUID REFERENCES users(id) ON DELETE CASCADE,
  enrolled_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  UNIQUE(group_id, student_id)
);

-- Create indexes if they don't exist
CREATE INDEX IF NOT EXISTS idx_group_students_group ON group_students(group_id);
CREATE INDEX IF NOT EXISTS idx_group_students_student ON group_students(student_id);

-- Add course_start_date to group_students (when student was added to course)
ALTER TABLE group_students
ADD COLUMN IF NOT EXISTS course_start_date DATE DEFAULT CURRENT_DATE;

-- Update payment_due_date logic: use course_start_date day of month
-- Payment reminders will be sent on the same day each month based on course_start_date

-- Add index for course_start_date
CREATE INDEX IF NOT EXISTS idx_group_students_course_start ON group_students(course_start_date);

-- Create pending_students table for students added by main teacher
CREATE TABLE IF NOT EXISTS pending_students (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  email VARCHAR(255) UNIQUE NOT NULL,
  phone_number VARCHAR(20) NOT NULL,
  created_by UUID REFERENCES users(id),
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Add index
CREATE INDEX IF NOT EXISTS idx_pending_students_email ON pending_students(email);

-- Add comments
COMMENT ON COLUMN users.age IS 'Student age';
COMMENT ON COLUMN users.english_level IS 'Student English proficiency level';
COMMENT ON COLUMN users.certificate_type IS 'Certificate type: IELTS or CEFR';
COMMENT ON COLUMN group_students.course_start_date IS 'Date when student started the course (used for payment reminders)';
COMMENT ON TABLE pending_students IS 'Students added by main teacher before they complete registration';

