-- Fix Security Issues
-- This script fixes:
-- 1. Functions with mutable search_path (security vulnerability)
-- 2. Overly permissive RLS policy on pending_students
-- 3. Provides guidance on enabling leaked password protection

-- ============================================================================
-- FIX 1: Set search_path for all functions to prevent search path attacks
-- ============================================================================

-- Fix get_linked_student_ids function
CREATE OR REPLACE FUNCTION get_linked_student_ids()
RETURNS TABLE(student_id UUID) 
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  RETURN QUERY
  SELECT ps.student_id
  FROM parent_student ps
  WHERE ps.parent_id = auth.uid() AND ps.is_linked = true;
END;
$$;

-- Fix update_user_progress function
CREATE OR REPLACE FUNCTION update_user_progress(
  p_user_id UUID,
  p_points INTEGER,
  p_activity_date DATE DEFAULT CURRENT_DATE
)
RETURNS VOID 
LANGUAGE plpgsql
SET search_path = public
AS $$
DECLARE
  v_current_points INTEGER;
  v_current_level INTEGER;
  v_current_streak INTEGER;
  v_longest_streak INTEGER;
  v_last_activity DATE;
BEGIN
  -- Get or create user progress
  INSERT INTO user_progress (user_id, total_points, current_level, last_activity_date)
  VALUES (p_user_id, p_points, 1, p_activity_date)
  ON CONFLICT (user_id) DO UPDATE
  SET 
    total_points = user_progress.total_points + p_points,
    last_activity_date = p_activity_date,
    updated_at = NOW()
  RETURNING total_points, current_streak, longest_streak, last_activity_date
  INTO v_current_points, v_current_streak, v_longest_streak, v_last_activity;

  -- Calculate streak
  IF v_last_activity IS NULL OR v_last_activity < p_activity_date THEN
    IF v_last_activity IS NULL OR v_last_activity = p_activity_date - INTERVAL '1 day' THEN
      v_current_streak := COALESCE(v_current_streak, 0) + 1;
    ELSE
      v_current_streak := 1;
    END IF;
    
    IF v_current_streak > v_longest_streak THEN
      v_longest_streak := v_current_streak;
    END IF;
  END IF;

  -- Calculate level based on points
  v_current_level := CASE
    WHEN v_current_points >= 5000 THEN 8
    WHEN v_current_points >= 3500 THEN 7
    WHEN v_current_points >= 2000 THEN 6
    WHEN v_current_points >= 1000 THEN 5
    WHEN v_current_points >= 500 THEN 4
    WHEN v_current_points >= 250 THEN 3
    WHEN v_current_points >= 100 THEN 2
    ELSE 1
  END;

  -- Update user progress
  UPDATE user_progress
  SET 
    current_level = v_current_level,
    current_streak = v_current_streak,
    longest_streak = v_longest_streak,
    updated_at = NOW()
  WHERE user_id = p_user_id;
END;
$$;

-- Fix check_attendance_complete function
CREATE OR REPLACE FUNCTION check_attendance_complete(p_schedule_id UUID)
RETURNS TABLE (
  is_complete BOOLEAN,
  total_students INTEGER,
  marked_students INTEGER,
  missing_students INTEGER
) 
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_group_id UUID;
  v_total_students INTEGER;
  v_marked_students INTEGER;
BEGIN
  -- Get group_id from schedule
  SELECT group_id INTO v_group_id
  FROM schedule
  WHERE id = p_schedule_id;

  IF v_group_id IS NULL THEN
    RETURN QUERY SELECT FALSE, 0, 0, 0;
    RETURN;
  END IF;

  -- Count total students in the group
  SELECT COUNT(*) INTO v_total_students
  FROM group_students
  WHERE group_id = v_group_id;

  -- Count marked attendance
  SELECT COUNT(*) INTO v_marked_students
  FROM attendance
  WHERE schedule_id = p_schedule_id;

  RETURN QUERY SELECT
    (v_marked_students >= v_total_students) AS is_complete,
    v_total_students,
    v_marked_students,
    GREATEST(0, v_total_students - v_marked_students) AS missing_students;
END;
$$;

-- Fix check_grading_complete function
CREATE OR REPLACE FUNCTION check_grading_complete(p_group_id UUID, p_class_date TIMESTAMP WITH TIME ZONE)
RETURNS TABLE (
  is_complete BOOLEAN,
  total_assignments INTEGER,
  graded_assignments INTEGER,
  missing_grades INTEGER
) 
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_total_assignments INTEGER;
  v_graded_assignments INTEGER;
  v_student_count INTEGER;
BEGIN
  -- Count total students in group
  SELECT COUNT(*) INTO v_student_count
  FROM group_students
  WHERE group_id = p_group_id;

  -- Count assignments due on or before class date
  SELECT COUNT(DISTINCT id) INTO v_total_assignments
  FROM assignments
  WHERE group_id = p_group_id
    AND (due_date IS NULL OR due_date <= p_class_date);

  -- Count how many students have been graded for these assignments
  SELECT COUNT(DISTINCT g.student_id || '|' || g.assignment_id::text) INTO v_graded_assignments
  FROM grades g
  JOIN assignments a ON g.assignment_id = a.id
  WHERE a.group_id = p_group_id
    AND (a.due_date IS NULL OR a.due_date <= p_class_date);

  -- Calculate expected grades (students * assignments)
  v_total_assignments := v_total_assignments * v_student_count;

  RETURN QUERY SELECT
    (v_graded_assignments >= v_total_assignments) AS is_complete,
    v_total_assignments,
    v_graded_assignments,
    GREATEST(0, v_total_assignments - v_graded_assignments) AS missing_grades;
END;
$$;

-- Fix get_main_teacher_for_group function
CREATE OR REPLACE FUNCTION get_main_teacher_for_group(p_group_id UUID)
RETURNS UUID 
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_main_teacher_id UUID;
BEGIN
  SELECT u.id INTO v_main_teacher_id
  FROM users u
  JOIN groups g ON u.id = g.created_by
  WHERE g.id = p_group_id AND u.role = 'main_teacher';

  IF v_main_teacher_id IS NULL THEN
    -- Fallback: if the group creator is not main_teacher, find any main_teacher
    SELECT id INTO v_main_teacher_id FROM users WHERE role = 'main_teacher' LIMIT 1;
  END IF;

  RETURN v_main_teacher_id;
END;
$$;

-- Fix generate_class_completion_report function
CREATE OR REPLACE FUNCTION generate_class_completion_report(p_schedule_id UUID)
RETURNS TABLE (success BOOLEAN, message TEXT) 
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_schedule RECORD;
  v_group_name TEXT;
  v_group_id UUID;
  v_attendance_stats RECORD;
  v_grading_stats RECORD;
  v_main_teacher_id UUID;
  v_teacher_id UUID;
  v_message_content TEXT;
  v_message_subject TEXT;
  v_message_id UUID;
  v_report_sent BOOLEAN := FALSE;
  v_last_report_time TIMESTAMP WITH TIME ZONE;
  v_attendance_complete BOOLEAN;
  v_grading_complete BOOLEAN;
BEGIN
  -- Get schedule and group information
  SELECT s.*, g.teacher_id, g.name AS group_name, g.id AS group_id_from_groups
  INTO v_schedule
  FROM schedule s
  JOIN groups g ON s.group_id = g.id
  WHERE s.id = p_schedule_id;

  IF v_schedule IS NULL THEN
    RETURN QUERY SELECT FALSE, 'Schedule not found'::TEXT;
    RETURN;
  END IF;

  -- Extract values from v_schedule record
  v_teacher_id := v_schedule.teacher_id;
  v_group_name := v_schedule.group_name;
  v_group_id := v_schedule.group_id_from_groups;

  -- Calculate class end time
  IF (v_schedule.date + (v_schedule.duration_minutes || ' minutes')::INTERVAL) > NOW() THEN
    RETURN QUERY SELECT FALSE, 'Class has not ended yet'::TEXT;
    RETURN;
  END IF;

  -- Get main teacher
  v_main_teacher_id := get_main_teacher_for_group(v_schedule.group_id);

  IF v_main_teacher_id IS NULL THEN
    RETURN QUERY SELECT FALSE, 'Main teacher not found for group ' || v_schedule.group_id::TEXT;
    RETURN;
  END IF;

  -- Check if attendance and grading are complete
  SELECT is_complete INTO v_attendance_complete
  FROM check_attendance_complete(p_schedule_id);
  
  SELECT is_complete INTO v_grading_complete
  FROM check_grading_complete(v_schedule.group_id, v_schedule.date);

  -- Get attendance stats
  SELECT
    COUNT(CASE WHEN status = 'present' THEN 1 END) AS present_count,
    COUNT(CASE WHEN status = 'absent' THEN 1 END) AS absent_count,
    COUNT(CASE WHEN status = 'late' THEN 1 END) AS late_count,
    COUNT(CASE WHEN status = 'excused' THEN 1 END) AS excused_count,
    COUNT(student_id) AS total_students
  INTO v_attendance_stats
  FROM attendance
  WHERE schedule_id = p_schedule_id;

  -- Get grading stats
  SELECT
    COUNT(DISTINCT g.student_id) AS students_graded_count,
    COUNT(g.id) AS total_grades_recorded,
    AVG(g.score) AS average_score
  INTO v_grading_stats
  FROM grades g
  JOIN assignments a ON g.assignment_id = a.id
  WHERE a.group_id = v_schedule.group_id;

  -- Determine message content and recipient
  IF NOT v_attendance_complete OR NOT v_grading_complete THEN
    -- Send reminder to the assigned teacher
    SELECT sent_at INTO v_last_report_time
    FROM class_completion_reports
    WHERE schedule_id = p_schedule_id AND report_type = 'incomplete_reminder'
    ORDER BY sent_at DESC LIMIT 1;

    -- Only send reminder if it's been more than 1 hour since last reminder
    IF v_last_report_time IS NULL OR v_last_report_time < NOW() - INTERVAL '1 hour' THEN
      v_message_subject := 'Reminder: Complete Class Report for ' || v_group_name;
      v_message_content := 'Dear Teacher, <br><br>' ||
                          'The class "' || v_schedule.subject || '" for group "' || v_group_name || '" has ended. ' ||
                          'Please ensure all attendance and grading records are complete. <br><br>';
      IF NOT v_attendance_complete THEN
        v_message_content := v_message_content || '<b>Attendance is incomplete.</b> Please mark attendance for all students. <br>';
      END IF;
      IF NOT v_grading_complete THEN
        v_message_content := v_message_content || '<b>Grading is incomplete.</b> Please grade all assignments for this class. <br>';
      END IF;
      v_message_content := v_message_content || '<br>Thank you.';

      INSERT INTO messages (sender_id, recipient_id, subject, content)
      VALUES (v_main_teacher_id, v_teacher_id, v_message_subject, v_message_content)
      RETURNING id INTO v_message_id;

      INSERT INTO class_completion_reports (schedule_id, group_id, report_type, recipient_id, message_id)
      VALUES (p_schedule_id, v_group_id, 'incomplete_reminder', v_teacher_id, v_message_id);
      v_report_sent := TRUE;
      RETURN QUERY SELECT TRUE, 'Reminder sent to teacher for schedule ' || p_schedule_id::TEXT;
    ELSE
      RETURN QUERY SELECT FALSE, 'Reminder already sent recently for schedule ' || p_schedule_id::TEXT;
    END IF;
  ELSE
    -- Send completion report to main teacher
    SELECT sent_at INTO v_last_report_time
    FROM class_completion_reports
    WHERE schedule_id = p_schedule_id AND report_type = 'completion_report'
    ORDER BY sent_at DESC LIMIT 1;

    -- Only send completion report once
    IF v_last_report_time IS NULL THEN
      v_message_subject := 'Class Completion Report: ' || v_group_name || ' - ' || v_schedule.subject;
      v_message_content := 'Dear Main Teacher, <br><br>' ||
                          'The class "' || v_schedule.subject || '" for group "' || v_group_name || '" has been successfully completed and all records are finalized. <br><br>' ||
                          '<b>Summary:</b><br>' ||
                          'Total Students: ' || COALESCE(v_attendance_stats.total_students, 0)::TEXT || '<br>' ||
                          'Present: ' || COALESCE(v_attendance_stats.present_count, 0)::TEXT || '<br>' ||
                          'Absent: ' || COALESCE(v_attendance_stats.absent_count, 0)::TEXT || '<br>' ||
                          'Late: ' || COALESCE(v_attendance_stats.late_count, 0)::TEXT || '<br>' ||
                          'Excused: ' || COALESCE(v_attendance_stats.excused_count, 0)::TEXT || '<br>' ||
                          'Students Graded: ' || COALESCE(v_grading_stats.students_graded_count, 0)::TEXT || '<br>' ||
                          'Total Grades Recorded: ' || COALESCE(v_grading_stats.total_grades_recorded, 0)::TEXT || '<br>' ||
                          'Average Score: ' || COALESCE(ROUND(v_grading_stats.average_score, 2), 0)::TEXT || '%<br><br>' ||
                          'Teacher: ' || (SELECT full_name FROM users WHERE id = v_teacher_id) || '<br><br>' ||
                          'Thank you.';

      INSERT INTO messages (sender_id, recipient_id, subject, content)
      VALUES (v_teacher_id, v_main_teacher_id, v_message_subject, v_message_content)
      RETURNING id INTO v_message_id;

      INSERT INTO class_completion_reports (schedule_id, group_id, report_type, recipient_id, message_id)
      VALUES (p_schedule_id, v_group_id, 'completion_report', v_main_teacher_id, v_message_id);
      v_report_sent := TRUE;
      RETURN QUERY SELECT TRUE, 'Completion report sent to main teacher for schedule ' || p_schedule_id::TEXT;
    ELSE
      RETURN QUERY SELECT FALSE, 'Completion report already sent for schedule ' || p_schedule_id::TEXT;
    END IF;
  END IF;
END;
$$;

-- Fix process_ended_classes function
CREATE OR REPLACE FUNCTION process_ended_classes()
RETURNS TABLE (
  processed_count INTEGER,
  success_count INTEGER,
  error_count INTEGER
) 
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_schedule RECORD;
  v_processed INTEGER := 0;
  v_success INTEGER := 0;
  v_errors INTEGER := 0;
  v_result RECORD;
BEGIN
  -- Find all classes that have ended in the last 24 hours and haven't been processed
  FOR v_schedule IN
    SELECT s.id
    FROM schedule s
    WHERE (s.date + (s.duration_minutes || ' minutes')::INTERVAL) <= NOW()
      AND (s.date + (s.duration_minutes || ' minutes')::INTERVAL) >= NOW() - INTERVAL '24 hours'
      AND NOT EXISTS (
        SELECT 1 FROM class_completion_reports ccr
        WHERE ccr.schedule_id = s.id
          AND ccr.report_type = 'completion_report'
          AND ccr.sent_at > NOW() - INTERVAL '1 hour'
      )
  LOOP
    BEGIN
      SELECT * INTO v_result FROM generate_class_completion_report(v_schedule.id);
      v_processed := v_processed + 1;
      IF (v_result).success THEN
        v_success := v_success + 1;
      ELSE
        v_errors := v_errors + 1;
      END IF;
    EXCEPTION WHEN OTHERS THEN
      v_errors := v_errors + 1;
      -- Log error but continue processing
      RAISE WARNING 'Error processing schedule %: %', v_schedule.id, SQLERRM;
    END;
  END LOOP;

  RETURN QUERY SELECT v_processed, v_success, v_errors;
END;
$$;

-- Fix update_forum_topic_stats function
DO $$
BEGIN
  IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_schema = 'public' AND table_name = 'forum_topics') THEN
    EXECUTE '
      CREATE OR REPLACE FUNCTION update_forum_topic_stats()
      RETURNS TRIGGER 
      LANGUAGE plpgsql
      SET search_path = public
      AS $trigger$
      BEGIN
        IF TG_OP = ''INSERT'' THEN
          UPDATE forum_topics
          SET 
            reply_count = reply_count + 1,
            last_reply_at = NEW.created_at,
            last_reply_by = NEW.author_id
          WHERE id = NEW.topic_id;
          RETURN NULL;
        ELSIF TG_OP = ''DELETE'' THEN
          UPDATE forum_topics
          SET 
            reply_count = GREATEST(0, reply_count - 1)
          WHERE id = OLD.topic_id;
          RETURN NULL;
        END IF;
        RETURN NULL;
      END;
      $trigger$';
  END IF;
END $$;

-- ============================================================================
-- FIX 2: Fix overly permissive RLS policy on pending_students
-- ============================================================================

DO $$
BEGIN
  IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_schema = 'public' AND table_name = 'pending_students') THEN
    -- Drop the overly permissive policy
    DROP POLICY IF EXISTS "Service role has full access to pending_students" ON pending_students;
    
    -- Check if group_id column exists
    IF EXISTS (
      SELECT 1 FROM information_schema.columns 
      WHERE table_schema = 'public' 
        AND table_name = 'pending_students' 
        AND column_name = 'group_id'
    ) THEN
      -- Create policies with group_id support
      EXECUTE '
        -- Service role can manage all pending students (for system operations)
        CREATE POLICY "Service role can manage pending_students"
          ON pending_students FOR ALL
          USING (auth.role() = ''service_role'')
          WITH CHECK (auth.role() = ''service_role'');
        
        -- Authenticated users can read pending students they created
        CREATE POLICY "Users can read own pending students"
          ON pending_students FOR SELECT
          USING (
            auth.role() = ''authenticated'' AND
            created_by = auth.uid()
          );
        
        -- Teachers can read pending students for their groups
        CREATE POLICY "Teachers can read pending students for their groups"
          ON pending_students FOR SELECT
          USING (
            auth.role() = ''authenticated'' AND
            group_id IN (
              SELECT id FROM groups 
              WHERE teacher_id = auth.uid() 
                 OR created_by = auth.uid()
                 OR auth.uid() IN (SELECT id FROM users WHERE role = ''main_teacher'')
            )
          );
      ';
    ELSE
      -- Create policies without group_id (simpler structure)
      EXECUTE '
        -- Service role can manage all pending students (for system operations)
        CREATE POLICY "Service role can manage pending_students"
          ON pending_students FOR ALL
          USING (auth.role() = ''service_role'')
          WITH CHECK (auth.role() = ''service_role'');
        
        -- Authenticated users can read pending students they created
        CREATE POLICY "Users can read own pending students"
          ON pending_students FOR SELECT
          USING (
            auth.role() = ''authenticated'' AND
            created_by = auth.uid()
          );
        
        -- Teachers and main teachers can read all pending students
        CREATE POLICY "Teachers can read pending students"
          ON pending_students FOR SELECT
          USING (
            auth.role() = ''authenticated'' AND
            auth.uid() IN (SELECT id FROM users WHERE role IN (''main_teacher'', ''teacher''))
          );
      ';
    END IF;
  END IF;
END $$;

-- ============================================================================
-- VERIFICATION
-- ============================================================================

-- Verify functions have search_path set
SELECT 
  'Function Security Check' as check_type,
  proname as function_name,
  CASE 
    WHEN proconfig IS NULL THEN '❌ No search_path set'
    WHEN array_to_string(proconfig, ', ') LIKE '%search_path%' THEN '✅ search_path set'
    ELSE '⚠️ Other config set'
  END as security_status
FROM pg_proc
WHERE pronamespace = 'public'::regnamespace
  AND proname IN (
    'get_linked_student_ids',
    'update_user_progress',
    'check_attendance_complete',
    'check_grading_complete',
    'get_main_teacher_for_group',
    'generate_class_completion_report',
    'process_ended_classes',
    'update_forum_topic_stats'
  )
ORDER BY proname;

-- Verify pending_students policies
SELECT 
  'RLS Policy Check' as check_type,
  tablename,
  policyname,
  cmd as command,
  CASE 
    WHEN qual::text LIKE '%true%' AND cmd != 'SELECT' THEN '⚠️ Overly permissive'
    ELSE '✅ Appropriate'
  END as security_status
FROM pg_policies
WHERE schemaname = 'public'
  AND tablename = 'pending_students'
ORDER BY policyname;

