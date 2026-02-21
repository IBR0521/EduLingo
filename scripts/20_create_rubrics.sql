-- Create Rubric-Based Grading System
-- This script creates tables for rubrics, rubric criteria, and rubric-based grades
-- Run this script in Supabase SQL Editor

-- ============================================================================
-- CLEANUP: Uncomment if you need to drop and recreate tables
-- ============================================================================
-- DROP TABLE IF EXISTS rubric_grades CASCADE;
-- DROP TABLE IF EXISTS rubric_criteria CASCADE;
-- DROP TABLE IF EXISTS rubrics CASCADE;

-- ============================================================================
-- STEP 1: Create Rubrics Table
-- ============================================================================

CREATE TABLE IF NOT EXISTS rubrics (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name VARCHAR(255) NOT NULL,
  description TEXT,
  assignment_id UUID REFERENCES assignments(id) ON DELETE CASCADE,
  course_id UUID, -- REFERENCES courses(id) ON DELETE SET NULL, -- Add FK later if courses table exists
  created_by UUID REFERENCES users(id),
  is_template BOOLEAN DEFAULT FALSE,
  is_public BOOLEAN DEFAULT FALSE,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- ============================================================================
-- STEP 2: Create Rubric Criteria Table
-- ============================================================================

CREATE TABLE IF NOT EXISTS rubric_criteria (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  rubric_id UUID REFERENCES rubrics(id) ON DELETE CASCADE,
  name VARCHAR(255) NOT NULL,
  description TEXT,
  max_points DECIMAL(5,2) NOT NULL DEFAULT 0 CHECK (max_points >= 0),
  order_index INTEGER NOT NULL DEFAULT 0,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- ============================================================================
-- STEP 3: Create Rubric Grades Table
-- ============================================================================

CREATE TABLE IF NOT EXISTS rubric_grades (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  rubric_id UUID REFERENCES rubrics(id) ON DELETE CASCADE,
  student_id UUID REFERENCES users(id) ON DELETE CASCADE,
  assignment_id UUID REFERENCES assignments(id) ON DELETE CASCADE,
  criterion_id UUID REFERENCES rubric_criteria(id) ON DELETE CASCADE,
  points_awarded DECIMAL(5,2) NOT NULL DEFAULT 0 CHECK (points_awarded >= 0),
  feedback TEXT,
  graded_by UUID REFERENCES users(id),
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  UNIQUE(student_id, assignment_id, criterion_id)
);

-- ============================================================================
-- STEP 4: Add Foreign Key Constraints (if courses table exists)
-- ============================================================================

DO $$
BEGIN
  IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_schema = 'public' AND table_name = 'courses') THEN
    IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_schema = 'public' AND table_name = 'rubrics') THEN
      IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'rubrics_course_id_fkey') THEN
        ALTER TABLE rubrics ADD CONSTRAINT rubrics_course_id_fkey FOREIGN KEY (course_id) REFERENCES courses(id) ON DELETE SET NULL;
      END IF;
    END IF;
  END IF;
END $$;

-- ============================================================================
-- STEP 5: Create Indexes
-- ============================================================================

DO $$
BEGIN
  IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_schema = 'public' AND table_name = 'rubrics') THEN
    CREATE INDEX IF NOT EXISTS idx_rubrics_assignment ON rubrics(assignment_id);
    CREATE INDEX IF NOT EXISTS idx_rubrics_course ON rubrics(course_id);
    CREATE INDEX IF NOT EXISTS idx_rubrics_created_by ON rubrics(created_by);
    CREATE INDEX IF NOT EXISTS idx_rubrics_template ON rubrics(is_template);
  END IF;
  IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_schema = 'public' AND table_name = 'rubric_criteria') THEN
    CREATE INDEX IF NOT EXISTS idx_rubric_criteria_rubric ON rubric_criteria(rubric_id);
    CREATE INDEX IF NOT EXISTS idx_rubric_criteria_order ON rubric_criteria(rubric_id, order_index);
  END IF;
  IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_schema = 'public' AND table_name = 'rubric_grades') THEN
    CREATE INDEX IF NOT EXISTS idx_rubric_grades_rubric ON rubric_grades(rubric_id);
    CREATE INDEX IF NOT EXISTS idx_rubric_grades_student ON rubric_grades(student_id);
    CREATE INDEX IF NOT EXISTS idx_rubric_grades_assignment ON rubric_grades(assignment_id);
    CREATE INDEX IF NOT EXISTS idx_rubric_grades_criterion ON rubric_grades(criterion_id);
  END IF;
END $$;








