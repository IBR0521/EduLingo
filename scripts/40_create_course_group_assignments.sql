-- Ensure user_role enum exists (required for users table)
DO $$ BEGIN
  CREATE TYPE user_role AS ENUM ('main_teacher', 'teacher', 'student', 'parent');
EXCEPTION
  WHEN duplicate_object THEN null;
END $$;

-- Ensure users table exists first (required for foreign keys)
CREATE TABLE IF NOT EXISTS users (
  id UUID PRIMARY KEY,
  email VARCHAR(255) UNIQUE NOT NULL,
  full_name VARCHAR(255) NOT NULL,
  role user_role NOT NULL,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Ensure courses table exists (required for foreign key)
-- This table should be created by scripts/18_create_course_hierarchy.sql
-- But we'll create it here if it doesn't exist for safety
CREATE TABLE IF NOT EXISTS courses (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name VARCHAR(255) NOT NULL,
  description TEXT,
  level VARCHAR(50),
  category VARCHAR(100),
  duration_hours INTEGER,
  is_active BOOLEAN DEFAULT TRUE,
  created_by UUID REFERENCES users(id),
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Ensure groups table exists (required for foreign key)
CREATE TABLE IF NOT EXISTS groups (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name VARCHAR(255) NOT NULL,
  description TEXT,
  teacher_id UUID REFERENCES users(id) ON DELETE SET NULL,
  created_by UUID REFERENCES users(id),
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Ensure group_students table exists (required for RLS policies)
CREATE TABLE IF NOT EXISTS group_students (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  group_id UUID REFERENCES groups(id) ON DELETE CASCADE,
  student_id UUID REFERENCES users(id) ON DELETE CASCADE,
  enrolled_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  UNIQUE(group_id, student_id)
);

-- Ensure parent_student table exists (required for RLS policies)
CREATE TABLE IF NOT EXISTS parent_student (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  parent_id UUID REFERENCES users(id) ON DELETE CASCADE,
  student_id UUID REFERENCES users(id) ON DELETE CASCADE,
  access_code VARCHAR(50) UNIQUE NOT NULL,
  is_linked BOOLEAN DEFAULT FALSE,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  UNIQUE(parent_id, student_id)
);

-- Create course_group_assignments table
-- Links courses to groups with specific date and time
CREATE TABLE IF NOT EXISTS course_group_assignments (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  course_id UUID REFERENCES courses(id) ON DELETE CASCADE,
  group_id UUID REFERENCES groups(id) ON DELETE CASCADE,
  course_date DATE NOT NULL,
  course_time TIME NOT NULL,
  created_by UUID REFERENCES users(id),
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  UNIQUE(course_id, group_id, course_date) -- Prevent duplicate assignments for same course-group-date
);

-- Add homeworks field to courses table (JSONB to store array of homework objects)
ALTER TABLE courses
ADD COLUMN IF NOT EXISTS homeworks JSONB DEFAULT '[]'::jsonb;

-- Create index for faster queries
CREATE INDEX IF NOT EXISTS idx_course_group_assignments_course ON course_group_assignments(course_id);
CREATE INDEX IF NOT EXISTS idx_course_group_assignments_group ON course_group_assignments(group_id);
CREATE INDEX IF NOT EXISTS idx_course_group_assignments_date ON course_group_assignments(course_date);

-- RLS for course_group_assignments
ALTER TABLE course_group_assignments ENABLE ROW LEVEL SECURITY;

-- Main teachers can manage course-group assignments
CREATE POLICY "Main teachers can manage course-group assignments" ON course_group_assignments
FOR ALL USING (
  EXISTS (SELECT 1 FROM users WHERE id = auth.uid() AND role = 'main_teacher')
) WITH CHECK (
  EXISTS (SELECT 1 FROM users WHERE id = auth.uid() AND role = 'main_teacher')
);

-- Teachers can view assignments for their groups
CREATE POLICY "Teachers can view assignments for their groups" ON course_group_assignments
FOR SELECT USING (
  EXISTS (
    SELECT 1 FROM groups 
    WHERE id = course_group_assignments.group_id 
    AND teacher_id = auth.uid()
  )
);

-- Students can view assignments for their groups
CREATE POLICY "Students can view assignments for their groups" ON course_group_assignments
FOR SELECT USING (
  EXISTS (
    SELECT 1 FROM group_students 
    WHERE group_id = course_group_assignments.group_id 
    AND student_id = auth.uid()
  )
);

-- Parents can view assignments for their children's groups
CREATE POLICY "Parents can view assignments for their children's groups" ON course_group_assignments
FOR SELECT USING (
  EXISTS (
    SELECT 1 FROM group_students gs
    JOIN parent_student ps ON ps.student_id = gs.student_id
    WHERE gs.group_id = course_group_assignments.group_id 
    AND ps.parent_id = auth.uid()
    AND ps.is_linked = true
  )
);

-- Service role has full access
CREATE POLICY "Service role has full access to course_group_assignments" ON course_group_assignments
FOR ALL USING (true) WITH CHECK (true);

-- Add comment for documentation
COMMENT ON TABLE course_group_assignments IS 'Links courses to groups with specific date and time for each assignment';
COMMENT ON COLUMN course_group_assignments.course_date IS 'Date when the course will be held for this group';
COMMENT ON COLUMN course_group_assignments.course_time IS 'Time (hour) when the course will be held for this group';
COMMENT ON COLUMN courses.homeworks IS 'JSONB array of homework objects: [{title, description, due_date}]';

