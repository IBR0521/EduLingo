-- RLS Policies for Learning Paths and Gamification Tables
-- This enables Row Level Security and creates appropriate policies for:
-- - course_materials
-- - leaderboard
-- - learning_objectives
-- - lesson_prerequisites
-- - lessons
-- - notification_preferences
-- - points_history
-- - skill_mastery
-- - student_progress
-- - user_badges
-- - user_progress

-- ============================================================================
-- COURSE MATERIALS
-- ============================================================================
ALTER TABLE course_materials ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Users can read course materials in their groups" ON course_materials;
DROP POLICY IF EXISTS "Teachers can create course materials" ON course_materials;
DROP POLICY IF EXISTS "Teachers can update course materials" ON course_materials;
DROP POLICY IF EXISTS "Teachers can delete course materials" ON course_materials;

-- Users can read course materials for groups they belong to
CREATE POLICY "Users can read course materials in their groups"
  ON course_materials FOR SELECT
  USING (
    group_id IN (
      SELECT group_id FROM group_students WHERE student_id = auth.uid()
      UNION
      SELECT id FROM groups WHERE teacher_id = auth.uid() OR created_by = auth.uid()
    )
    OR
    auth.uid() IN (SELECT id FROM users WHERE role = 'main_teacher')
  );

-- Teachers can create course materials for groups they manage
CREATE POLICY "Teachers can create course materials"
  ON course_materials FOR INSERT
  WITH CHECK (
    group_id IN (
      SELECT id FROM groups WHERE teacher_id = auth.uid() OR created_by = auth.uid()
    )
    OR
    auth.uid() IN (SELECT id FROM users WHERE role = 'main_teacher')
  );

-- Teachers can update course materials they created or in groups they manage
CREATE POLICY "Teachers can update course materials"
  ON course_materials FOR UPDATE
  USING (
    created_by = auth.uid()
    OR
    group_id IN (
      SELECT id FROM groups WHERE teacher_id = auth.uid() OR created_by = auth.uid()
    )
    OR
    auth.uid() IN (SELECT id FROM users WHERE role = 'main_teacher')
  )
  WITH CHECK (
    created_by = auth.uid()
    OR
    group_id IN (
      SELECT id FROM groups WHERE teacher_id = auth.uid() OR created_by = auth.uid()
    )
    OR
    auth.uid() IN (SELECT id FROM users WHERE role = 'main_teacher')
  );

-- Teachers can delete course materials they created or in groups they manage
CREATE POLICY "Teachers can delete course materials"
  ON course_materials FOR DELETE
  USING (
    created_by = auth.uid()
    OR
    group_id IN (
      SELECT id FROM groups WHERE teacher_id = auth.uid() OR created_by = auth.uid()
    )
    OR
    auth.uid() IN (SELECT id FROM users WHERE role = 'main_teacher')
  );

-- ============================================================================
-- LEADERBOARD
-- ============================================================================
ALTER TABLE leaderboard ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Users can read leaderboard for their groups" ON leaderboard;
DROP POLICY IF EXISTS "System can update leaderboard" ON leaderboard;

-- Users can read leaderboard for groups they belong to
CREATE POLICY "Users can read leaderboard for their groups"
  ON leaderboard FOR SELECT
  USING (
    group_id IN (
      SELECT group_id FROM group_students WHERE student_id = auth.uid()
      UNION
      SELECT id FROM groups WHERE teacher_id = auth.uid() OR created_by = auth.uid()
    )
    OR
    auth.uid() IN (SELECT id FROM users WHERE role = 'main_teacher')
  );

-- System can update leaderboard (via service role or authenticated users for their own records)
CREATE POLICY "System can update leaderboard"
  ON leaderboard FOR ALL
  USING (
    user_id = auth.uid()
    OR
    group_id IN (
      SELECT id FROM groups WHERE teacher_id = auth.uid() OR created_by = auth.uid()
    )
    OR
    auth.uid() IN (SELECT id FROM users WHERE role = 'main_teacher')
  )
  WITH CHECK (
    user_id = auth.uid()
    OR
    group_id IN (
      SELECT id FROM groups WHERE teacher_id = auth.uid() OR created_by = auth.uid()
    )
    OR
    auth.uid() IN (SELECT id FROM users WHERE role = 'main_teacher')
  );

-- ============================================================================
-- LEARNING OBJECTIVES
-- ============================================================================
ALTER TABLE learning_objectives ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Users can read learning objectives in their groups" ON learning_objectives;
DROP POLICY IF EXISTS "Teachers can create learning objectives" ON learning_objectives;
DROP POLICY IF EXISTS "Teachers can update learning objectives" ON learning_objectives;
DROP POLICY IF EXISTS "Teachers can delete learning objectives" ON learning_objectives;

-- Users can read learning objectives for groups they belong to
CREATE POLICY "Users can read learning objectives in their groups"
  ON learning_objectives FOR SELECT
  USING (
    group_id IN (
      SELECT group_id FROM group_students WHERE student_id = auth.uid()
      UNION
      SELECT id FROM groups WHERE teacher_id = auth.uid() OR created_by = auth.uid()
    )
    OR
    auth.uid() IN (SELECT id FROM users WHERE role = 'main_teacher')
  );

-- Teachers can create learning objectives for groups they manage
CREATE POLICY "Teachers can create learning objectives"
  ON learning_objectives FOR INSERT
  WITH CHECK (
    group_id IN (
      SELECT id FROM groups WHERE teacher_id = auth.uid() OR created_by = auth.uid()
    )
    OR
    auth.uid() IN (SELECT id FROM users WHERE role = 'main_teacher')
  );

-- Teachers can update learning objectives in groups they manage
CREATE POLICY "Teachers can update learning objectives"
  ON learning_objectives FOR UPDATE
  USING (
    group_id IN (
      SELECT id FROM groups WHERE teacher_id = auth.uid() OR created_by = auth.uid()
    )
    OR
    auth.uid() IN (SELECT id FROM users WHERE role = 'main_teacher')
  )
  WITH CHECK (
    group_id IN (
      SELECT id FROM groups WHERE teacher_id = auth.uid() OR created_by = auth.uid()
    )
    OR
    auth.uid() IN (SELECT id FROM users WHERE role = 'main_teacher')
  );

-- Teachers can delete learning objectives in groups they manage
CREATE POLICY "Teachers can delete learning objectives"
  ON learning_objectives FOR DELETE
  USING (
    group_id IN (
      SELECT id FROM groups WHERE teacher_id = auth.uid() OR created_by = auth.uid()
    )
    OR
    auth.uid() IN (SELECT id FROM users WHERE role = 'main_teacher')
  );

-- ============================================================================
-- LESSON PREREQUISITES
-- ============================================================================
ALTER TABLE lesson_prerequisites ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Users can read lesson prerequisites" ON lesson_prerequisites;
DROP POLICY IF EXISTS "Teachers can manage lesson prerequisites" ON lesson_prerequisites;

-- Users can read lesson prerequisites for lessons in groups they belong to
CREATE POLICY "Users can read lesson prerequisites"
  ON lesson_prerequisites FOR SELECT
  USING (
    lesson_id IN (
      SELECT l.id 
      FROM lessons l
      JOIN course_modules cm ON l.module_id = cm.id
      WHERE cm.group_id IN (
        SELECT group_id FROM group_students WHERE student_id = auth.uid()
        UNION
        SELECT id FROM groups WHERE teacher_id = auth.uid() OR created_by = auth.uid()
      )
    )
    OR
    auth.uid() IN (SELECT id FROM users WHERE role = 'main_teacher')
  );

-- Teachers can manage lesson prerequisites for groups they manage
CREATE POLICY "Teachers can manage lesson prerequisites"
  ON lesson_prerequisites FOR ALL
  USING (
    lesson_id IN (
      SELECT l.id 
      FROM lessons l
      JOIN course_modules cm ON l.module_id = cm.id
      WHERE cm.group_id IN (
        SELECT id FROM groups WHERE teacher_id = auth.uid() OR created_by = auth.uid()
      )
    )
    OR
    auth.uid() IN (SELECT id FROM users WHERE role = 'main_teacher')
  )
  WITH CHECK (
    lesson_id IN (
      SELECT l.id 
      FROM lessons l
      JOIN course_modules cm ON l.module_id = cm.id
      WHERE cm.group_id IN (
        SELECT id FROM groups WHERE teacher_id = auth.uid() OR created_by = auth.uid()
      )
    )
    OR
    auth.uid() IN (SELECT id FROM users WHERE role = 'main_teacher')
  );

-- ============================================================================
-- LESSONS
-- ============================================================================
ALTER TABLE lessons ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Users can read lessons in their groups" ON lessons;
DROP POLICY IF EXISTS "Teachers can create lessons" ON lessons;
DROP POLICY IF EXISTS "Teachers can update lessons" ON lessons;
DROP POLICY IF EXISTS "Teachers can delete lessons" ON lessons;

-- Users can read lessons for groups they belong to
CREATE POLICY "Users can read lessons in their groups"
  ON lessons FOR SELECT
  USING (
    module_id IN (
      SELECT cm.id 
      FROM course_modules cm
      WHERE cm.group_id IN (
        SELECT group_id FROM group_students WHERE student_id = auth.uid()
        UNION
        SELECT id FROM groups WHERE teacher_id = auth.uid() OR created_by = auth.uid()
      )
    )
    OR
    auth.uid() IN (SELECT id FROM users WHERE role = 'main_teacher')
  );

-- Teachers can create lessons for modules in groups they manage
CREATE POLICY "Teachers can create lessons"
  ON lessons FOR INSERT
  WITH CHECK (
    module_id IN (
      SELECT cm.id 
      FROM course_modules cm
      WHERE cm.group_id IN (
        SELECT id FROM groups WHERE teacher_id = auth.uid() OR created_by = auth.uid()
      )
    )
    OR
    auth.uid() IN (SELECT id FROM users WHERE role = 'main_teacher')
  );

-- Teachers can update lessons in groups they manage
CREATE POLICY "Teachers can update lessons"
  ON lessons FOR UPDATE
  USING (
    module_id IN (
      SELECT cm.id 
      FROM course_modules cm
      WHERE cm.group_id IN (
        SELECT id FROM groups WHERE teacher_id = auth.uid() OR created_by = auth.uid()
      )
    )
    OR
    auth.uid() IN (SELECT id FROM users WHERE role = 'main_teacher')
  )
  WITH CHECK (
    module_id IN (
      SELECT cm.id 
      FROM course_modules cm
      WHERE cm.group_id IN (
        SELECT id FROM groups WHERE teacher_id = auth.uid() OR created_by = auth.uid()
      )
    )
    OR
    auth.uid() IN (SELECT id FROM users WHERE role = 'main_teacher')
  );

-- Teachers can delete lessons in groups they manage
CREATE POLICY "Teachers can delete lessons"
  ON lessons FOR DELETE
  USING (
    module_id IN (
      SELECT cm.id 
      FROM course_modules cm
      WHERE cm.group_id IN (
        SELECT id FROM groups WHERE teacher_id = auth.uid() OR created_by = auth.uid()
      )
    )
    OR
    auth.uid() IN (SELECT id FROM users WHERE role = 'main_teacher')
  );

-- ============================================================================
-- NOTIFICATION PREFERENCES
-- ============================================================================
ALTER TABLE notification_preferences ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Users can manage own notification preferences" ON notification_preferences;

-- Users can manage their own notification preferences
CREATE POLICY "Users can manage own notification preferences"
  ON notification_preferences FOR ALL
  USING (user_id = auth.uid())
  WITH CHECK (user_id = auth.uid());

-- ============================================================================
-- POINTS HISTORY
-- ============================================================================
ALTER TABLE points_history ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Users can read own points history" ON points_history;
DROP POLICY IF EXISTS "System can insert points history" ON points_history;
DROP POLICY IF EXISTS "Teachers can read points history for their groups" ON points_history;

-- Users can read their own points history
CREATE POLICY "Users can read own points history"
  ON points_history FOR SELECT
  USING (user_id = auth.uid());

-- System can insert points history (users can insert for themselves, system via service role)
CREATE POLICY "System can insert points history"
  ON points_history FOR INSERT
  WITH CHECK (user_id = auth.uid());

-- Teachers can read points history for students in their groups
CREATE POLICY "Teachers can read points history for their groups"
  ON points_history FOR SELECT
  USING (
    user_id IN (
      SELECT student_id 
      FROM group_students 
      WHERE group_id IN (
        SELECT id FROM groups WHERE teacher_id = auth.uid() OR created_by = auth.uid()
      )
    )
    OR
    auth.uid() IN (SELECT id FROM users WHERE role = 'main_teacher')
  );

-- ============================================================================
-- SKILL MASTERY
-- ============================================================================
ALTER TABLE skill_mastery ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Users can read own skill mastery" ON skill_mastery;
DROP POLICY IF EXISTS "Users can update own skill mastery" ON skill_mastery;
DROP POLICY IF EXISTS "System can insert skill mastery" ON skill_mastery;
DROP POLICY IF EXISTS "Teachers can read skill mastery for their groups" ON skill_mastery;

-- Users can read their own skill mastery
CREATE POLICY "Users can read own skill mastery"
  ON skill_mastery FOR SELECT
  USING (student_id = auth.uid());

-- Users can update their own skill mastery
CREATE POLICY "Users can update own skill mastery"
  ON skill_mastery FOR UPDATE
  USING (student_id = auth.uid())
  WITH CHECK (student_id = auth.uid());

-- System can insert skill mastery (users can insert for themselves)
CREATE POLICY "System can insert skill mastery"
  ON skill_mastery FOR INSERT
  WITH CHECK (student_id = auth.uid());

-- Teachers can read skill mastery for students in their groups
CREATE POLICY "Teachers can read skill mastery for their groups"
  ON skill_mastery FOR SELECT
  USING (
    student_id IN (
      SELECT student_id 
      FROM group_students 
      WHERE group_id IN (
        SELECT id FROM groups WHERE teacher_id = auth.uid() OR created_by = auth.uid()
      )
    )
    OR
    auth.uid() IN (SELECT id FROM users WHERE role = 'main_teacher')
  );

-- ============================================================================
-- STUDENT PROGRESS
-- ============================================================================
ALTER TABLE student_progress ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Users can read own student progress" ON student_progress;
DROP POLICY IF EXISTS "Users can update own student progress" ON student_progress;
DROP POLICY IF EXISTS "System can insert student progress" ON student_progress;
DROP POLICY IF EXISTS "Teachers can read student progress for their groups" ON student_progress;

-- Users can read their own student progress
CREATE POLICY "Users can read own student progress"
  ON student_progress FOR SELECT
  USING (student_id = auth.uid());

-- Users can update their own student progress
CREATE POLICY "Users can update own student progress"
  ON student_progress FOR UPDATE
  USING (student_id = auth.uid())
  WITH CHECK (student_id = auth.uid());

-- System can insert student progress (users can insert for themselves)
CREATE POLICY "System can insert student progress"
  ON student_progress FOR INSERT
  WITH CHECK (student_id = auth.uid());

-- Teachers can read student progress for students in their groups
CREATE POLICY "Teachers can read student progress for their groups"
  ON student_progress FOR SELECT
  USING (
    student_id IN (
      SELECT student_id 
      FROM group_students 
      WHERE group_id IN (
        SELECT id FROM groups WHERE teacher_id = auth.uid() OR created_by = auth.uid()
      )
    )
    OR
    auth.uid() IN (SELECT id FROM users WHERE role = 'main_teacher')
  );

-- ============================================================================
-- USER BADGES
-- ============================================================================
ALTER TABLE user_badges ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Users can read own badges" ON user_badges;
DROP POLICY IF EXISTS "System can insert user badges" ON user_badges;
DROP POLICY IF EXISTS "Teachers can read badges for their groups" ON user_badges;

-- Users can read their own badges
CREATE POLICY "Users can read own badges"
  ON user_badges FOR SELECT
  USING (user_id = auth.uid());

-- System can insert user badges (users can insert for themselves, system via service role)
CREATE POLICY "System can insert user badges"
  ON user_badges FOR INSERT
  WITH CHECK (user_id = auth.uid());

-- Teachers can read badges for students in their groups
CREATE POLICY "Teachers can read badges for their groups"
  ON user_badges FOR SELECT
  USING (
    user_id IN (
      SELECT student_id 
      FROM group_students 
      WHERE group_id IN (
        SELECT id FROM groups WHERE teacher_id = auth.uid() OR created_by = auth.uid()
      )
    )
    OR
    auth.uid() IN (SELECT id FROM users WHERE role = 'main_teacher')
  );

-- ============================================================================
-- USER PROGRESS
-- ============================================================================
ALTER TABLE user_progress ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Users can read own progress" ON user_progress;
DROP POLICY IF EXISTS "Users can update own progress" ON user_progress;
DROP POLICY IF EXISTS "System can insert user progress" ON user_progress;
DROP POLICY IF EXISTS "Teachers can read progress for their groups" ON user_progress;

-- Users can read their own progress
CREATE POLICY "Users can read own progress"
  ON user_progress FOR SELECT
  USING (user_id = auth.uid());

-- Users can update their own progress
CREATE POLICY "Users can update own progress"
  ON user_progress FOR UPDATE
  USING (user_id = auth.uid())
  WITH CHECK (user_id = auth.uid());

-- System can insert user progress (users can insert for themselves, system via service role)
CREATE POLICY "System can insert user progress"
  ON user_progress FOR INSERT
  WITH CHECK (user_id = auth.uid());

-- Teachers can read progress for students in their groups
CREATE POLICY "Teachers can read progress for their groups"
  ON user_progress FOR SELECT
  USING (
    user_id IN (
      SELECT student_id 
      FROM group_students 
      WHERE group_id IN (
        SELECT id FROM groups WHERE teacher_id = auth.uid() OR created_by = auth.uid()
      )
    )
    OR
    auth.uid() IN (SELECT id FROM users WHERE role = 'main_teacher')
  );



