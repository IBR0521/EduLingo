-- Create Automated Assessment System with Auto-Grading
-- This script creates tables for quizzes and auto-graded assessments
-- Run this script in Supabase SQL Editor

-- ============================================================================
-- CLEANUP: Uncomment if you need to drop and recreate tables
-- ============================================================================
-- DROP TABLE IF EXISTS assessment_submissions CASCADE;
-- DROP TABLE IF EXISTS assessment_answers CASCADE;
-- DROP TABLE IF EXISTS assessment_questions CASCADE;
-- DROP TABLE IF EXISTS assessments CASCADE;

-- ============================================================================
-- STEP 1: Extend assignments table with assessment fields
-- ============================================================================

DO $$
BEGIN
  IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_schema = 'public' AND table_name = 'assignments') THEN
    -- Add assessment type fields
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_schema = 'public' AND table_name = 'assignments' AND column_name = 'is_auto_graded') THEN
      ALTER TABLE assignments ADD COLUMN is_auto_graded BOOLEAN DEFAULT FALSE;
    END IF;
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_schema = 'public' AND table_name = 'assignments' AND column_name = 'assessment_type') THEN
      ALTER TABLE assignments ADD COLUMN assessment_type VARCHAR(50); -- 'quiz', 'test', 'homework', 'project'
    END IF;
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_schema = 'public' AND table_name = 'assignments' AND column_name = 'time_limit_minutes') THEN
      ALTER TABLE assignments ADD COLUMN time_limit_minutes INTEGER; -- Time limit for timed assessments
    END IF;
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_schema = 'public' AND table_name = 'assignments' AND column_name = 'max_attempts') THEN
      ALTER TABLE assignments ADD COLUMN max_attempts INTEGER DEFAULT 1; -- Number of allowed attempts
    END IF;
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_schema = 'public' AND table_name = 'assignments' AND column_name = 'show_results_immediately') THEN
      ALTER TABLE assignments ADD COLUMN show_results_immediately BOOLEAN DEFAULT TRUE; -- Show results after submission
    END IF;
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_schema = 'public' AND table_name = 'assignments' AND column_name = 'randomize_questions') THEN
      ALTER TABLE assignments ADD COLUMN randomize_questions BOOLEAN DEFAULT FALSE; -- Randomize question order
    END IF;
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_schema = 'public' AND table_name = 'assignments' AND column_name = 'randomize_options') THEN
      ALTER TABLE assignments ADD COLUMN randomize_options BOOLEAN DEFAULT FALSE; -- Randomize answer options
    END IF;
  END IF;
END $$;

-- ============================================================================
-- STEP 2: Assessment Questions Table
-- ============================================================================

CREATE TABLE IF NOT EXISTS assessment_questions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  assignment_id UUID REFERENCES assignments(id) ON DELETE CASCADE,
  question_text TEXT NOT NULL,
  question_type VARCHAR(50) NOT NULL CHECK (question_type IN ('multiple_choice', 'true_false', 'fill_blank', 'matching', 'ordering', 'short_answer', 'essay')),
  options JSONB, -- For multiple choice: ["option1", "option2", ...]
  correct_answer TEXT NOT NULL, -- Can be JSON for complex answers
  correct_answers JSONB, -- For multiple correct answers or matching pairs
  points DECIMAL(5,2) DEFAULT 1.0 CHECK (points >= 0),
  order_index INTEGER NOT NULL DEFAULT 0,
  explanation TEXT, -- Explanation shown after grading
  case_sensitive BOOLEAN DEFAULT FALSE, -- For fill_blank and short_answer
  partial_credit BOOLEAN DEFAULT FALSE, -- Allow partial credit for some answers
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- ============================================================================
-- STEP 3: Assessment Submissions Table
-- ============================================================================

CREATE TABLE IF NOT EXISTS assessment_submissions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  assignment_id UUID REFERENCES assignments(id) ON DELETE CASCADE,
  student_id UUID REFERENCES users(id) ON DELETE CASCADE,
  attempt_number INTEGER DEFAULT 1,
  score DECIMAL(5,2) NOT NULL CHECK (score >= 0 AND score <= 100),
  total_points DECIMAL(5,2) NOT NULL,
  earned_points DECIMAL(5,2) NOT NULL,
  time_taken_seconds INTEGER,
  started_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  submitted_at TIMESTAMP WITH TIME ZONE,
  is_completed BOOLEAN DEFAULT FALSE,
  auto_graded BOOLEAN DEFAULT FALSE,
  graded_at TIMESTAMP WITH TIME ZONE,
  feedback TEXT, -- Automated feedback
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  UNIQUE(assignment_id, student_id, attempt_number)
);

-- ============================================================================
-- STEP 4: Assessment Answers Table (individual question answers)
-- ============================================================================

CREATE TABLE IF NOT EXISTS assessment_answers (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  submission_id UUID REFERENCES assessment_submissions(id) ON DELETE CASCADE,
  question_id UUID REFERENCES assessment_questions(id) ON DELETE CASCADE,
  student_answer TEXT,
  student_answers JSONB, -- For complex answers (matching, ordering)
  is_correct BOOLEAN,
  points_earned DECIMAL(5,2) DEFAULT 0,
  points_possible DECIMAL(5,2) NOT NULL,
  auto_feedback TEXT, -- Automated feedback for this question
  answered_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  UNIQUE(submission_id, question_id)
);

-- ============================================================================
-- STEP 5: Create Indexes
-- ============================================================================

DO $$
BEGIN
  IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_schema = 'public' AND table_name = 'assessment_questions') THEN
    CREATE INDEX IF NOT EXISTS idx_assessment_questions_assignment ON assessment_questions(assignment_id);
    CREATE INDEX IF NOT EXISTS idx_assessment_questions_order ON assessment_questions(assignment_id, order_index);
  END IF;
  IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_schema = 'public' AND table_name = 'assessment_submissions') THEN
    CREATE INDEX IF NOT EXISTS idx_assessment_submissions_assignment ON assessment_submissions(assignment_id);
    CREATE INDEX IF NOT EXISTS idx_assessment_submissions_student ON assessment_submissions(student_id);
    CREATE INDEX IF NOT EXISTS idx_assessment_submissions_completed ON assessment_submissions(is_completed);
  END IF;
  IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_schema = 'public' AND table_name = 'assessment_answers') THEN
    CREATE INDEX IF NOT EXISTS idx_assessment_answers_submission ON assessment_answers(submission_id);
    CREATE INDEX IF NOT EXISTS idx_assessment_answers_question ON assessment_answers(question_id);
  END IF;
END $$;

-- ============================================================================
-- STEP 6: Create Function for Auto-Grading
-- ============================================================================

-- Drop existing function if it exists
DROP FUNCTION IF EXISTS auto_grade_assessment(UUID) CASCADE;

-- Create function to auto-grade an assessment submission
CREATE OR REPLACE FUNCTION auto_grade_assessment(submission_uuid UUID)
RETURNS TABLE(
  total_points DECIMAL,
  earned_points DECIMAL,
  score DECIMAL,
  auto_graded BOOLEAN
) AS $$
DECLARE
  submission_record RECORD;
  answer_record RECORD;
  total_pts DECIMAL := 0;
  earned_pts DECIMAL := 0;
  calculated_score DECIMAL;
BEGIN
  -- Get submission record
  SELECT * INTO submission_record
  FROM assessment_submissions
  WHERE id = submission_uuid;

  IF NOT FOUND THEN
    RAISE EXCEPTION 'Submission not found';
  END IF;

  -- Calculate total and earned points from answers
  FOR answer_record IN
    SELECT aa.*, aq.points as question_points, aq.correct_answer, aq.correct_answers,
           aq.question_type, aq.case_sensitive, aq.partial_credit
    FROM assessment_answers aa
    JOIN assessment_questions aq ON aa.question_id = aq.id
    WHERE aa.submission_id = submission_uuid
  LOOP
    total_pts := total_pts + answer_record.question_points;
    
    -- Auto-grade based on question type
    IF answer_record.is_correct IS NULL THEN
      -- Grade the answer
      IF answer_record.question_type = 'multiple_choice' OR answer_record.question_type = 'true_false' THEN
        IF LOWER(TRIM(answer_record.student_answer)) = LOWER(TRIM(answer_record.correct_answer)) THEN
          earned_pts := earned_pts + answer_record.question_points;
          -- Update answer record
          UPDATE assessment_answers
          SET is_correct = TRUE, points_earned = answer_record.question_points
          WHERE id = answer_record.id;
        ELSE
          UPDATE assessment_answers
          SET is_correct = FALSE, points_earned = 0
          WHERE id = answer_record.id;
        END IF;
      ELSIF answer_record.question_type = 'fill_blank' OR answer_record.question_type = 'short_answer' THEN
        IF answer_record.case_sensitive THEN
          IF TRIM(answer_record.student_answer) = TRIM(answer_record.correct_answer) THEN
            earned_pts := earned_pts + answer_record.question_points;
            UPDATE assessment_answers SET is_correct = TRUE, points_earned = answer_record.question_points WHERE id = answer_record.id;
          ELSE
            UPDATE assessment_answers SET is_correct = FALSE, points_earned = 0 WHERE id = answer_record.id;
          END IF;
        ELSE
          IF LOWER(TRIM(answer_record.student_answer)) = LOWER(TRIM(answer_record.correct_answer)) THEN
            earned_pts := earned_pts + answer_record.question_points;
            UPDATE assessment_answers SET is_correct = TRUE, points_earned = answer_record.question_points WHERE id = answer_record.id;
          ELSE
            UPDATE assessment_answers SET is_correct = FALSE, points_earned = 0 WHERE id = answer_record.id;
          END IF;
        END IF;
      ELSE
        -- For essay and complex types, default to 0 (requires manual grading)
        UPDATE assessment_answers SET is_correct = FALSE, points_earned = 0 WHERE id = answer_record.id;
      END IF;
    ELSE
      -- Already graded, use existing points
      earned_pts := earned_pts + answer_record.points_earned;
    END IF;
  END LOOP;

  -- Calculate score percentage
  IF total_pts > 0 THEN
    calculated_score := (earned_pts / total_pts) * 100;
  ELSE
    calculated_score := 0;
  END IF;

  -- Update submission
  UPDATE assessment_submissions
  SET score = calculated_score,
      total_points = total_pts,
      earned_points = earned_pts,
      auto_graded = TRUE,
      graded_at = NOW()
  WHERE id = submission_uuid;

  -- Return results
  RETURN QUERY SELECT total_pts, earned_pts, calculated_score, TRUE;
END;
$$ LANGUAGE plpgsql;








