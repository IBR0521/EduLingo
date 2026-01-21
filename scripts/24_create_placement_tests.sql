-- Create Placement Testing System
-- This script creates tables for placement tests, questions, and results
-- Run this script in Supabase SQL Editor

-- ============================================================================
-- CLEANUP: Uncomment if you need to drop and recreate tables
-- ============================================================================
-- DROP TABLE IF EXISTS placement_test_results CASCADE;
-- DROP TABLE IF EXISTS placement_test_answers CASCADE;
-- DROP TABLE IF EXISTS placement_test_questions CASCADE;
-- DROP TABLE IF EXISTS placement_tests CASCADE;

-- ============================================================================
-- STEP 1: Placement Tests Table
-- ============================================================================

CREATE TABLE IF NOT EXISTS placement_tests (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name VARCHAR(255) NOT NULL,
  description TEXT,
  level VARCHAR(50), -- 'beginner', 'elementary', 'intermediate', 'upper-intermediate', 'advanced'
  category VARCHAR(100), -- 'general', 'grammar', 'vocabulary', 'listening', 'reading', 'writing', 'speaking'
  duration_minutes INTEGER DEFAULT 60,
  passing_score DECIMAL(5,2) DEFAULT 70 CHECK (passing_score >= 0 AND passing_score <= 100),
  is_active BOOLEAN DEFAULT TRUE,
  created_by UUID REFERENCES users(id),
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- ============================================================================
-- STEP 2: Placement Test Questions
-- ============================================================================

CREATE TABLE IF NOT EXISTS placement_test_questions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  test_id UUID REFERENCES placement_tests(id) ON DELETE CASCADE,
  question_text TEXT NOT NULL,
  question_type VARCHAR(50) NOT NULL DEFAULT 'multiple_choice' CHECK (question_type IN ('multiple_choice', 'true_false', 'fill_blank', 'essay')),
  options JSONB, -- For multiple choice: ["option1", "option2", ...]
  correct_answer TEXT NOT NULL,
  points DECIMAL(5,2) DEFAULT 1.0 CHECK (points >= 0),
  order_index INTEGER NOT NULL DEFAULT 0,
  explanation TEXT,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- ============================================================================
-- STEP 3: Placement Test Results
-- ============================================================================

CREATE TABLE IF NOT EXISTS placement_test_results (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  test_id UUID REFERENCES placement_tests(id) ON DELETE CASCADE,
  student_id UUID REFERENCES users(id) ON DELETE CASCADE,
  score DECIMAL(5,2) NOT NULL CHECK (score >= 0 AND score <= 100),
  total_points DECIMAL(5,2) NOT NULL,
  earned_points DECIMAL(5,2) NOT NULL,
  recommended_level VARCHAR(50), -- Based on score
  time_taken_minutes INTEGER,
  started_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  completed_at TIMESTAMP WITH TIME ZONE,
  is_completed BOOLEAN DEFAULT FALSE,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  UNIQUE(test_id, student_id)
);

-- ============================================================================
-- STEP 4: Placement Test Answers (individual question answers)
-- ============================================================================

CREATE TABLE IF NOT EXISTS placement_test_answers (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  result_id UUID REFERENCES placement_test_results(id) ON DELETE CASCADE,
  question_id UUID REFERENCES placement_test_questions(id) ON DELETE CASCADE,
  student_answer TEXT,
  is_correct BOOLEAN,
  points_earned DECIMAL(5,2) DEFAULT 0,
  answered_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  UNIQUE(result_id, question_id)
);

-- ============================================================================
-- STEP 5: Create Indexes
-- ============================================================================

DO $$
BEGIN
  IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_schema = 'public' AND table_name = 'placement_tests') THEN
    CREATE INDEX IF NOT EXISTS idx_placement_tests_level ON placement_tests(level);
    CREATE INDEX IF NOT EXISTS idx_placement_tests_category ON placement_tests(category);
    CREATE INDEX IF NOT EXISTS idx_placement_tests_active ON placement_tests(is_active);
  END IF;
  IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_schema = 'public' AND table_name = 'placement_test_questions') THEN
    CREATE INDEX IF NOT EXISTS idx_placement_questions_test ON placement_test_questions(test_id);
    CREATE INDEX IF NOT EXISTS idx_placement_questions_order ON placement_test_questions(test_id, order_index);
  END IF;
  IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_schema = 'public' AND table_name = 'placement_test_results') THEN
    CREATE INDEX IF NOT EXISTS idx_placement_results_test ON placement_test_results(test_id);
    CREATE INDEX IF NOT EXISTS idx_placement_results_student ON placement_test_results(student_id);
    CREATE INDEX IF NOT EXISTS idx_placement_results_completed ON placement_test_results(is_completed);
  END IF;
  IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_schema = 'public' AND table_name = 'placement_test_answers') THEN
    CREATE INDEX IF NOT EXISTS idx_placement_answers_result ON placement_test_answers(result_id);
    CREATE INDEX IF NOT EXISTS idx_placement_answers_question ON placement_test_answers(question_id);
  END IF;
END $$;



