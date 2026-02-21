-- RLS Policies for Analytics Tables
-- Run this AFTER running 22_create_analytics_tables.sql

-- Enable RLS on all analytics tables
DO $$
BEGIN
  IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_schema = 'public' AND table_name = 'student_performance_metrics') THEN
    ALTER TABLE student_performance_metrics ENABLE ROW LEVEL SECURITY;
  END IF;
  IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_schema = 'public' AND table_name = 'student_engagement_scores') THEN
    ALTER TABLE student_engagement_scores ENABLE ROW LEVEL SECURITY;
  END IF;
  IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_schema = 'public' AND table_name = 'analytics_snapshots') THEN
    ALTER TABLE analytics_snapshots ENABLE ROW LEVEL SECURITY;
  END IF;
  IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_schema = 'public' AND table_name = 'at_risk_students') THEN
    ALTER TABLE at_risk_students ENABLE ROW LEVEL SECURITY;
  END IF;
END $$;

-- Drop existing policies if they exist
DO $$
BEGIN
  IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_schema = 'public' AND table_name = 'student_performance_metrics') THEN
    DROP POLICY IF EXISTS "Students can read own metrics" ON student_performance_metrics;
    DROP POLICY IF EXISTS "Teachers can read metrics" ON student_performance_metrics;
    DROP POLICY IF EXISTS "Teachers can manage metrics" ON student_performance_metrics;
  END IF;
  IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_schema = 'public' AND table_name = 'student_engagement_scores') THEN
    DROP POLICY IF EXISTS "Students can read own engagement" ON student_engagement_scores;
    DROP POLICY IF EXISTS "Teachers can read engagement" ON student_engagement_scores;
    DROP POLICY IF EXISTS "Teachers can manage engagement" ON student_engagement_scores;
  END IF;
  IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_schema = 'public' AND table_name = 'analytics_snapshots') THEN
    DROP POLICY IF EXISTS "Teachers can read snapshots" ON analytics_snapshots;
    DROP POLICY IF EXISTS "Teachers can manage snapshots" ON analytics_snapshots;
  END IF;
  IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_schema = 'public' AND table_name = 'at_risk_students') THEN
    DROP POLICY IF EXISTS "Students can read own risk status" ON at_risk_students;
    DROP POLICY IF EXISTS "Teachers can read risk status" ON at_risk_students;
    DROP POLICY IF EXISTS "Teachers can manage risk status" ON at_risk_students;
  END IF;
END $$;

-- Student Performance Metrics policies
DO $$
BEGIN
  IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_schema = 'public' AND table_name = 'student_performance_metrics') AND
     EXISTS (SELECT 1 FROM information_schema.columns WHERE table_schema = 'public' AND table_name = 'student_performance_metrics' AND column_name = 'student_id') THEN
    -- Students can read their own metrics
    CREATE POLICY "Students can read own metrics"
      ON student_performance_metrics FOR SELECT
      USING (student_id = auth.uid());

    -- Teachers can read metrics for their groups
    IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_schema = 'public' AND table_name = 'groups') THEN
      EXECUTE 'CREATE POLICY "Teachers can read metrics"
        ON student_performance_metrics FOR SELECT
        USING (
          auth.uid() IN (SELECT id FROM users WHERE role IN (''main_teacher'', ''teacher'')) AND
          group_id IN (
            SELECT id FROM groups WHERE
              teacher_id = auth.uid() OR
              created_by = auth.uid() OR
              auth.uid() IN (SELECT id FROM users WHERE role = ''main_teacher'')
          )
        )';
    END IF;

    -- Teachers can manage metrics
    IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_schema = 'public' AND table_name = 'groups') THEN
      EXECUTE 'CREATE POLICY "Teachers can manage metrics"
        ON student_performance_metrics FOR ALL
        USING (
          auth.uid() IN (SELECT id FROM users WHERE role IN (''main_teacher'', ''teacher'')) AND
          group_id IN (
            SELECT id FROM groups WHERE
              teacher_id = auth.uid() OR
              created_by = auth.uid() OR
              auth.uid() IN (SELECT id FROM users WHERE role = ''main_teacher'')
          )
        )';
    END IF;
  END IF;
END $$;

-- Student Engagement Scores policies
DO $$
BEGIN
  IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_schema = 'public' AND table_name = 'student_engagement_scores') AND
     EXISTS (SELECT 1 FROM information_schema.columns WHERE table_schema = 'public' AND table_name = 'student_engagement_scores' AND column_name = 'student_id') THEN
    -- Students can read their own engagement
    CREATE POLICY "Students can read own engagement"
      ON student_engagement_scores FOR SELECT
      USING (student_id = auth.uid());

    -- Teachers can read engagement for their groups
    IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_schema = 'public' AND table_name = 'groups') THEN
      EXECUTE 'CREATE POLICY "Teachers can read engagement"
        ON student_engagement_scores FOR SELECT
        USING (
          auth.uid() IN (SELECT id FROM users WHERE role IN (''main_teacher'', ''teacher'')) AND
          group_id IN (
            SELECT id FROM groups WHERE
              teacher_id = auth.uid() OR
              created_by = auth.uid() OR
              auth.uid() IN (SELECT id FROM users WHERE role = ''main_teacher'')
          )
        )';
    END IF;

    -- Teachers can manage engagement
    IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_schema = 'public' AND table_name = 'groups') THEN
      EXECUTE 'CREATE POLICY "Teachers can manage engagement"
        ON student_engagement_scores FOR ALL
        USING (
          auth.uid() IN (SELECT id FROM users WHERE role IN (''main_teacher'', ''teacher'')) AND
          group_id IN (
            SELECT id FROM groups WHERE
              teacher_id = auth.uid() OR
              created_by = auth.uid() OR
              auth.uid() IN (SELECT id FROM users WHERE role = ''main_teacher'')
          )
        )';
    END IF;
  END IF;
END $$;

-- Analytics Snapshots policies
DO $$
BEGIN
  IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_schema = 'public' AND table_name = 'analytics_snapshots') THEN
    -- Teachers can read snapshots for their groups
    IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_schema = 'public' AND table_name = 'groups') THEN
      EXECUTE 'CREATE POLICY "Teachers can read snapshots"
        ON analytics_snapshots FOR SELECT
        USING (
          auth.uid() IN (SELECT id FROM users WHERE role IN (''main_teacher'', ''teacher'')) AND
          (
            group_id IN (
              SELECT id FROM groups WHERE
                teacher_id = auth.uid() OR
                created_by = auth.uid() OR
                auth.uid() IN (SELECT id FROM users WHERE role = ''main_teacher'')
            ) OR
            teacher_id = auth.uid()
          )
        )';
    END IF;

    -- Teachers can manage snapshots
    IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_schema = 'public' AND table_name = 'groups') THEN
      EXECUTE 'CREATE POLICY "Teachers can manage snapshots"
        ON analytics_snapshots FOR ALL
        USING (
          auth.uid() IN (SELECT id FROM users WHERE role IN (''main_teacher'', ''teacher'')) AND
          (
            group_id IN (
              SELECT id FROM groups WHERE
                teacher_id = auth.uid() OR
                created_by = auth.uid() OR
                auth.uid() IN (SELECT id FROM users WHERE role = ''main_teacher'')
            ) OR
            teacher_id = auth.uid()
          )
        )';
    END IF;
  END IF;
END $$;

-- At-Risk Students policies
DO $$
BEGIN
  IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_schema = 'public' AND table_name = 'at_risk_students') AND
     EXISTS (SELECT 1 FROM information_schema.columns WHERE table_schema = 'public' AND table_name = 'at_risk_students' AND column_name = 'student_id') THEN
    -- Students can read their own risk status
    CREATE POLICY "Students can read own risk status"
      ON at_risk_students FOR SELECT
      USING (student_id = auth.uid());

    -- Teachers can read risk status for their groups
    IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_schema = 'public' AND table_name = 'groups') THEN
      EXECUTE 'CREATE POLICY "Teachers can read risk status"
        ON at_risk_students FOR SELECT
        USING (
          auth.uid() IN (SELECT id FROM users WHERE role IN (''main_teacher'', ''teacher'')) AND
          group_id IN (
            SELECT id FROM groups WHERE
              teacher_id = auth.uid() OR
              created_by = auth.uid() OR
              auth.uid() IN (SELECT id FROM users WHERE role = ''main_teacher'')
          )
        )';
    END IF;

    -- Teachers can manage risk status
    IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_schema = 'public' AND table_name = 'groups') THEN
      EXECUTE 'CREATE POLICY "Teachers can manage risk status"
        ON at_risk_students FOR ALL
        USING (
          auth.uid() IN (SELECT id FROM users WHERE role IN (''main_teacher'', ''teacher'')) AND
          group_id IN (
            SELECT id FROM groups WHERE
              teacher_id = auth.uid() OR
              created_by = auth.uid() OR
              auth.uid() IN (SELECT id FROM users WHERE role = ''main_teacher'')
          )
        )';
    END IF;
  END IF;
END $$;








