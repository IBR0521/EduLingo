-- RLS Policies for Rubric-Based Grading System
-- Run this AFTER running 20_create_rubrics.sql

-- Enable RLS on all rubric tables
DO $$
BEGIN
  IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_schema = 'public' AND table_name = 'rubrics') THEN
    ALTER TABLE rubrics ENABLE ROW LEVEL SECURITY;
  END IF;
  IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_schema = 'public' AND table_name = 'rubric_criteria') THEN
    ALTER TABLE rubric_criteria ENABLE ROW LEVEL SECURITY;
  END IF;
  IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_schema = 'public' AND table_name = 'rubric_grades') THEN
    ALTER TABLE rubric_grades ENABLE ROW LEVEL SECURITY;
  END IF;
END $$;

-- Drop existing policies if they exist
DO $$
BEGIN
  IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_schema = 'public' AND table_name = 'rubrics') THEN
    DROP POLICY IF EXISTS "Teachers can read rubrics" ON rubrics;
    DROP POLICY IF EXISTS "Teachers can manage rubrics" ON rubrics;
    DROP POLICY IF EXISTS "Students can read rubrics for their assignments" ON rubrics;
  END IF;
  IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_schema = 'public' AND table_name = 'rubric_criteria') THEN
    DROP POLICY IF EXISTS "Authenticated users can read criteria" ON rubric_criteria;
    DROP POLICY IF EXISTS "Teachers can manage criteria" ON rubric_criteria;
  END IF;
  IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_schema = 'public' AND table_name = 'rubric_grades') THEN
    DROP POLICY IF EXISTS "Students can read own grades" ON rubric_grades;
    DROP POLICY IF EXISTS "Teachers can read grades" ON rubric_grades;
    DROP POLICY IF EXISTS "Teachers can manage grades" ON rubric_grades;
  END IF;
END $$;

-- Rubrics policies
DO $$
BEGIN
  IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_schema = 'public' AND table_name = 'rubrics') THEN
    -- Teachers can read all rubrics
    CREATE POLICY "Teachers can read rubrics"
      ON rubrics FOR SELECT
      USING (
        auth.role() = 'authenticated' AND (
          auth.uid() IN (SELECT id FROM users WHERE role IN ('main_teacher', 'teacher')) OR
          created_by = auth.uid() OR
          is_public = TRUE
        )
      );

    -- Students can read rubrics for their assignments
    IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_schema = 'public' AND table_name = 'assignments') AND
       EXISTS (SELECT 1 FROM information_schema.tables WHERE table_schema = 'public' AND table_name = 'group_students') THEN
      EXECUTE 'CREATE POLICY "Students can read rubrics for their assignments"
        ON rubrics FOR SELECT
        USING (
          auth.role() = ''authenticated'' AND (
            auth.uid() IN (SELECT id FROM users WHERE role = ''student'') AND
            (
              assignment_id IN (
                SELECT id FROM assignments WHERE
                  group_id IN (SELECT group_id FROM group_students WHERE student_id = auth.uid())
              ) OR
              is_public = TRUE
            )
          )
        )';
    END IF;

    -- Teachers can manage rubrics
    CREATE POLICY "Teachers can manage rubrics"
      ON rubrics FOR ALL
      USING (
        auth.uid() IN (SELECT id FROM users WHERE role IN ('main_teacher', 'teacher')) AND
        (created_by = auth.uid() OR auth.uid() IN (SELECT id FROM users WHERE role = 'main_teacher'))
      );
  END IF;
END $$;

-- Rubric Criteria policies
DO $$
BEGIN
  IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_schema = 'public' AND table_name = 'rubric_criteria') AND
     EXISTS (SELECT 1 FROM information_schema.columns WHERE table_schema = 'public' AND table_name = 'rubric_criteria' AND column_name = 'rubric_id') THEN
    -- Authenticated users can read criteria for rubrics they can access
    CREATE POLICY "Authenticated users can read criteria"
      ON rubric_criteria FOR SELECT
      USING (
        auth.role() = 'authenticated' AND
        rubric_id IN (SELECT id FROM rubrics)
      );

    -- Teachers can manage criteria
    CREATE POLICY "Teachers can manage criteria"
      ON rubric_criteria FOR ALL
      USING (
        auth.uid() IN (SELECT id FROM users WHERE role IN ('main_teacher', 'teacher')) AND
        rubric_id IN (
          SELECT id FROM rubrics WHERE
            created_by = auth.uid() OR
            auth.uid() IN (SELECT id FROM users WHERE role = 'main_teacher')
        )
      );
  END IF;
END $$;

-- Rubric Grades policies
DO $$
BEGIN
  IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_schema = 'public' AND table_name = 'rubric_grades') AND
     EXISTS (SELECT 1 FROM information_schema.columns WHERE table_schema = 'public' AND table_name = 'rubric_grades' AND column_name = 'student_id') THEN
    -- Students can read their own grades
    CREATE POLICY "Students can read own grades"
      ON rubric_grades FOR SELECT
      USING (student_id = auth.uid());

    -- Teachers can read grades for their groups
    IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_schema = 'public' AND table_name = 'assignments') AND
       EXISTS (SELECT 1 FROM information_schema.tables WHERE table_schema = 'public' AND table_name = 'groups') THEN
      EXECUTE 'CREATE POLICY "Teachers can read grades"
        ON rubric_grades FOR SELECT
        USING (
          auth.uid() IN (SELECT id FROM users WHERE role IN (''main_teacher'', ''teacher'')) AND
          assignment_id IN (
            SELECT id FROM assignments WHERE
              group_id IN (
                SELECT id FROM groups WHERE
                  teacher_id = auth.uid() OR
                  created_by = auth.uid() OR
                  auth.uid() IN (SELECT id FROM users WHERE role = ''main_teacher'')
              )
          )
        )';
    END IF;

    -- Teachers can manage grades
    IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_schema = 'public' AND table_name = 'assignments') AND
       EXISTS (SELECT 1 FROM information_schema.tables WHERE table_schema = 'public' AND table_name = 'groups') THEN
      EXECUTE 'CREATE POLICY "Teachers can manage grades"
        ON rubric_grades FOR ALL
        USING (
          auth.uid() IN (SELECT id FROM users WHERE role IN (''main_teacher'', ''teacher'')) AND
          assignment_id IN (
            SELECT id FROM assignments WHERE
              group_id IN (
                SELECT id FROM groups WHERE
                  teacher_id = auth.uid() OR
                  created_by = auth.uid() OR
                  auth.uid() IN (SELECT id FROM users WHERE role = ''main_teacher'')
              )
          )
        )';
    END IF;
  END IF;
END $$;








