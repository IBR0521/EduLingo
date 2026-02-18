-- Class Completion Reporting System
-- This creates functions and triggers for automatic reporting when classes end

-- Table to track class completion status and prevent duplicate reports
CREATE TABLE IF NOT EXISTS class_completion_reports (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  schedule_id UUID REFERENCES schedule(id) ON DELETE CASCADE,
  group_id UUID REFERENCES groups(id) ON DELETE CASCADE,
  report_type VARCHAR(50) NOT NULL CHECK (report_type IN ('incomplete_reminder', 'completion_report')),
  sent_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  recipient_id UUID REFERENCES users(id),
  message_id UUID REFERENCES messages(id),
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  UNIQUE(schedule_id, report_type, recipient_id)
);

-- Index for performance
CREATE INDEX idx_class_completion_reports_schedule ON class_completion_reports(schedule_id);
CREATE INDEX idx_class_completion_reports_group ON class_completion_reports(group_id);
CREATE INDEX idx_class_completion_reports_sent ON class_completion_reports(sent_at);

-- Enable RLS on class_completion_reports
ALTER TABLE class_completion_reports ENABLE ROW LEVEL SECURITY;

-- Drop existing policies if they exist
DROP POLICY IF EXISTS "Users can read own reports" ON class_completion_reports;
DROP POLICY IF EXISTS "Main teachers can read all reports" ON class_completion_reports;

-- Users can read reports sent to them
CREATE POLICY "Users can read own reports"
  ON class_completion_reports FOR SELECT
  USING (recipient_id = auth.uid());

-- Main teachers can read all reports
CREATE POLICY "Main teachers can read all reports"
  ON class_completion_reports FOR SELECT
  USING (auth.uid() IN (SELECT id FROM users WHERE role = 'main_teacher'));

-- Function to check if attendance is complete for a class
CREATE OR REPLACE FUNCTION check_attendance_complete(p_schedule_id UUID)
RETURNS TABLE (
  is_complete BOOLEAN,
  total_students INTEGER,
  marked_students INTEGER,
  missing_students INTEGER
) AS $$
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
$$ LANGUAGE plpgsql;

-- Function to check if grading is complete for assignments in a group
-- This checks if all students have been graded for assignments due on or before the class date
CREATE OR REPLACE FUNCTION check_grading_complete(p_group_id UUID, p_class_date TIMESTAMP WITH TIME ZONE)
RETURNS TABLE (
  is_complete BOOLEAN,
  total_assignments INTEGER,
  graded_assignments INTEGER,
  missing_grades INTEGER
) AS $$
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

  -- Count how many assignment-student combinations have been graded
  SELECT COUNT(DISTINCT assignment_id || '-' || student_id) INTO v_graded_assignments
  FROM grades
  WHERE group_id = p_group_id
    AND assignment_id IS NOT NULL
    AND assignment_id IN (
      SELECT id FROM assignments
      WHERE group_id = p_group_id
        AND (due_date IS NULL OR due_date <= p_class_date)
    );

  -- Expected graded combinations = assignments * students
  -- If graded_assignments >= (assignments * students), grading is complete
  RETURN QUERY SELECT
    (v_graded_assignments >= (v_total_assignments * v_student_count)) AS is_complete,
    v_total_assignments,
    CASE 
      WHEN v_student_count > 0 THEN v_graded_assignments / v_student_count
      ELSE 0
    END AS graded_assignments,
    GREATEST(0, (v_total_assignments * v_student_count) - v_graded_assignments) AS missing_grades;
END;
$$ LANGUAGE plpgsql;

-- Function to get main teacher for a group
CREATE OR REPLACE FUNCTION get_main_teacher_for_group(p_group_id UUID)
RETURNS UUID AS $$
DECLARE
  v_main_teacher_id UUID;
  v_group_creator_id UUID;
BEGIN
  -- First, try to get the group creator if they're a main teacher
  SELECT created_by INTO v_group_creator_id
  FROM groups
  WHERE id = p_group_id;

  IF v_group_creator_id IS NOT NULL THEN
    SELECT id INTO v_main_teacher_id
    FROM users
    WHERE id = v_group_creator_id
      AND role = 'main_teacher';
  END IF;

  -- If group creator is not a main teacher, get any main teacher
  IF v_main_teacher_id IS NULL THEN
    SELECT id INTO v_main_teacher_id
    FROM users
    WHERE role = 'main_teacher'
    ORDER BY created_at ASC
    LIMIT 1;
  END IF;

  RETURN v_main_teacher_id;
END;
$$ LANGUAGE plpgsql;

-- Function to generate class completion report
CREATE OR REPLACE FUNCTION generate_class_completion_report(p_schedule_id UUID)
RETURNS TABLE (
  success BOOLEAN,
  message TEXT
) AS $$
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
BEGIN
  -- Get schedule and group information
  SELECT s.*, g.teacher_id, g.name AS group_name, g.id AS group_id_from_groups
  INTO v_schedule
  FROM schedule s
  JOIN groups g ON s.group_id = g.id
  WHERE s.id = p_schedule_id;

  -- Extract values from v_schedule
  v_teacher_id := v_schedule.teacher_id;
  v_group_name := v_schedule.group_name;
  v_group_id := v_schedule.group_id_from_groups;

  IF v_schedule IS NULL THEN
    RETURN QUERY SELECT FALSE, 'Schedule not found'::TEXT;
    RETURN;
  END IF;

  -- Calculate class end time
  IF (v_schedule.date + (v_schedule.duration_minutes || ' minutes')::INTERVAL) > NOW() THEN
    RETURN QUERY SELECT FALSE, 'Class has not ended yet'::TEXT;
    RETURN;
  END IF;

  -- Get main teacher
  v_main_teacher_id := get_main_teacher_for_group(v_schedule.group_id);

  IF v_main_teacher_id IS NULL THEN
    RETURN QUERY SELECT FALSE, 'Main teacher not found'::TEXT;
    RETURN;
  END IF;

  -- Check attendance completion
  SELECT * INTO v_attendance_stats
  FROM check_attendance_complete(p_schedule_id);

  -- Check grading completion
  SELECT * INTO v_grading_stats
  FROM check_grading_complete(v_schedule.group_id, v_schedule.date);

  -- Determine if everything is complete
  IF v_attendance_stats.is_complete AND v_grading_stats.is_complete THEN
    -- Generate completion report
    v_message_subject := 'Class Completion Report: ' || v_schedule.subject || ' - ' || v_group_name;
    v_message_content := 'Class Completion Report' || E'\n\n' ||
      'Class: ' || v_schedule.subject || E'\n' ||
      'Group: ' || v_group_name || E'\n' ||
      'Date: ' || TO_CHAR(v_schedule.date, 'YYYY-MM-DD HH24:MI') || E'\n' ||
      'Duration: ' || v_schedule.duration_minutes || ' minutes' || E'\n\n' ||
      'ATTENDANCE SUMMARY:' || E'\n' ||
      '  Total Students: ' || v_attendance_stats.total_students || E'\n' ||
      '  Present: ' || v_attendance_stats.marked_students || E'\n' ||
      '  Absent: ' || (v_attendance_stats.total_students - v_attendance_stats.marked_students) || E'\n\n' ||
      'GRADING SUMMARY:' || E'\n' ||
      '  Total Assignments: ' || v_grading_stats.total_assignments || E'\n' ||
      '  Fully Graded: ' || CASE WHEN v_grading_stats.is_complete THEN 'Yes' ELSE 'No' END || E'\n\n' ||
      'All tasks have been completed. The class is fully processed.';

    -- Check if completion report already sent
    SELECT EXISTS(
      SELECT 1 FROM class_completion_reports
      WHERE schedule_id = p_schedule_id
        AND report_type = 'completion_report'
        AND recipient_id = v_main_teacher_id
    ) INTO v_report_sent;

    IF NOT v_report_sent THEN
      -- Send message to main teacher
      INSERT INTO messages (sender_id, recipient_id, subject, content)
      VALUES (
        v_main_teacher_id, -- System sends as main teacher (or we could use a system user)
        v_main_teacher_id,
        v_message_subject,
        v_message_content
      )
      RETURNING id INTO v_message_id;

      -- Record the report
      INSERT INTO class_completion_reports (schedule_id, group_id, report_type, recipient_id, message_id)
      VALUES (p_schedule_id, v_group_id, 'completion_report', v_main_teacher_id, v_message_id);

      RETURN QUERY SELECT TRUE, 'Completion report sent successfully'::TEXT;
    ELSE
      RETURN QUERY SELECT TRUE, 'Completion report already sent'::TEXT;
    END IF;
  ELSE
    -- Generate reminder for incomplete tasks
    v_message_subject := 'Reminder: Complete Class Tasks - ' || v_schedule.subject || ' - ' || v_group_name;
    v_message_content := 'Class Task Completion Reminder' || E'\n\n' ||
      'Class: ' || v_schedule.subject || E'\n' ||
      'Group: ' || v_group_name || E'\n' ||
      'Date: ' || TO_CHAR(v_schedule.date, 'YYYY-MM-DD HH24:MI') || E'\n\n';

    IF NOT v_attendance_stats.is_complete THEN
      v_message_content := v_message_content ||
        'ATTENDANCE INCOMPLETE:' || E'\n' ||
        '  Total Students: ' || v_attendance_stats.total_students || E'\n' ||
        '  Marked: ' || v_attendance_stats.marked_students || E'\n' ||
        '  Missing: ' || v_attendance_stats.missing_students || E'\n' ||
        '  Please mark attendance for all students.' || E'\n\n';
    END IF;

    IF NOT v_grading_stats.is_complete THEN
      v_message_content := v_message_content ||
        'GRADING INCOMPLETE:' || E'\n' ||
        '  Total Assignments: ' || v_grading_stats.total_assignments || E'\n' ||
        '  Missing Grades: ' || v_grading_stats.missing_grades || E'\n' ||
        '  Please complete grading for all students.' || E'\n\n';
    END IF;

    v_message_content := v_message_content ||
      'Please complete these tasks as soon as possible and report to the main teacher.';

    -- Check if reminder already sent in the last hour (to avoid spam)
    SELECT EXISTS(
      SELECT 1 FROM class_completion_reports
      WHERE schedule_id = p_schedule_id
        AND report_type = 'incomplete_reminder'
        AND recipient_id = v_teacher_id
        AND sent_at > NOW() - INTERVAL '1 hour'
    ) INTO v_report_sent;

    IF NOT v_report_sent AND v_teacher_id IS NOT NULL THEN
      -- Send reminder to teacher/assistant
      INSERT INTO messages (sender_id, recipient_id, subject, content)
      VALUES (
        v_main_teacher_id, -- System sends as main teacher
        v_teacher_id,
        v_message_subject,
        v_message_content
      )
      RETURNING id INTO v_message_id;

      -- Record the reminder
      INSERT INTO class_completion_reports (schedule_id, group_id, report_type, recipient_id, message_id)
      VALUES (p_schedule_id, v_group_id, 'incomplete_reminder', v_teacher_id, v_message_id);

      RETURN QUERY SELECT TRUE, 'Reminder sent to teacher'::TEXT;
    ELSE
      RETURN QUERY SELECT TRUE, 'Reminder already sent recently'::TEXT;
    END IF;
  END IF;
END;
$$ LANGUAGE plpgsql;

-- Function to process all ended classes (to be called by cron job)
CREATE OR REPLACE FUNCTION process_ended_classes()
RETURNS TABLE (
  processed_count INTEGER,
  success_count INTEGER,
  error_count INTEGER
) AS $$
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
$$ LANGUAGE plpgsql;

