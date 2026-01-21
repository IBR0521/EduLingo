-- Create Analytics and Performance Tracking Tables
-- This script creates tables for advanced analytics and predictive insights
-- Run this script in Supabase SQL Editor

-- ============================================================================
-- CLEANUP: Uncomment if you need to drop and recreate tables
-- ============================================================================
-- DROP TABLE IF EXISTS student_performance_metrics CASCADE;
-- DROP TABLE IF EXISTS student_engagement_scores CASCADE;
-- DROP TABLE IF EXISTS analytics_snapshots CASCADE;
-- DROP TABLE IF EXISTS at_risk_students CASCADE;

-- ============================================================================
-- STEP 1: Student Performance Metrics (aggregated daily/weekly)
-- ============================================================================

CREATE TABLE IF NOT EXISTS student_performance_metrics (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  student_id UUID REFERENCES users(id) ON DELETE CASCADE,
  group_id UUID REFERENCES groups(id) ON DELETE CASCADE,
  course_id UUID, -- REFERENCES courses(id) ON DELETE SET NULL, -- Add FK later if courses table exists
  metric_date DATE NOT NULL,
  average_grade DECIMAL(5,2),
  assignment_completion_rate DECIMAL(5,2) CHECK (assignment_completion_rate >= 0 AND assignment_completion_rate <= 100),
  attendance_rate DECIMAL(5,2) CHECK (attendance_rate >= 0 AND attendance_rate <= 100),
  participation_score DECIMAL(5,2) CHECK (participation_score >= 0 AND participation_score <= 100),
  time_on_task_minutes INTEGER DEFAULT 0,
  assignments_submitted INTEGER DEFAULT 0,
  assignments_total INTEGER DEFAULT 0,
  classes_attended INTEGER DEFAULT 0,
  classes_total INTEGER DEFAULT 0,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  UNIQUE(student_id, group_id, course_id, metric_date)
);

-- ============================================================================
-- STEP 2: Student Engagement Scores (composite score)
-- ============================================================================

CREATE TABLE IF NOT EXISTS student_engagement_scores (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  student_id UUID REFERENCES users(id) ON DELETE CASCADE,
  group_id UUID REFERENCES groups(id) ON DELETE CASCADE,
  score_date DATE NOT NULL,
  overall_score DECIMAL(5,2) CHECK (overall_score >= 0 AND overall_score <= 100),
  login_frequency INTEGER DEFAULT 0,
  assignment_engagement DECIMAL(5,2),
  participation_engagement DECIMAL(5,2),
  communication_engagement DECIMAL(5,2),
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  UNIQUE(student_id, group_id, score_date)
);

-- ============================================================================
-- STEP 3: Analytics Snapshots (for historical tracking)
-- ============================================================================

CREATE TABLE IF NOT EXISTS analytics_snapshots (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  snapshot_type VARCHAR(50) NOT NULL, -- 'daily', 'weekly', 'monthly'
  snapshot_date DATE NOT NULL,
  group_id UUID REFERENCES groups(id) ON DELETE CASCADE,
  teacher_id UUID REFERENCES users(id) ON DELETE SET NULL,
  metrics JSONB, -- Flexible JSON structure for various metrics
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  UNIQUE(snapshot_type, snapshot_date, group_id)
);

-- ============================================================================
-- STEP 4: At-Risk Students Tracking (predictive analytics)
-- ============================================================================

CREATE TABLE IF NOT EXISTS at_risk_students (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  student_id UUID REFERENCES users(id) ON DELETE CASCADE,
  group_id UUID REFERENCES groups(id) ON DELETE CASCADE,
  risk_level VARCHAR(20) NOT NULL CHECK (risk_level IN ('low', 'medium', 'high', 'critical')),
  risk_factors JSONB, -- Array of risk factors
  predicted_outcome VARCHAR(50), -- 'likely_to_fail', 'likely_to_drop', etc.
  confidence_score DECIMAL(5,2) CHECK (confidence_score >= 0 AND confidence_score <= 100),
  flagged_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  resolved_at TIMESTAMP WITH TIME ZONE,
  notes TEXT,
  flagged_by UUID REFERENCES users(id) ON DELETE SET NULL,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- ============================================================================
-- STEP 5: Add Foreign Key Constraints (if courses table exists)
-- ============================================================================

DO $$
BEGIN
  IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_schema = 'public' AND table_name = 'courses') THEN
    IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_schema = 'public' AND table_name = 'student_performance_metrics') THEN
      IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'student_performance_metrics_course_id_fkey') THEN
        ALTER TABLE student_performance_metrics ADD CONSTRAINT student_performance_metrics_course_id_fkey 
          FOREIGN KEY (course_id) REFERENCES courses(id) ON DELETE SET NULL;
      END IF;
    END IF;
  END IF;
END $$;

-- ============================================================================
-- STEP 6: Create Indexes
-- ============================================================================

DO $$
BEGIN
  IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_schema = 'public' AND table_name = 'student_performance_metrics') THEN
    CREATE INDEX IF NOT EXISTS idx_performance_metrics_student ON student_performance_metrics(student_id);
    CREATE INDEX IF NOT EXISTS idx_performance_metrics_group ON student_performance_metrics(group_id);
    CREATE INDEX IF NOT EXISTS idx_performance_metrics_date ON student_performance_metrics(metric_date);
    CREATE INDEX IF NOT EXISTS idx_performance_metrics_student_date ON student_performance_metrics(student_id, metric_date);
  END IF;
  IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_schema = 'public' AND table_name = 'student_engagement_scores') THEN
    CREATE INDEX IF NOT EXISTS idx_engagement_scores_student ON student_engagement_scores(student_id);
    CREATE INDEX IF NOT EXISTS idx_engagement_scores_group ON student_engagement_scores(group_id);
    CREATE INDEX IF NOT EXISTS idx_engagement_scores_date ON student_engagement_scores(score_date);
  END IF;
  IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_schema = 'public' AND table_name = 'analytics_snapshots') THEN
    CREATE INDEX IF NOT EXISTS idx_analytics_snapshots_type_date ON analytics_snapshots(snapshot_type, snapshot_date);
    CREATE INDEX IF NOT EXISTS idx_analytics_snapshots_group ON analytics_snapshots(group_id);
  END IF;
  IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_schema = 'public' AND table_name = 'at_risk_students') THEN
    CREATE INDEX IF NOT EXISTS idx_at_risk_students_student ON at_risk_students(student_id);
    CREATE INDEX IF NOT EXISTS idx_at_risk_students_group ON at_risk_students(group_id);
    CREATE INDEX IF NOT EXISTS idx_at_risk_students_risk_level ON at_risk_students(risk_level);
    CREATE INDEX IF NOT EXISTS idx_at_risk_students_resolved ON at_risk_students(resolved_at);
  END IF;
END $$;

