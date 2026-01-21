-- RLS Policies for Placement Testing System
-- Run this AFTER running 24_create_placement_tests.sql

-- Enable RLS on all placement test tables
DO $$
BEGIN
  IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_schema = 'public' AND table_name = 'placement_tests') THEN
    ALTER TABLE placement_tests ENABLE ROW LEVEL SECURITY;
  END IF;
  IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_schema = 'public' AND table_name = 'placement_test_questions') THEN
    ALTER TABLE placement_test_questions ENABLE ROW LEVEL SECURITY;
  END IF;
  IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_schema = 'public' AND table_name = 'placement_test_results') THEN
    ALTER TABLE placement_test_results ENABLE ROW LEVEL SECURITY;
  END IF;
  IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_schema = 'public' AND table_name = 'placement_test_answers') THEN
    ALTER TABLE placement_test_answers ENABLE ROW LEVEL SECURITY;
  END IF;
END $$;

-- Drop existing policies if they exist
DO $$
BEGIN
  IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_schema = 'public' AND table_name = 'placement_tests') THEN
    DROP POLICY IF EXISTS "Authenticated users can read active tests" ON placement_tests;
    DROP POLICY IF EXISTS "Teachers can manage tests" ON placement_tests;
  END IF;
  IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_schema = 'public' AND table_name = 'placement_test_questions') THEN
    DROP POLICY IF EXISTS "Authenticated users can read questions" ON placement_test_questions;
    DROP POLICY IF EXISTS "Teachers can manage questions" ON placement_test_questions;
  END IF;
  IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_schema = 'public' AND table_name = 'placement_test_results') THEN
    DROP POLICY IF EXISTS "Students can read own results" ON placement_test_results;
    DROP POLICY IF EXISTS "Teachers can read results" ON placement_test_results;
    DROP POLICY IF EXISTS "Students can create results" ON placement_test_results;
    DROP POLICY IF EXISTS "Students can update own results" ON placement_test_results;
  END IF;
  IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_schema = 'public' AND table_name = 'placement_test_answers') THEN
    DROP POLICY IF EXISTS "Students can read own answers" ON placement_test_answers;
    DROP POLICY IF EXISTS "Teachers can read answers" ON placement_test_answers;
    DROP POLICY IF EXISTS "Students can manage own answers" ON placement_test_answers;
  END IF;
END $$;

-- Placement Tests policies
DO $$
BEGIN
  IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_schema = 'public' AND table_name = 'placement_tests') THEN
    -- Authenticated users can read active tests
    CREATE POLICY "Authenticated users can read active tests"
      ON placement_tests FOR SELECT
      USING (
        auth.role() = 'authenticated' AND (
          is_active = TRUE OR
          created_by = auth.uid() OR
          auth.uid() IN (SELECT id FROM users WHERE role IN ('main_teacher', 'teacher'))
        )
      );

    -- Teachers can manage tests
    CREATE POLICY "Teachers can manage tests"
      ON placement_tests FOR ALL
      USING (
        auth.uid() IN (SELECT id FROM users WHERE role IN ('main_teacher', 'teacher')) AND
        (created_by = auth.uid() OR auth.uid() IN (SELECT id FROM users WHERE role = 'main_teacher'))
      );
  END IF;
END $$;

-- Placement Test Questions policies
DO $$
BEGIN
  IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_schema = 'public' AND table_name = 'placement_test_questions') AND
     EXISTS (SELECT 1 FROM information_schema.columns WHERE table_schema = 'public' AND table_name = 'placement_test_questions' AND column_name = 'test_id') THEN
    -- Authenticated users can read questions for active tests
    IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_schema = 'public' AND table_name = 'placement_tests') THEN
      EXECUTE 'CREATE POLICY "Authenticated users can read questions"
        ON placement_test_questions FOR SELECT
        USING (
          auth.role() = ''authenticated'' AND
          test_id IN (
            SELECT id FROM placement_tests WHERE
              is_active = TRUE OR
              created_by = auth.uid() OR
              auth.uid() IN (SELECT id FROM users WHERE role IN (''main_teacher'', ''teacher''))
          )
        )';
    END IF;

    -- Teachers can manage questions
    IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_schema = 'public' AND table_name = 'placement_tests') THEN
      EXECUTE 'CREATE POLICY "Teachers can manage questions"
        ON placement_test_questions FOR ALL
        USING (
          auth.uid() IN (SELECT id FROM users WHERE role IN (''main_teacher'', ''teacher'')) AND
          test_id IN (
            SELECT id FROM placement_tests WHERE
              created_by = auth.uid() OR
              auth.uid() IN (SELECT id FROM users WHERE role = ''main_teacher'')
          )
        )';
    END IF;
  END IF;
END $$;

-- Placement Test Results policies
DO $$
BEGIN
  IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_schema = 'public' AND table_name = 'placement_test_results') AND
     EXISTS (SELECT 1 FROM information_schema.columns WHERE table_schema = 'public' AND table_name = 'placement_test_results' AND column_name = 'student_id') THEN
    -- Students can read their own results
    CREATE POLICY "Students can read own results"
      ON placement_test_results FOR SELECT
      USING (student_id = auth.uid());

    -- Teachers can read all results
    CREATE POLICY "Teachers can read results"
      ON placement_test_results FOR SELECT
      USING (
        auth.uid() IN (SELECT id FROM users WHERE role IN ('main_teacher', 'teacher'))
      );

    -- Students can create results
    CREATE POLICY "Students can create results"
      ON placement_test_results FOR INSERT
      WITH CHECK (student_id = auth.uid());

    -- Students can update their own results
    CREATE POLICY "Students can update own results"
      ON placement_test_results FOR UPDATE
      USING (student_id = auth.uid())
      WITH CHECK (student_id = auth.uid());
  END IF;
END $$;

-- Placement Test Answers policies
DO $$
BEGIN
  IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_schema = 'public' AND table_name = 'placement_test_answers') AND
     EXISTS (SELECT 1 FROM information_schema.columns WHERE table_schema = 'public' AND table_name = 'placement_test_answers' AND column_name = 'result_id') THEN
    -- Students can read their own answers
    IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_schema = 'public' AND table_name = 'placement_test_results') THEN
      EXECUTE 'CREATE POLICY "Students can read own answers"
        ON placement_test_answers FOR SELECT
        USING (
          result_id IN (SELECT id FROM placement_test_results WHERE student_id = auth.uid())
        )';
    END IF;

    -- Teachers can read all answers
    CREATE POLICY "Teachers can read answers"
      ON placement_test_answers FOR SELECT
      USING (
        auth.uid() IN (SELECT id FROM users WHERE role IN ('main_teacher', 'teacher'))
      );

    -- Students can manage their own answers
    IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_schema = 'public' AND table_name = 'placement_test_results') THEN
      EXECUTE 'CREATE POLICY "Students can manage own answers"
        ON placement_test_answers FOR ALL
        USING (
          result_id IN (SELECT id FROM placement_test_results WHERE student_id = auth.uid())
        )
        WITH CHECK (
          result_id IN (SELECT id FROM placement_test_results WHERE student_id = auth.uid())
        )';
    END IF;
  END IF;
END $$;



