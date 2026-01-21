-- Script to help restore user roles if they were accidentally changed
-- This script shows you how to check and update user roles

-- Step 1: Check current user roles
SELECT 
  'Current User Roles' as check_type,
  u.id,
  u.email,
  u.full_name,
  u.role,
  u.created_at,
  u.updated_at
FROM public.users u
ORDER BY u.updated_at DESC, u.created_at DESC;

-- Step 2: Check auth users and their metadata (might contain original role info)
SELECT 
  'Auth Users with Metadata' as check_type,
  au.id,
  au.email,
  au.raw_user_meta_data,
  au.created_at
FROM auth.users au
ORDER BY au.created_at DESC;

-- Step 3: If you need to update a specific user's role, use this template:
-- UPDATE public.users 
-- SET role = 'main_teacher'  -- or 'teacher', 'student', 'parent'
-- WHERE email = 'user@example.com';

-- Step 4: Example - Update all users who were recently updated to student back to their original roles
-- (You'll need to manually determine the correct roles based on your records)
-- UPDATE public.users 
-- SET role = 'teacher'  -- Change this to the correct role
-- WHERE role = 'student' 
--   AND updated_at >= '2024-01-11'  -- Adjust date to when the issue occurred
--   AND email IN ('teacher1@example.com', 'teacher2@example.com');  -- List of affected emails

-- Step 5: Verify the updates
SELECT 
  'Updated Roles' as check_type,
  role,
  COUNT(*) as user_count
FROM public.users
GROUP BY role
ORDER BY role;



