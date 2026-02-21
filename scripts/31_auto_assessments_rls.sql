-- RLS Policies for Automated Assessment System
-- Run this AFTER running 30_create_auto_assessments.sql

-- Enable RLS on all assessment tables
DO $$
BEGIN
  IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_schema = 'public' AND table_name = 'assessment_questions') THEN
    ALTER TABLE assessment_questions ENABLE ROW LEVEL SECURITY;
  END IF;
  IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_schema = 'public' AND table_name = 'assessment_submissions') THEN
    ALTER TABLE assessment_submissions ENABLE ROW LEVEL SECURITY;
  END IF;
  IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_schema = 'public' AND table_name = 'assessment_answers') THEN
    ALTER TABLE assessment_answers ENABLE ROW LEVEL SECURITY;
  END IF;
END $$;

-- Drop existing policies if they exist
DO $$
BEGIN
  IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_schema = 'public' AND table_name = 'assessment_questions') THEN
    DROP POLICY IF EXISTS "Authenticated users can read questions" ON assessment_questions;
    DROP POLICY IF EXISTS "Teachers can manage questions" ON assessment_questions;
  END IF;
  IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_schema = 'public' AND table_name = 'assessment_submissions') THEN
    DROP POLICY IF EXISTS "Students can read own submissions" ON assessment_submissions;
    DROP POLICY IF EXISTS "Teachers can read submissions" ON assessment_submissions;
    DROP POLICY IF EXISTS "Students can create submissions" ON assessment_submissions;
    DROP POLICY IF EXISTS "Students can update own submissions" ON assessment_submissions;
  END IF;
  IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_schema = 'public' AND table_name = 'assessment_answers') THEN
    DROP POLICY IF EXISTS "Students can read own answers" ON assessment_answers;
    DROP POLICY IF EXISTS "Teachers can read answers" ON assessment_answers;
    DROP POLICY IF EXISTS "Students can manage own answers" ON assessment_answers;
  END IF;
END $$;

-- Assessment Questions policies
DO $$
BEGIN
  IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_schema = 'public' AND table_name = 'assessment_questions') AND
     EXISTS (SELECT 1 FROM information_schema.columns WHERE table_schema = 'public' AND table_name = 'assessment_questions' AND column_name = 'assignment_id') THEN
    -- Authenticated users can read questions for their assignments
    IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_schema = 'public' AND table_name = 'assignments') AND
       EXISTS (SELECT 1 FROM information_schema.tables WHERE table_schema = 'public' AND table_name = 'group_students') THEN
      EXECUTE 'CREATE POLICY "Authenticated users can read questions"
        ON assessment_questions FOR SELECT
        USING (
          auth.role() = ''authenticated'' AND
          assignment_id IN (
            SELECT id FROM assignments WHERE
              group_id IN (
                SELECT group_id FROM group_students WHERE student_id = auth.uid()
              ) OR
              group_id IN (
                SELECT id FROM groups WHERE
                  teacher_id = auth.uid() OR
                  created_by = auth.uid() OR
                  auth.uid() IN (SELECT id FROM users WHERE role = ''main_teacher'')
              )
          )
        )';
    END IF;

    -- Teachers can manage questions
    IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_schema = 'public' AND table_name = 'assignments') AND
       EXISTS (SELECT 1 FROM information_schema.tables WHERE table_schema = 'public' AND table_name = 'groups') THEN
      EXECUTE 'CREATE POLICY "Teachers can manage questions"
        ON assessment_questions FOR ALL
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

-- Assessment Submissions policies
DO $$
BEGIN
  IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_schema = 'public' AND table_name = 'assessment_submissions') AND
     EXISTS (SELECT 1 FROM information_schema.columns WHERE table_schema = 'public' AND table_name = 'assessment_submissions' AND column_name = 'student_id') THEN
    -- Students can read their own submissions
    CREATE POLICY "Students can read own submissions"
      ON assessment_submissions FOR SELECT
      USING (student_id = auth.uid());

    -- Teachers can read submissions for their groups
    IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_schema = 'public' AND table_name = 'assignments') AND
       EXISTS (SELECT 1 FROM information_schema.tables WHERE table_schema = 'public' AND table_name = 'groups') THEN
      EXECUTE 'CREATE POLICY "Teachers can read submissions"
        ON assessment_submissions FOR SELECT
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

    -- Students can create submissions
    CREATE POLICY "Students can create submissions"
      ON assessment_submissions FOR INSERT
      WITH CHECK (student_id = auth.uid());

    -- Students can update their own submissions (before completion)
    CREATE POLICY "Students can update own submissions"
      ON assessment_submissions FOR UPDATE
      USING (student_id = auth.uid() AND is_completed = FALSE)
      WITH CHECK (student_id = auth.uid());
  END IF;
END $$;

-- Assessment Answers policies
DO $$
BEGIN
  IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_schema = 'public' AND table_name = 'assessment_answers') AND
     EXISTS (SELECT 1 FROM information_schema.columns WHERE table_schema = 'public' AND table_name = 'assessment_answers' AND column_name = 'submission_id') THEN
    -- Students can read their own answers
    IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_schema = 'public' AND table_name = 'assessment_submissions') THEN
      EXECUTE 'CREATE POLICY "Students can read own answers"
        ON assessment_answers FOR SELECT
        USING (
          submission_id IN (SELECT id FROM assessment_submissions WHERE student_id = auth.uid())
        )';
    END IF;

    -- Teachers can read all answers
    CREATE POLICY "Teachers can read answers"
      ON assessment_answers FOR SELECT
      USING (
        auth.uid() IN (SELECT id FROM users WHERE role IN ('main_teacher', 'teacher'))
      );

    -- Students can manage their own answers
    IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_schema = 'public' AND table_name = 'assessment_submissions') THEN
      EXECUTE 'CREATE POLICY "Students can manage own answers"
        ON assessment_answers FOR ALL
        USING (
          submission_id IN (
            SELECT id FROM assessment_submissions WHERE
              student_id = auth.uid() AND
              is_completed = FALSE
          )
        )
        WITH CHECK (
          submission_id IN (
            SELECT id FROM assessment_submissions WHERE
              student_id = auth.uid() AND
              is_completed = FALSE
          )
        )';
    END IF;
  END IF;
END $$;








