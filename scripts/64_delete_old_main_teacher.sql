-- Delete old main teacher account by email
-- Replace the email below with the old main teacher email you want to delete

-- IMPORTANT: This will permanently delete the user and all their data
-- Make sure you have the correct email before running

DO $$
DECLARE
  target_email TEXT := 'bekzodburxonjonov2@gmail.com';  -- Old main teacher email to delete
  user_id_to_delete UUID;
BEGIN
  -- Find the user ID from auth.users
  SELECT id INTO user_id_to_delete
  FROM auth.users
  WHERE email = target_email;
  
  IF user_id_to_delete IS NULL THEN
    RAISE NOTICE 'User with email % not found in auth.users', target_email;
  ELSE
    RAISE NOTICE 'Found user ID: %', user_id_to_delete;
    RAISE NOTICE 'Starting deletion process...';
    
    -- Delete from all related tables (in order of dependencies)
    
    -- Update groups where user is teacher or creator
    UPDATE groups SET teacher_id = NULL WHERE teacher_id = user_id_to_delete;
    UPDATE groups SET created_by = NULL WHERE created_by = user_id_to_delete;
    RAISE NOTICE 'Updated groups (removed teacher references)';
    
    -- Update courses where user is creator (if table and column exist)
    BEGIN
      IF EXISTS (
        SELECT 1 FROM information_schema.columns 
        WHERE table_name = 'courses' AND column_name = 'created_by'
      ) THEN
        UPDATE courses SET created_by = NULL WHERE created_by = user_id_to_delete;
        RAISE NOTICE 'Updated courses (removed creator references)';
      END IF;
    EXCEPTION WHEN undefined_table THEN
      RAISE NOTICE 'courses table does not exist, skipping';
    END;
    
    -- Update course_templates where user is creator (if table and column exist)
    BEGIN
      IF EXISTS (
        SELECT 1 FROM information_schema.columns 
        WHERE table_name = 'course_templates' AND column_name = 'created_by'
      ) THEN
        UPDATE course_templates SET created_by = NULL WHERE created_by = user_id_to_delete;
        RAISE NOTICE 'Updated course_templates (removed creator references)';
      END IF;
    EXCEPTION WHEN undefined_table THEN
      RAISE NOTICE 'course_templates table does not exist, skipping';
    END;
    
    -- Update other tables that might reference this user as creator
    -- Update course_modules (if table and column exist)
    BEGIN
      IF EXISTS (
        SELECT 1 FROM information_schema.columns 
        WHERE table_name = 'course_modules' AND column_name = 'created_by'
      ) THEN
        UPDATE course_modules SET created_by = NULL WHERE created_by = user_id_to_delete;
        RAISE NOTICE 'Updated course_modules (removed creator references)';
      END IF;
    EXCEPTION WHEN undefined_table THEN
      RAISE NOTICE 'course_modules table does not exist, skipping';
    END;
    
    -- Update lessons (if table and column exist)
    BEGIN
      IF EXISTS (
        SELECT 1 FROM information_schema.columns 
        WHERE table_name = 'lessons' AND column_name = 'created_by'
      ) THEN
        UPDATE lessons SET created_by = NULL WHERE created_by = user_id_to_delete;
        RAISE NOTICE 'Updated lessons (removed creator references)';
      END IF;
    EXCEPTION WHEN undefined_table THEN
      RAISE NOTICE 'lessons table does not exist, skipping';
    END;
    
    -- Update assignments (if created_by column exists)
    BEGIN
      IF EXISTS (
        SELECT 1 FROM information_schema.columns 
        WHERE table_name = 'assignments' AND column_name = 'created_by'
      ) THEN
        UPDATE assignments SET created_by = NULL WHERE created_by = user_id_to_delete;
        RAISE NOTICE 'Updated assignments (removed creator references)';
      END IF;
    EXCEPTION WHEN undefined_table THEN
      RAISE NOTICE 'assignments table does not exist, skipping';
    END;
    
    -- Delete from parent_student
    DELETE FROM parent_student WHERE parent_id = user_id_to_delete OR student_id = user_id_to_delete;
    RAISE NOTICE 'Deleted from parent_student';
    
    -- Delete from group_students
    DELETE FROM group_students WHERE student_id = user_id_to_delete;
    RAISE NOTICE 'Deleted from group_students';
    
    -- Delete from attendance
    DELETE FROM attendance WHERE student_id = user_id_to_delete OR marked_by = user_id_to_delete;
    RAISE NOTICE 'Deleted from attendance';
    
    -- Delete from grades
    DELETE FROM grades WHERE student_id = user_id_to_delete OR graded_by = user_id_to_delete;
    RAISE NOTICE 'Deleted from grades';
    
    -- Delete from participation
    DELETE FROM participation WHERE student_id = user_id_to_delete OR marked_by = user_id_to_delete;
    RAISE NOTICE 'Deleted from participation';
    
    -- Delete from messages
    DELETE FROM messages WHERE sender_id = user_id_to_delete OR recipient_id = user_id_to_delete;
    RAISE NOTICE 'Deleted from messages';
    
    -- Delete from notifications
    DELETE FROM notifications WHERE user_id = user_id_to_delete;
    RAISE NOTICE 'Deleted from notifications';
    
    -- Delete from files
    DELETE FROM files WHERE uploaded_by = user_id_to_delete;
    RAISE NOTICE 'Deleted from files';
    
    -- Delete from push_subscriptions (if table exists)
    BEGIN
      DELETE FROM push_subscriptions WHERE user_id = user_id_to_delete;
      RAISE NOTICE 'Deleted from push_subscriptions';
    EXCEPTION WHEN undefined_table THEN
      RAISE NOTICE 'push_subscriptions table does not exist, skipping';
    END;
    
    -- Delete from pending_students (if table exists)
    BEGIN
      DELETE FROM pending_students WHERE email = target_email OR created_by = user_id_to_delete;
      RAISE NOTICE 'Deleted from pending_students';
    EXCEPTION WHEN undefined_table THEN
      RAISE NOTICE 'pending_students table does not exist, skipping';
    END;
    
    -- Delete from pending_teachers (if table exists)
    BEGIN
      DELETE FROM pending_teachers WHERE email = target_email OR created_by = user_id_to_delete;
      RAISE NOTICE 'Deleted from pending_teachers';
    EXCEPTION WHEN undefined_table THEN
      RAISE NOTICE 'pending_teachers table does not exist, skipping';
    END;
    
    -- Delete from users table
    DELETE FROM users WHERE id = user_id_to_delete;
    RAISE NOTICE 'Deleted from users table';
    
    -- Finally, delete from auth.users (Supabase Auth)
    -- Note: This requires admin/service role privileges
    DELETE FROM auth.users WHERE id = user_id_to_delete;
    RAISE NOTICE 'Deleted from auth.users';
    
    RAISE NOTICE 'User % successfully deleted!', target_email;
  END IF;
END $$;

-- Verify deletion
SELECT 
  'Remaining Main Teachers' as check_type,
  COUNT(*) as count
FROM public.users
WHERE role = 'main_teacher';

SELECT 
  'All Main Teachers' as check_type,
  u.email,
  u.full_name,
  u.created_at
FROM public.users u
WHERE u.role = 'main_teacher'
ORDER BY u.created_at DESC;

