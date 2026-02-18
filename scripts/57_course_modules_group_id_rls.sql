-- RLS Policies for course_modules table (group_id schema)
-- This is for the learning paths system that uses group_id, not course_id
-- Run this if course_modules uses group_id column

-- Enable RLS on course_modules (if not already enabled)
ALTER TABLE course_modules ENABLE ROW LEVEL SECURITY;

-- Drop existing policies if they exist (to avoid conflicts)
DROP POLICY IF EXISTS "Users can read course modules in their groups" ON course_modules;
DROP POLICY IF EXISTS "Teachers can create course modules" ON course_modules;
DROP POLICY IF EXISTS "Teachers can update course modules" ON course_modules;
DROP POLICY IF EXISTS "Teachers can delete course modules" ON course_modules;

-- Check if course_modules has group_id column (learning paths schema)
DO $$
BEGIN
  -- Only create policies if group_id column exists
  IF EXISTS (
    SELECT 1 FROM information_schema.columns 
    WHERE table_schema = 'public' 
    AND table_name = 'course_modules' 
    AND column_name = 'group_id'
  ) THEN
    -- Users can read course modules for groups they belong to
    CREATE POLICY "Users can read course modules in their groups"
      ON course_modules FOR SELECT
      USING (
        group_id IN (
          SELECT group_id FROM group_students WHERE student_id = auth.uid()
          UNION
          SELECT id FROM groups WHERE teacher_id = auth.uid() OR created_by = auth.uid()
        )
        OR
        auth.uid() IN (SELECT id FROM users WHERE role = 'main_teacher')
      );

    -- Teachers can create course modules for groups they manage
    CREATE POLICY "Teachers can create course modules"
      ON course_modules FOR INSERT
      WITH CHECK (
        group_id IN (
          SELECT id FROM groups WHERE teacher_id = auth.uid() OR created_by = auth.uid()
        )
        OR
        auth.uid() IN (SELECT id FROM users WHERE role = 'main_teacher')
      );

    -- Teachers can update course modules they created or in groups they manage
    CREATE POLICY "Teachers can update course modules"
      ON course_modules FOR UPDATE
      USING (
        created_by = auth.uid()
        OR
        group_id IN (
          SELECT id FROM groups WHERE teacher_id = auth.uid() OR created_by = auth.uid()
        )
        OR
        auth.uid() IN (SELECT id FROM users WHERE role = 'main_teacher')
      )
      WITH CHECK (
        created_by = auth.uid()
        OR
        group_id IN (
          SELECT id FROM groups WHERE teacher_id = auth.uid() OR created_by = auth.uid()
        )
        OR
        auth.uid() IN (SELECT id FROM users WHERE role = 'main_teacher')
      );

    -- Teachers can delete course modules they created or in groups they manage
    CREATE POLICY "Teachers can delete course modules"
      ON course_modules FOR DELETE
      USING (
        created_by = auth.uid()
        OR
        group_id IN (
          SELECT id FROM groups WHERE teacher_id = auth.uid() OR created_by = auth.uid()
        )
        OR
        auth.uid() IN (SELECT id FROM users WHERE role = 'main_teacher')
      );
    
    RAISE NOTICE 'RLS policies created for course_modules (group_id schema)';
  ELSE
    RAISE NOTICE 'course_modules table does not have group_id column, skipping group_id-based policies';
  END IF;
END $$;

