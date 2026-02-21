-- Delete user by email
-- This script removes a user from all tables
-- Run this in Supabase SQL Editor

-- Replace this email with the one you want to delete
DO $$
DECLARE
  target_email TEXT := 'bekzodburxonjonov455@gmail.com';
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
    
    -- Delete from custom tables (in order of dependencies)
    -- Delete from parent_student (if student)
    DELETE FROM parent_student WHERE student_id = user_id_to_delete;
    RAISE NOTICE 'Deleted from parent_student';
    
    -- Delete from group_students (if student)
    DELETE FROM group_students WHERE student_id = user_id_to_delete;
    RAISE NOTICE 'Deleted from group_students';
    
    -- Delete from attendance
    DELETE FROM attendance WHERE student_id = user_id_to_delete;
    RAISE NOTICE 'Deleted from attendance';
    
    -- Delete from grades
    DELETE FROM grades WHERE student_id = user_id_to_delete;
    RAISE NOTICE 'Deleted from grades';
    
    -- Delete from participation
    DELETE FROM participation WHERE student_id = user_id_to_delete;
    RAISE NOTICE 'Deleted from participation';
    
    -- Delete from messages (as sender or recipient)
    DELETE FROM messages WHERE sender_id = user_id_to_delete OR recipient_id = user_id_to_delete;
    RAISE NOTICE 'Deleted from messages';
    
    -- Delete from notifications
    DELETE FROM notifications WHERE user_id = user_id_to_delete;
    RAISE NOTICE 'Deleted from notifications';
    
    -- Delete from files
    DELETE FROM files WHERE uploaded_by = user_id_to_delete;
    RAISE NOTICE 'Deleted from files';
    
    -- Delete from push_subscriptions
    DELETE FROM push_subscriptions WHERE user_id = user_id_to_delete;
    RAISE NOTICE 'Deleted from push_subscriptions';
    
    -- Delete from users table
    DELETE FROM users WHERE id = user_id_to_delete;
    RAISE NOTICE 'Deleted from users table';
    
    -- Delete from pending_students (if exists)
    DELETE FROM pending_students WHERE email = target_email;
    RAISE NOTICE 'Deleted from pending_students';
    
    -- Delete from pending_teachers (if exists)
    DELETE FROM pending_teachers WHERE email = target_email;
    RAISE NOTICE 'Deleted from pending_teachers';
    
    -- Finally, delete from auth.users (Supabase Auth)
    -- Note: This requires admin privileges
    DELETE FROM auth.users WHERE id = user_id_to_delete;
    RAISE NOTICE 'Deleted from auth.users';
    
    RAISE NOTICE 'User % successfully deleted!', target_email;
  END IF;
END $$;






