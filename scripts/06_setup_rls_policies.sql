-- Enable Row Level Security on all tables
ALTER TABLE users ENABLE ROW LEVEL SECURITY;
ALTER TABLE groups ENABLE ROW LEVEL SECURITY;
ALTER TABLE group_students ENABLE ROW LEVEL SECURITY;
ALTER TABLE parent_student ENABLE ROW LEVEL SECURITY;
ALTER TABLE assignments ENABLE ROW LEVEL SECURITY;
ALTER TABLE schedule ENABLE ROW LEVEL SECURITY;
ALTER TABLE attendance ENABLE ROW LEVEL SECURITY;
ALTER TABLE grades ENABLE ROW LEVEL SECURITY;
ALTER TABLE participation ENABLE ROW LEVEL SECURITY;
ALTER TABLE messages ENABLE ROW LEVEL SECURITY;
ALTER TABLE notifications ENABLE ROW LEVEL SECURITY;
ALTER TABLE files ENABLE ROW LEVEL SECURITY;

-- Drop existing policies if they exist (to avoid conflicts)
DROP POLICY IF EXISTS "Users can read own profile" ON users;
DROP POLICY IF EXISTS "Users can read all users" ON users;
DROP POLICY IF EXISTS "Users can update own profile" ON users;
DROP POLICY IF EXISTS "Users can insert own profile" ON users;
DROP POLICY IF EXISTS "Authenticated users can read groups" ON groups;
DROP POLICY IF EXISTS "Teachers can create groups" ON groups;
DROP POLICY IF EXISTS "Teachers can update own groups" ON groups;
DROP POLICY IF EXISTS "Authenticated users can read group_students" ON group_students;
DROP POLICY IF EXISTS "Teachers can manage group_students" ON group_students;
DROP POLICY IF EXISTS "Parents can read own links" ON parent_student;
DROP POLICY IF EXISTS "Parents can read by access_code" ON parent_student;
DROP POLICY IF EXISTS "Parents can update by access_code" ON parent_student;
DROP POLICY IF EXISTS "Students can read own links" ON parent_student;
DROP POLICY IF EXISTS "Students can insert own parent_student" ON parent_student;
DROP POLICY IF EXISTS "Users can read assignments" ON assignments;
DROP POLICY IF EXISTS "Teachers can create assignments" ON assignments;
DROP POLICY IF EXISTS "Users can read schedule" ON schedule;
DROP POLICY IF EXISTS "Users can read attendance" ON attendance;
DROP POLICY IF EXISTS "Students can read own grades" ON grades;
DROP POLICY IF EXISTS "Teachers can read grades" ON grades;
DROP POLICY IF EXISTS "Students can read own participation" ON participation;
DROP POLICY IF EXISTS "Teachers can read participation" ON participation;
DROP POLICY IF EXISTS "Users can read own messages" ON messages;
DROP POLICY IF EXISTS "Users can send messages" ON messages;
DROP POLICY IF EXISTS "Users can update received messages" ON messages;
DROP POLICY IF EXISTS "Users can read own notifications" ON notifications;
DROP POLICY IF EXISTS "Users can update own notifications" ON notifications;
DROP POLICY IF EXISTS "Users can read files" ON files;
DROP POLICY IF EXISTS "Users can upload files" ON files;

-- Users table policies
-- Users can read their own profile
CREATE POLICY "Users can read own profile"
  ON users FOR SELECT
  USING (auth.uid() = id);

-- Users can read all users (for basic info like names)
CREATE POLICY "Users can read all users"
  ON users FOR SELECT
  USING (true);

-- Users can update their own profile
CREATE POLICY "Users can update own profile"
  ON users FOR UPDATE
  USING (auth.uid() = id);

-- Service role can insert users (for registration)
-- Note: This is handled by the application, but we allow authenticated users to insert their own profile
CREATE POLICY "Users can insert own profile"
  ON users FOR INSERT
  WITH CHECK (auth.uid() = id);

-- Groups policies
-- Anyone authenticated can read groups
CREATE POLICY "Authenticated users can read groups"
  ON groups FOR SELECT
  USING (auth.role() = 'authenticated');

-- Teachers can create groups
CREATE POLICY "Teachers can create groups"
  ON groups FOR INSERT
  WITH CHECK (
    auth.uid() IN (
      SELECT id FROM users WHERE role IN ('main_teacher', 'teacher')
    )
  );

-- Teachers can update their own groups
CREATE POLICY "Teachers can update own groups"
  ON groups FOR UPDATE
  USING (
    teacher_id = auth.uid() OR
    created_by = auth.uid() OR
    auth.uid() IN (SELECT id FROM users WHERE role = 'main_teacher')
  );

-- Group students policies
-- Authenticated users can read group_students
CREATE POLICY "Authenticated users can read group_students"
  ON group_students FOR SELECT
  USING (auth.role() = 'authenticated');

-- Teachers can manage group_students
CREATE POLICY "Teachers can manage group_students"
  ON group_students FOR ALL
  USING (
    group_id IN (
      SELECT id FROM groups 
      WHERE teacher_id = auth.uid() 
      OR created_by = auth.uid()
      OR auth.uid() IN (SELECT id FROM users WHERE role = 'main_teacher')
    )
  );

-- Parent-Student policies
-- Parents can read links where they are the parent (after linking)
-- NOTE: Removed recursive subquery to prevent infinite recursion
CREATE POLICY "Parents can read own links"
  ON parent_student FOR SELECT
  USING (parent_id = auth.uid());

-- Parents can also read by access_code to find students to link
-- This allows parents to search for students using access codes before linking
CREATE POLICY "Parents can read by access_code"
  ON parent_student FOR SELECT
  USING (
    auth.uid() IN (
      SELECT id FROM users WHERE role = 'parent'
    )
  );

-- Students can read links where they are the student
CREATE POLICY "Students can read own links"
  ON parent_student FOR SELECT
  USING (student_id = auth.uid());

-- Students can insert their own parent_student records (for access code creation during registration)
CREATE POLICY "Students can insert own parent_student"
  ON parent_student FOR INSERT
  WITH CHECK (student_id = auth.uid());

-- Parents can update parent_student records to link students
-- This allows parents to update records where is_linked = false
CREATE POLICY "Parents can update by access_code"
  ON parent_student FOR UPDATE
  USING (
    auth.uid() IN (
      SELECT id FROM users WHERE role = 'parent'
    )
    AND is_linked = false
  )
  WITH CHECK (
    auth.uid() IN (
      SELECT id FROM users WHERE role = 'parent'
    )
    AND parent_id = auth.uid()
    AND is_linked = true
  );

-- Assignments policies
-- Authenticated users can read assignments for their groups
CREATE POLICY "Users can read assignments"
  ON assignments FOR SELECT
  USING (
    auth.role() = 'authenticated' AND (
      group_id IN (
        SELECT group_id FROM group_students WHERE student_id = auth.uid()
      )
      OR group_id IN (
        SELECT id FROM groups WHERE teacher_id = auth.uid() OR created_by = auth.uid()
      )
    )
  );

-- Teachers can create assignments
CREATE POLICY "Teachers can create assignments"
  ON assignments FOR INSERT
  WITH CHECK (
    auth.uid() IN (
      SELECT id FROM users WHERE role IN ('main_teacher', 'teacher')
    )
  );

-- Schedule policies
-- Authenticated users can read schedule for their groups
CREATE POLICY "Users can read schedule"
  ON schedule FOR SELECT
  USING (
    auth.role() = 'authenticated' AND (
      group_id IN (
        SELECT group_id FROM group_students WHERE student_id = auth.uid()
      )
      OR group_id IN (
        SELECT id FROM groups WHERE teacher_id = auth.uid() OR created_by = auth.uid()
      )
    )
  );

-- Attendance policies
-- Authenticated users can read attendance
CREATE POLICY "Users can read attendance"
  ON attendance FOR SELECT
  USING (
    auth.role() = 'authenticated' AND (
      student_id = auth.uid()
      OR marked_by = auth.uid()
      OR schedule_id IN (
        SELECT id FROM schedule WHERE group_id IN (
          SELECT id FROM groups WHERE teacher_id = auth.uid()
        )
      )
    )
  );

-- Grades policies
-- Students can read their own grades
CREATE POLICY "Students can read own grades"
  ON grades FOR SELECT
  USING (student_id = auth.uid());

-- Teachers can read grades for their groups
CREATE POLICY "Teachers can read grades"
  ON grades FOR SELECT
  USING (
    group_id IN (
      SELECT id FROM groups WHERE teacher_id = auth.uid() OR created_by = auth.uid()
    )
  );

-- Participation policies
-- Students can read their own participation
CREATE POLICY "Students can read own participation"
  ON participation FOR SELECT
  USING (student_id = auth.uid());

-- Teachers can read participation for their groups
CREATE POLICY "Teachers can read participation"
  ON participation FOR SELECT
  USING (
    group_id IN (
      SELECT id FROM groups WHERE teacher_id = auth.uid() OR created_by = auth.uid()
    )
  );

-- Messages policies
-- Users can read their own messages
CREATE POLICY "Users can read own messages"
  ON messages FOR SELECT
  USING (sender_id = auth.uid() OR recipient_id = auth.uid());

-- Users can send messages
CREATE POLICY "Users can send messages"
  ON messages FOR INSERT
  WITH CHECK (sender_id = auth.uid());

-- Users can update their own received messages (mark as read)
CREATE POLICY "Users can update received messages"
  ON messages FOR UPDATE
  USING (recipient_id = auth.uid());

-- Notifications policies
-- Users can read their own notifications
CREATE POLICY "Users can read own notifications"
  ON notifications FOR SELECT
  USING (user_id = auth.uid());

-- Users can update their own notifications
CREATE POLICY "Users can update own notifications"
  ON notifications FOR UPDATE
  USING (user_id = auth.uid());

-- Files policies
-- Authenticated users can read files for their assignments
CREATE POLICY "Users can read files"
  ON files FOR SELECT
  USING (
    auth.role() = 'authenticated' AND (
      uploaded_by = auth.uid()
      OR assignment_id IN (
        SELECT id FROM assignments WHERE group_id IN (
          SELECT group_id FROM group_students WHERE student_id = auth.uid()
        )
        OR group_id IN (
          SELECT id FROM groups WHERE teacher_id = auth.uid()
        )
      )
    )
  );

-- Users can upload files
CREATE POLICY "Users can upload files"
  ON files FOR INSERT
  WITH CHECK (uploaded_by = auth.uid());

