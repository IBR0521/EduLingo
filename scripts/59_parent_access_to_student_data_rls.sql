-- Comprehensive RLS Policies to allow parents to read ALL their linked students' data
-- This enables parents to view everything about their linked students including:
-- assignments, schedule, attendance, grades, participation, files, learning progress,
-- gamification data, assessments, analytics, messages, notifications, and more

-- ============================================================================
-- HELPER FUNCTION: Get linked student IDs for a parent
-- ============================================================================
-- This function returns all student IDs that are linked to the current parent
CREATE OR REPLACE FUNCTION get_linked_student_ids()
RETURNS TABLE(student_id UUID) AS $$
BEGIN
  RETURN QUERY
  SELECT ps.student_id
  FROM parent_student ps
  WHERE ps.parent_id = auth.uid() AND ps.is_linked = true;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- ============================================================================
-- CORE STUDENT DATA
-- ============================================================================

-- Drop existing policies if they exist (to avoid conflicts)
DROP POLICY IF EXISTS "Parents can read linked students' assignments" ON assignments;
DROP POLICY IF EXISTS "Parents can read linked students' schedule" ON schedule;
DROP POLICY IF EXISTS "Parents can read linked students' attendance" ON attendance;
DROP POLICY IF EXISTS "Parents can read linked students' grades" ON grades;
DROP POLICY IF EXISTS "Parents can read linked students' participation" ON participation;
DROP POLICY IF EXISTS "Parents can read linked students' files" ON files;
DROP POLICY IF EXISTS "Parents can read linked students' group enrollments" ON group_students;

-- Policy 1: Parents can read assignments for groups their linked students are enrolled in
CREATE POLICY "Parents can read linked students' assignments"
  ON assignments FOR SELECT
  USING (
    auth.uid() IN (SELECT id FROM users WHERE role = 'parent')
    AND group_id IN (
      SELECT group_id 
      FROM group_students 
      WHERE student_id IN (SELECT student_id FROM get_linked_student_ids())
    )
  );

-- Policy 2: Parents can read schedule for groups their linked students are enrolled in
CREATE POLICY "Parents can read linked students' schedule"
  ON schedule FOR SELECT
  USING (
    auth.uid() IN (SELECT id FROM users WHERE role = 'parent')
    AND group_id IN (
      SELECT group_id 
      FROM group_students 
      WHERE student_id IN (SELECT student_id FROM get_linked_student_ids())
    )
  );

-- Policy 3: Parents can read attendance for their linked students
CREATE POLICY "Parents can read linked students' attendance"
  ON attendance FOR SELECT
  USING (
    auth.uid() IN (SELECT id FROM users WHERE role = 'parent')
    AND student_id IN (SELECT student_id FROM get_linked_student_ids())
  );

-- Policy 4: Parents can read grades for their linked students
CREATE POLICY "Parents can read linked students' grades"
  ON grades FOR SELECT
  USING (
    auth.uid() IN (SELECT id FROM users WHERE role = 'parent')
    AND student_id IN (SELECT student_id FROM get_linked_student_ids())
  );

-- Policy 5: Parents can read participation for their linked students
CREATE POLICY "Parents can read linked students' participation"
  ON participation FOR SELECT
  USING (
    auth.uid() IN (SELECT id FROM users WHERE role = 'parent')
    AND student_id IN (SELECT student_id FROM get_linked_student_ids())
  );

-- Policy 6: Parents can read files uploaded by their linked students
CREATE POLICY "Parents can read linked students' files"
  ON files FOR SELECT
  USING (
    auth.uid() IN (SELECT id FROM users WHERE role = 'parent')
    AND uploaded_by IN (SELECT student_id FROM get_linked_student_ids())
  );

-- Policy 7: Parents can read group enrollments for their linked students
CREATE POLICY "Parents can read linked students' group enrollments"
  ON group_students FOR SELECT
  USING (
    auth.uid() IN (SELECT id FROM users WHERE role = 'parent')
    AND student_id IN (SELECT student_id FROM get_linked_student_ids())
  );

-- ============================================================================
-- LEARNING PATHS AND PROGRESS
-- ============================================================================

-- Policy 8: Parents can read student progress for their linked students
DO $$
BEGIN
  IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_schema = 'public' AND table_name = 'student_progress') THEN
    DROP POLICY IF EXISTS "Parents can read linked students' progress" ON student_progress;
    EXECUTE '
      CREATE POLICY "Parents can read linked students'' progress"
        ON student_progress FOR SELECT
        USING (
          auth.uid() IN (SELECT id FROM users WHERE role = ''parent'')
          AND student_id IN (SELECT student_id FROM get_linked_student_ids())
        )';
  END IF;
END $$;

-- Policy 9: Parents can read skill mastery for their linked students
DO $$
BEGIN
  IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_schema = 'public' AND table_name = 'skill_mastery') THEN
    DROP POLICY IF EXISTS "Parents can read linked students' skill mastery" ON skill_mastery;
    EXECUTE '
      CREATE POLICY "Parents can read linked students'' skill mastery"
        ON skill_mastery FOR SELECT
        USING (
          auth.uid() IN (SELECT id FROM users WHERE role = ''parent'')
          AND student_id IN (SELECT student_id FROM get_linked_student_ids())
        )';
  END IF;
END $$;

-- Policy 10: Parents can read course materials for groups their linked students are enrolled in
DO $$
BEGIN
  IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_schema = 'public' AND table_name = 'course_materials') THEN
    DROP POLICY IF EXISTS "Parents can read linked students' course materials" ON course_materials;
    EXECUTE '
      CREATE POLICY "Parents can read linked students'' course materials"
        ON course_materials FOR SELECT
        USING (
          auth.uid() IN (SELECT id FROM users WHERE role = ''parent'')
          AND group_id IN (
            SELECT group_id 
            FROM group_students 
            WHERE student_id IN (SELECT student_id FROM get_linked_student_ids())
          )
        )';
  END IF;
END $$;

-- Policy 11: Parents can read course modules for groups their linked students are enrolled in
DO $$
BEGIN
  IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_schema = 'public' AND table_name = 'course_modules') THEN
    DROP POLICY IF EXISTS "Parents can read linked students' course modules" ON course_modules;
    EXECUTE '
      CREATE POLICY "Parents can read linked students'' course modules"
        ON course_modules FOR SELECT
        USING (
          auth.uid() IN (SELECT id FROM users WHERE role = ''parent'')
          AND group_id IN (
            SELECT group_id 
            FROM group_students 
            WHERE student_id IN (SELECT student_id FROM get_linked_student_ids())
          )
        )';
  END IF;
END $$;

-- Policy 12: Parents can read lessons for modules in groups their linked students are enrolled in
DO $$
BEGIN
  IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_schema = 'public' AND table_name = 'lessons') THEN
    DROP POLICY IF EXISTS "Parents can read linked students' lessons" ON lessons;
    EXECUTE '
      CREATE POLICY "Parents can read linked students'' lessons"
        ON lessons FOR SELECT
        USING (
          auth.uid() IN (SELECT id FROM users WHERE role = ''parent'')
          AND module_id IN (
            SELECT cm.id
            FROM course_modules cm
            WHERE cm.group_id IN (
              SELECT group_id 
              FROM group_students 
              WHERE student_id IN (SELECT student_id FROM get_linked_student_ids())
            )
          )
        )';
  END IF;
END $$;

-- Policy 13: Parents can read learning objectives for groups their linked students are enrolled in
DO $$
BEGIN
  IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_schema = 'public' AND table_name = 'learning_objectives') THEN
    DROP POLICY IF EXISTS "Parents can read linked students' learning objectives" ON learning_objectives;
    EXECUTE '
      CREATE POLICY "Parents can read linked students'' learning objectives"
        ON learning_objectives FOR SELECT
        USING (
          auth.uid() IN (SELECT id FROM users WHERE role = ''parent'')
          AND group_id IN (
            SELECT group_id 
            FROM group_students 
            WHERE student_id IN (SELECT student_id FROM get_linked_student_ids())
          )
        )';
  END IF;
END $$;

-- ============================================================================
-- GAMIFICATION
-- ============================================================================

-- Policy 14: Parents can read user progress for their linked students
DO $$
BEGIN
  IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_schema = 'public' AND table_name = 'user_progress') THEN
    DROP POLICY IF EXISTS "Parents can read linked students' user progress" ON user_progress;
    EXECUTE '
      CREATE POLICY "Parents can read linked students'' user progress"
        ON user_progress FOR SELECT
        USING (
          auth.uid() IN (SELECT id FROM users WHERE role = ''parent'')
          AND user_id IN (SELECT student_id FROM get_linked_student_ids())
        )';
  END IF;
END $$;

-- Policy 15: Parents can read user badges for their linked students
DO $$
BEGIN
  IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_schema = 'public' AND table_name = 'user_badges') THEN
    DROP POLICY IF EXISTS "Parents can read linked students' user badges" ON user_badges;
    EXECUTE '
      CREATE POLICY "Parents can read linked students'' user badges"
        ON user_badges FOR SELECT
        USING (
          auth.uid() IN (SELECT id FROM users WHERE role = ''parent'')
          AND user_id IN (SELECT student_id FROM get_linked_student_ids())
        )';
  END IF;
END $$;

-- Policy 16: Parents can read points history for their linked students
DO $$
BEGIN
  IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_schema = 'public' AND table_name = 'points_history') THEN
    DROP POLICY IF EXISTS "Parents can read linked students' points history" ON points_history;
    EXECUTE '
      CREATE POLICY "Parents can read linked students'' points history"
        ON points_history FOR SELECT
        USING (
          auth.uid() IN (SELECT id FROM users WHERE role = ''parent'')
          AND user_id IN (SELECT student_id FROM get_linked_student_ids())
        )';
  END IF;
END $$;

-- Policy 17: Parents can read leaderboard entries for their linked students
DO $$
BEGIN
  IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_schema = 'public' AND table_name = 'leaderboard') THEN
    DROP POLICY IF EXISTS "Parents can read linked students' leaderboard entries" ON leaderboard;
    EXECUTE '
      CREATE POLICY "Parents can read linked students'' leaderboard entries"
        ON leaderboard FOR SELECT
        USING (
          auth.uid() IN (SELECT id FROM users WHERE role = ''parent'')
          AND user_id IN (SELECT student_id FROM get_linked_student_ids())
        )';
  END IF;
END $$;

-- ============================================================================
-- ASSESSMENTS
-- ============================================================================

-- Policy 18: Parents can read assessment submissions for their linked students
DO $$
BEGIN
  IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_schema = 'public' AND table_name = 'assessment_submissions') THEN
    DROP POLICY IF EXISTS "Parents can read linked students' assessment submissions" ON assessment_submissions;
    EXECUTE '
      CREATE POLICY "Parents can read linked students'' assessment submissions"
        ON assessment_submissions FOR SELECT
        USING (
          auth.uid() IN (SELECT id FROM users WHERE role = ''parent'')
          AND student_id IN (SELECT student_id FROM get_linked_student_ids())
        )';
  END IF;
END $$;

-- Policy 19: Parents can read assessment answers for their linked students' submissions
DO $$
BEGIN
  IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_schema = 'public' AND table_name = 'assessment_answers') THEN
    DROP POLICY IF EXISTS "Parents can read linked students' assessment answers" ON assessment_answers;
    EXECUTE '
      CREATE POLICY "Parents can read linked students'' assessment answers"
        ON assessment_answers FOR SELECT
        USING (
          auth.uid() IN (SELECT id FROM users WHERE role = ''parent'')
          AND submission_id IN (
            SELECT id FROM assessment_submissions
            WHERE student_id IN (SELECT student_id FROM get_linked_student_ids())
          )
        )';
  END IF;
END $$;

-- Policy 20: Parents can read placement test results for their linked students
DO $$
BEGIN
  IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_schema = 'public' AND table_name = 'placement_test_results') THEN
    DROP POLICY IF EXISTS "Parents can read linked students' placement test results" ON placement_test_results;
    EXECUTE '
      CREATE POLICY "Parents can read linked students'' placement test results"
        ON placement_test_results FOR SELECT
        USING (
          auth.uid() IN (SELECT id FROM users WHERE role = ''parent'')
          AND student_id IN (SELECT student_id FROM get_linked_student_ids())
        )';
  END IF;
END $$;

-- Policy 21: Parents can read placement test answers for their linked students' results
DO $$
BEGIN
  IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_schema = 'public' AND table_name = 'placement_test_answers') THEN
    DROP POLICY IF EXISTS "Parents can read linked students' placement test answers" ON placement_test_answers;
    EXECUTE '
      CREATE POLICY "Parents can read linked students'' placement test answers"
        ON placement_test_answers FOR SELECT
        USING (
          auth.uid() IN (SELECT id FROM users WHERE role = ''parent'')
          AND result_id IN (
            SELECT id FROM placement_test_results
            WHERE student_id IN (SELECT student_id FROM get_linked_student_ids())
          )
        )';
  END IF;
END $$;

-- ============================================================================
-- ANALYTICS
-- ============================================================================

-- Policy 22: Parents can read performance metrics for their linked students
DO $$
BEGIN
  IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_schema = 'public' AND table_name = 'student_performance_metrics') THEN
    DROP POLICY IF EXISTS "Parents can read linked students' performance metrics" ON student_performance_metrics;
    EXECUTE '
      CREATE POLICY "Parents can read linked students'' performance metrics"
        ON student_performance_metrics FOR SELECT
        USING (
          auth.uid() IN (SELECT id FROM users WHERE role = ''parent'')
          AND student_id IN (SELECT student_id FROM get_linked_student_ids())
        )';
  END IF;
END $$;

-- Policy 23: Parents can read engagement scores for their linked students
DO $$
BEGIN
  IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_schema = 'public' AND table_name = 'student_engagement_scores') THEN
    DROP POLICY IF EXISTS "Parents can read linked students' engagement scores" ON student_engagement_scores;
    EXECUTE '
      CREATE POLICY "Parents can read linked students'' engagement scores"
        ON student_engagement_scores FOR SELECT
        USING (
          auth.uid() IN (SELECT id FROM users WHERE role = ''parent'')
          AND student_id IN (SELECT student_id FROM get_linked_student_ids())
        )';
  END IF;
END $$;

-- Policy 24: Parents can read at-risk status for their linked students
DO $$
BEGIN
  IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_schema = 'public' AND table_name = 'at_risk_students') THEN
    DROP POLICY IF EXISTS "Parents can read linked students' at risk status" ON at_risk_students;
    EXECUTE '
      CREATE POLICY "Parents can read linked students'' at risk status"
        ON at_risk_students FOR SELECT
        USING (
          auth.uid() IN (SELECT id FROM users WHERE role = ''parent'')
          AND student_id IN (SELECT student_id FROM get_linked_student_ids())
        )';
  END IF;
END $$;

-- ============================================================================
-- COMMUNICATION
-- ============================================================================

-- Policy 25: Parents can read messages sent to or from their linked students
DO $$
BEGIN
  IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_schema = 'public' AND table_name = 'messages') THEN
    DROP POLICY IF EXISTS "Parents can read messages to/from linked students" ON messages;
    EXECUTE '
      CREATE POLICY "Parents can read messages to/from linked students"
        ON messages FOR SELECT
        USING (
          auth.uid() IN (SELECT id FROM users WHERE role = ''parent'')
          AND (
            recipient_id IN (SELECT student_id FROM get_linked_student_ids())
            OR sender_id IN (SELECT student_id FROM get_linked_student_ids())
          )
        )';
  END IF;
END $$;

-- Policy 26: Parents can read notifications for their linked students
DO $$
BEGIN
  IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_schema = 'public' AND table_name = 'notifications') THEN
    DROP POLICY IF EXISTS "Parents can read notifications for linked students" ON notifications;
    EXECUTE '
      CREATE POLICY "Parents can read notifications for linked students"
        ON notifications FOR SELECT
        USING (
          auth.uid() IN (SELECT id FROM users WHERE role = ''parent'')
          AND user_id IN (SELECT student_id FROM get_linked_student_ids())
        )';
  END IF;
END $$;

-- ============================================================================
-- PAYMENT
-- ============================================================================

-- Policy 27: Parents can read payment reminders for their linked students
DO $$
BEGIN
  IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_schema = 'public' AND table_name = 'payment_reminders') THEN
    DROP POLICY IF EXISTS "Parents can read payment reminders for linked students" ON payment_reminders;
    EXECUTE '
      CREATE POLICY "Parents can read payment reminders for linked students"
        ON payment_reminders FOR SELECT
        USING (
          auth.uid() IN (SELECT id FROM users WHERE role = ''parent'')
          AND (
            student_id IN (SELECT student_id FROM get_linked_student_ids())
            OR parent_id = auth.uid()
          )
        )';
  END IF;
END $$;

-- ============================================================================
-- FORUMS (if forums table exists)
-- Note: Forums use forum_posts with parent_post_id for nested replies,
-- there is no separate forum_replies table
-- ============================================================================

-- Policy 28: Parents can read forum posts by their linked students
-- This includes both top-level posts and replies (nested via parent_post_id)
DO $$
BEGIN
  IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_schema = 'public' AND table_name = 'forum_posts') THEN
    -- Drop existing policy if it exists
    DROP POLICY IF EXISTS "Parents can read forum posts by linked students" ON forum_posts;
    
    EXECUTE '
      CREATE POLICY "Parents can read forum posts by linked students"
        ON forum_posts FOR SELECT
        USING (
          auth.uid() IN (SELECT id FROM users WHERE role = ''parent'')
          AND author_id IN (SELECT student_id FROM get_linked_student_ids())
        )';
  END IF;
END $$;

-- ============================================================================
-- ANNOUNCEMENTS (already covered in script 55, but ensure parents can read)
-- ============================================================================

-- Policy 30: Parents can read announcements for groups their linked students are enrolled in
DROP POLICY IF EXISTS "Parents can read announcements for linked students' groups" ON announcements;
CREATE POLICY "Parents can read announcements for linked students' groups"
  ON announcements FOR SELECT
  USING (
    auth.uid() IN (SELECT id FROM users WHERE role = 'parent')
    AND group_id IN (
      SELECT group_id 
      FROM group_students 
      WHERE student_id IN (SELECT student_id FROM get_linked_student_ids())
    )
  );

-- ============================================================================
-- VERIFICATION
-- ============================================================================

-- Verify the policies were created
SELECT 
  'Policy Verification' as check_type,
  tablename,
  policyname,
  cmd as command
FROM pg_policies
WHERE schemaname = 'public'
  AND policyname LIKE '%Parents can read linked students%'
ORDER BY tablename, policyname;
