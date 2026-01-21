-- RLS Policies for Course Hierarchy Tables
-- This ensures proper access control for courses, modules, lessons, and topics
-- Run this AFTER running 18_create_course_hierarchy.sql or 18_create_course_hierarchy_basic.sql

-- Enable RLS on all course hierarchy tables (only if they exist)
DO $$
BEGIN
  IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_schema = 'public' AND table_name = 'courses') THEN
    ALTER TABLE courses ENABLE ROW LEVEL SECURITY;
  END IF;
  IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_schema = 'public' AND table_name = 'course_modules') THEN
    ALTER TABLE course_modules ENABLE ROW LEVEL SECURITY;
  END IF;
  IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_schema = 'public' AND table_name = 'course_lessons') THEN
    ALTER TABLE course_lessons ENABLE ROW LEVEL SECURITY;
  END IF;
  IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_schema = 'public' AND table_name = 'course_topics') THEN
    ALTER TABLE course_topics ENABLE ROW LEVEL SECURITY;
  END IF;
  IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_schema = 'public' AND table_name = 'group_courses') THEN
    ALTER TABLE group_courses ENABLE ROW LEVEL SECURITY;
  END IF;
  IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_schema = 'public' AND table_name = 'course_templates') THEN
    ALTER TABLE course_templates ENABLE ROW LEVEL SECURITY;
  END IF;
  IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_schema = 'public' AND table_name = 'course_prerequisites') THEN
    ALTER TABLE course_prerequisites ENABLE ROW LEVEL SECURITY;
  END IF;
  IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_schema = 'public' AND table_name = 'student_course_progress') THEN
    ALTER TABLE student_course_progress ENABLE ROW LEVEL SECURITY;
  END IF;
END $$;

-- Drop existing policies if they exist (only if tables exist)
DO $$
BEGIN
  IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_schema = 'public' AND table_name = 'courses') THEN
    DROP POLICY IF EXISTS "Teachers can read all courses" ON courses;
    DROP POLICY IF EXISTS "Teachers can create courses" ON courses;
    DROP POLICY IF EXISTS "Teachers can update own courses" ON courses;
    DROP POLICY IF EXISTS "Students can read enrolled courses" ON courses;
  END IF;
  IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_schema = 'public' AND table_name = 'course_modules') THEN
    DROP POLICY IF EXISTS "Authenticated users can read modules" ON course_modules;
    DROP POLICY IF EXISTS "Teachers can manage modules" ON course_modules;
  END IF;
  IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_schema = 'public' AND table_name = 'course_lessons') THEN
    DROP POLICY IF EXISTS "Authenticated users can read lessons" ON course_lessons;
    DROP POLICY IF EXISTS "Teachers can manage lessons" ON course_lessons;
  END IF;
  IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_schema = 'public' AND table_name = 'course_topics') THEN
    DROP POLICY IF EXISTS "Authenticated users can read topics" ON course_topics;
    DROP POLICY IF EXISTS "Teachers can manage topics" ON course_topics;
  END IF;
  IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_schema = 'public' AND table_name = 'group_courses') THEN
    DROP POLICY IF EXISTS "Authenticated users can read group courses" ON group_courses;
    DROP POLICY IF EXISTS "Teachers can manage group courses" ON group_courses;
  END IF;
  IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_schema = 'public' AND table_name = 'course_templates') THEN
    DROP POLICY IF EXISTS "Authenticated users can read templates" ON course_templates;
    DROP POLICY IF EXISTS "Teachers can manage templates" ON course_templates;
  END IF;
  IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_schema = 'public' AND table_name = 'course_prerequisites') THEN
    DROP POLICY IF EXISTS "Authenticated users can read prerequisites" ON course_prerequisites;
    DROP POLICY IF EXISTS "Teachers can manage prerequisites" ON course_prerequisites;
  END IF;
  IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_schema = 'public' AND table_name = 'student_course_progress') THEN
    DROP POLICY IF EXISTS "Students can read own progress" ON student_course_progress;
    DROP POLICY IF EXISTS "Teachers can read student progress" ON student_course_progress;
    DROP POLICY IF EXISTS "Students can update own progress" ON student_course_progress;
    DROP POLICY IF EXISTS "Students can insert own progress" ON student_course_progress;
  END IF;
END $$;

-- Courses policies (only create if table and columns exist)
DO $$
BEGIN
  IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_schema = 'public' AND table_name = 'courses') THEN
    IF EXISTS (SELECT 1 FROM information_schema.columns WHERE table_schema = 'public' AND table_name = 'courses' AND column_name = 'created_by') THEN
      -- Teachers can read all courses
      CREATE POLICY "Teachers can read all courses"
        ON courses FOR SELECT
        USING (
          auth.role() = 'authenticated' AND (
            auth.uid() IN (SELECT id FROM users WHERE role IN ('main_teacher', 'teacher'))
            OR created_by = auth.uid()
          )
        );
    END IF;
  END IF;
END $$;

-- Students can read courses they're enrolled in (only if group_courses table exists)
DO $$
BEGIN
  IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_schema = 'public' AND table_name = 'courses') THEN
    IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_schema = 'public' AND table_name = 'group_courses') THEN
      IF EXISTS (SELECT 1 FROM information_schema.columns WHERE table_schema = 'public' AND table_name = 'group_courses' AND column_name = 'course_id') THEN
        IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_schema = 'public' AND table_name = 'group_students') THEN
          IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE schemaname = 'public' AND tablename = 'courses' AND policyname = 'Students can read enrolled courses') THEN
            CREATE POLICY "Students can read enrolled courses"
              ON courses FOR SELECT
              USING (
                auth.role() = 'authenticated' AND (
                  id IN (
                    SELECT course_id FROM group_courses
                    WHERE group_id IN (
                      SELECT group_id FROM group_students WHERE student_id = auth.uid()
                    )
                  )
                )
              );
          END IF;
        END IF;
      END IF;
    END IF;
  END IF;
END $$;

-- Teachers can create courses
DO $$
BEGIN
  IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_schema = 'public' AND table_name = 'courses') THEN
    CREATE POLICY "Teachers can create courses"
      ON courses FOR INSERT
      WITH CHECK (
        auth.uid() IN (SELECT id FROM users WHERE role IN ('main_teacher', 'teacher'))
      );
    
    -- Teachers can update their own courses (or main teachers can update any)
    IF EXISTS (SELECT 1 FROM information_schema.columns WHERE table_schema = 'public' AND table_name = 'courses' AND column_name = 'created_by') THEN
      CREATE POLICY "Teachers can update own courses"
        ON courses FOR UPDATE
        USING (
          created_by = auth.uid() OR
          auth.uid() IN (SELECT id FROM users WHERE role = 'main_teacher')
        );
    END IF;
  END IF;
END $$;

-- Course Modules policies
-- Authenticated users can read modules for courses they have access to
DO $$
BEGIN
  IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_schema = 'public' AND table_name = 'course_modules') THEN
    IF EXISTS (SELECT 1 FROM information_schema.columns WHERE table_schema = 'public' AND table_name = 'course_modules' AND column_name = 'course_id') THEN
      IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_schema = 'public' AND table_name = 'courses') THEN
        CREATE POLICY "Authenticated users can read modules"
          ON course_modules FOR SELECT
          USING (
            auth.role() = 'authenticated' AND (
              course_id IN (SELECT id FROM courses WHERE
                created_by = auth.uid() OR
                auth.uid() IN (SELECT id FROM users WHERE role IN ('main_teacher', 'teacher'))
              )
            )
          );
      END IF;
    END IF;
  END IF;
END $$;

-- Teachers can manage modules
DO $$
BEGIN
  IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_schema = 'public' AND table_name = 'course_modules') THEN
    IF EXISTS (SELECT 1 FROM information_schema.columns WHERE table_schema = 'public' AND table_name = 'course_modules' AND column_name = 'course_id') THEN
      IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_schema = 'public' AND table_name = 'courses') THEN
        CREATE POLICY "Teachers can manage modules"
          ON course_modules FOR ALL
          USING (
            auth.uid() IN (SELECT id FROM users WHERE role IN ('main_teacher', 'teacher')) AND
            course_id IN (SELECT id FROM courses WHERE created_by = auth.uid() OR auth.uid() IN (SELECT id FROM users WHERE role = 'main_teacher'))
          );
      END IF;
    END IF;
  END IF;
END $$;

-- Course Lessons policies
-- Authenticated users can read lessons for modules they have access to
DO $$
BEGIN
  IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_schema = 'public' AND table_name = 'course_lessons') THEN
    IF EXISTS (SELECT 1 FROM information_schema.columns WHERE table_schema = 'public' AND table_name = 'course_lessons' AND column_name = 'module_id') THEN
      IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_schema = 'public' AND table_name = 'course_modules') THEN
        IF EXISTS (SELECT 1 FROM information_schema.columns WHERE table_schema = 'public' AND table_name = 'course_modules' AND column_name = 'course_id') THEN
          IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_schema = 'public' AND table_name = 'courses') THEN
            CREATE POLICY "Authenticated users can read lessons"
              ON course_lessons FOR SELECT
              USING (
                auth.role() = 'authenticated' AND (
                  module_id IN (SELECT id FROM course_modules WHERE
                    course_id IN (SELECT id FROM courses WHERE
                      created_by = auth.uid() OR
                      auth.uid() IN (SELECT id FROM users WHERE role IN ('main_teacher', 'teacher'))
                    )
                  )
                )
              );
          END IF;
        END IF;
      END IF;
    END IF;
  END IF;
END $$;

-- Teachers can manage lessons
DO $$
BEGIN
  IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_schema = 'public' AND table_name = 'course_lessons') THEN
    IF EXISTS (SELECT 1 FROM information_schema.columns WHERE table_schema = 'public' AND table_name = 'course_lessons' AND column_name = 'module_id') THEN
      IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_schema = 'public' AND table_name = 'course_modules') THEN
        IF EXISTS (SELECT 1 FROM information_schema.columns WHERE table_schema = 'public' AND table_name = 'course_modules' AND column_name = 'course_id') THEN
          IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_schema = 'public' AND table_name = 'courses') THEN
            CREATE POLICY "Teachers can manage lessons"
              ON course_lessons FOR ALL
              USING (
                auth.uid() IN (SELECT id FROM users WHERE role IN ('main_teacher', 'teacher')) AND
                module_id IN (
                  SELECT id FROM course_modules WHERE
                    course_id IN (SELECT id FROM courses WHERE created_by = auth.uid() OR auth.uid() IN (SELECT id FROM users WHERE role = 'main_teacher'))
                )
              );
          END IF;
        END IF;
      END IF;
    END IF;
  END IF;
END $$;

-- Course Topics policies
-- Authenticated users can read topics for lessons they have access to
DO $$
BEGIN
  IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_schema = 'public' AND table_name = 'course_topics') THEN
    IF EXISTS (SELECT 1 FROM information_schema.columns WHERE table_schema = 'public' AND table_name = 'course_topics' AND column_name = 'lesson_id') THEN
      IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_schema = 'public' AND table_name = 'course_lessons') THEN
        IF EXISTS (SELECT 1 FROM information_schema.columns WHERE table_schema = 'public' AND table_name = 'course_lessons' AND column_name = 'module_id') THEN
          IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_schema = 'public' AND table_name = 'course_modules') THEN
            IF EXISTS (SELECT 1 FROM information_schema.columns WHERE table_schema = 'public' AND table_name = 'course_modules' AND column_name = 'course_id') THEN
              IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_schema = 'public' AND table_name = 'courses') THEN
                CREATE POLICY "Authenticated users can read topics"
                  ON course_topics FOR SELECT
                  USING (
                    auth.role() = 'authenticated' AND (
                      lesson_id IN (SELECT id FROM course_lessons WHERE
                        module_id IN (SELECT id FROM course_modules WHERE
                          course_id IN (SELECT id FROM courses WHERE
                            created_by = auth.uid() OR
                            auth.uid() IN (SELECT id FROM users WHERE role IN ('main_teacher', 'teacher'))
                          )
                        )
                      )
                    )
                  );
              END IF;
            END IF;
          END IF;
        END IF;
      END IF;
    END IF;
  END IF;
END $$;

-- Teachers can manage topics
DO $$
BEGIN
  IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_schema = 'public' AND table_name = 'course_topics') THEN
    IF EXISTS (SELECT 1 FROM information_schema.columns WHERE table_schema = 'public' AND table_name = 'course_topics' AND column_name = 'lesson_id') THEN
      IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_schema = 'public' AND table_name = 'course_lessons') THEN
        IF EXISTS (SELECT 1 FROM information_schema.columns WHERE table_schema = 'public' AND table_name = 'course_lessons' AND column_name = 'module_id') THEN
          IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_schema = 'public' AND table_name = 'course_modules') THEN
            IF EXISTS (SELECT 1 FROM information_schema.columns WHERE table_schema = 'public' AND table_name = 'course_modules' AND column_name = 'course_id') THEN
              IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_schema = 'public' AND table_name = 'courses') THEN
                CREATE POLICY "Teachers can manage topics"
                  ON course_topics FOR ALL
                  USING (
                    auth.uid() IN (SELECT id FROM users WHERE role IN ('main_teacher', 'teacher')) AND
                    lesson_id IN (
                      SELECT id FROM course_lessons WHERE
                        module_id IN (
                          SELECT id FROM course_modules WHERE
                            course_id IN (SELECT id FROM courses WHERE created_by = auth.uid() OR auth.uid() IN (SELECT id FROM users WHERE role = 'main_teacher'))
                        )
                    )
                  );
              END IF;
            END IF;
          END IF;
        END IF;
      END IF;
    END IF;
  END IF;
END $$;

-- Group Courses policies (only create if group_courses table exists)
DO $$
BEGIN
  IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_schema = 'public' AND table_name = 'group_courses') THEN
    IF EXISTS (SELECT 1 FROM information_schema.columns WHERE table_schema = 'public' AND table_name = 'group_courses' AND column_name = 'group_id') THEN
      -- Authenticated users can read group courses for groups they're part of
      IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_schema = 'public' AND table_name = 'group_students') THEN
        IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_schema = 'public' AND table_name = 'groups') THEN
          CREATE POLICY "Authenticated users can read group courses"
            ON group_courses FOR SELECT
            USING (
              auth.role() = 'authenticated' AND (
                group_id IN (
                  SELECT group_id FROM group_students WHERE student_id = auth.uid()
                ) OR
                group_id IN (
                  SELECT id FROM groups WHERE teacher_id = auth.uid() OR created_by = auth.uid()
                )
              )
            );
        END IF;
      END IF;
      
      -- Teachers can manage group courses
      IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_schema = 'public' AND table_name = 'groups') THEN
        CREATE POLICY "Teachers can manage group courses"
          ON group_courses FOR ALL
          USING (
            auth.uid() IN (SELECT id FROM users WHERE role IN ('main_teacher', 'teacher')) AND
            group_id IN (
              SELECT id FROM groups WHERE teacher_id = auth.uid() OR created_by = auth.uid() OR auth.uid() IN (SELECT id FROM users WHERE role = 'main_teacher')
            )
          );
      END IF;
    END IF;
  END IF;
END $$;

-- Course Templates policies
DO $$
BEGIN
  IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_schema = 'public' AND table_name = 'course_templates') THEN
    IF EXISTS (SELECT 1 FROM information_schema.columns WHERE table_schema = 'public' AND table_name = 'course_templates' AND column_name = 'is_public') THEN
      IF EXISTS (SELECT 1 FROM information_schema.columns WHERE table_schema = 'public' AND table_name = 'course_templates' AND column_name = 'created_by') THEN
        -- Authenticated users can read public templates or their own
        CREATE POLICY "Authenticated users can read templates"
          ON course_templates FOR SELECT
          USING (
            auth.role() = 'authenticated' AND (
              is_public = TRUE OR created_by = auth.uid()
            )
          );
        
        -- Teachers can manage templates
        CREATE POLICY "Teachers can manage templates"
          ON course_templates FOR ALL
          USING (
            auth.uid() IN (SELECT id FROM users WHERE role IN ('main_teacher', 'teacher')) AND
            (created_by = auth.uid() OR auth.uid() IN (SELECT id FROM users WHERE role = 'main_teacher'))
          );
      END IF;
    END IF;
  END IF;
END $$;

-- Course Prerequisites policies
DO $$
BEGIN
  IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_schema = 'public' AND table_name = 'course_prerequisites') THEN
    -- Authenticated users can read prerequisites
    CREATE POLICY "Authenticated users can read prerequisites"
      ON course_prerequisites FOR SELECT
      USING (auth.role() = 'authenticated');
    
    -- Teachers can manage prerequisites
    IF EXISTS (SELECT 1 FROM information_schema.columns WHERE table_schema = 'public' AND table_name = 'course_prerequisites' AND column_name = 'course_id') THEN
      IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_schema = 'public' AND table_name = 'courses') THEN
        CREATE POLICY "Teachers can manage prerequisites"
          ON course_prerequisites FOR ALL
          USING (
            auth.uid() IN (SELECT id FROM users WHERE role IN ('main_teacher', 'teacher')) AND
            course_id IN (SELECT id FROM courses WHERE created_by = auth.uid() OR auth.uid() IN (SELECT id FROM users WHERE role = 'main_teacher'))
          );
      END IF;
    END IF;
  END IF;
END $$;

-- Student Course Progress policies
DO $$
BEGIN
  IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_schema = 'public' AND table_name = 'student_course_progress') THEN
    IF EXISTS (SELECT 1 FROM information_schema.columns WHERE table_schema = 'public' AND table_name = 'student_course_progress' AND column_name = 'student_id') THEN
      -- Students can read their own progress
      CREATE POLICY "Students can read own progress"
        ON student_course_progress FOR SELECT
        USING (student_id = auth.uid());
      
      -- Teachers can read student progress for their groups
      CREATE POLICY "Teachers can read student progress"
        ON student_course_progress FOR SELECT
        USING (
          auth.uid() IN (SELECT id FROM users WHERE role IN ('main_teacher', 'teacher'))
        );
      
      -- Students can update their own progress
      CREATE POLICY "Students can update own progress"
        ON student_course_progress FOR UPDATE
        USING (student_id = auth.uid())
        WITH CHECK (student_id = auth.uid());
      
      -- Students can insert their own progress
      CREATE POLICY "Students can insert own progress"
        ON student_course_progress FOR INSERT
        WITH CHECK (student_id = auth.uid());
    END IF;
  END IF;
END $$;

