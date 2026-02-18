-- Simple script to delete user by email
-- Run this in Supabase SQL Editor
-- This will delete the user from auth.users which will cascade to other tables

-- Option 1: Delete directly from auth.users (requires admin/service role)
DELETE FROM auth.users 
WHERE email = 'bekzodburxonjonov455@gmail.com';

-- Option 2: If you get permission errors, delete from custom tables first, then auth
-- Step 1: Delete from custom tables
DO $$
DECLARE
  user_id_to_delete UUID;
BEGIN
  -- Get user ID
  SELECT id INTO user_id_to_delete
  FROM auth.users
  WHERE email = 'bekzodburxonjonov455@gmail.com';
  
  IF user_id_to_delete IS NOT NULL THEN
    -- Delete from all related tables
    DELETE FROM parent_student WHERE student_id = user_id_to_delete;
    DELETE FROM group_students WHERE student_id = user_id_to_delete;
    DELETE FROM attendance WHERE student_id = user_id_to_delete;
    DELETE FROM grades WHERE student_id = user_id_to_delete;
    DELETE FROM participation WHERE student_id = user_id_to_delete;
    DELETE FROM messages WHERE sender_id = user_id_to_delete OR recipient_id = user_id_to_delete;
    DELETE FROM notifications WHERE user_id = user_id_to_delete;
    DELETE FROM files WHERE uploaded_by = user_id_to_delete;
    DELETE FROM push_subscriptions WHERE user_id = user_id_to_delete;
    DELETE FROM users WHERE id = user_id_to_delete;
    DELETE FROM pending_students WHERE email = 'bekzodburxonjonov455@gmail.com';
    DELETE FROM pending_teachers WHERE email = 'bekzodburxonjonov455@gmail.com';
    
    RAISE NOTICE 'Deleted user data for: bekzodburxonjonov455@gmail.com';
  END IF;
END $$;

-- Step 2: Delete from auth.users (run this separately if Step 1 worked)
-- DELETE FROM auth.users WHERE email = 'bekzodburxonjonov455@gmail.com';




