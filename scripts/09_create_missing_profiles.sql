-- Script to create missing user profiles for existing auth users
-- This helps users who have auth accounts but no profile in the users table

-- Step 1: Check for auth users without profiles
SELECT 
  'Missing Profiles' as check_type,
  au.id,
  au.email,
  au.raw_user_meta_data->>'full_name' as full_name_from_meta,
  au.created_at as auth_created_at
FROM auth.users au
LEFT JOIN public.users pu ON au.id = pu.id
WHERE pu.id IS NULL
ORDER BY au.created_at DESC;

-- Step 2: Create profiles for auth users missing from users table
-- WARNING: This will create profiles with role 'student' by default
-- If a user already has a profile with a different role, this will NOT overwrite it
-- (ON CONFLICT prevents overwriting existing profiles)
-- 
-- IMPORTANT: If you need to restore roles that were accidentally changed,
-- use scripts/10_restore_user_roles.sql instead
INSERT INTO public.users (id, email, full_name, role, created_at, updated_at)
SELECT 
  au.id,
  au.email,
  COALESCE(
    au.raw_user_meta_data->>'full_name',
    SPLIT_PART(au.email, '@', 1)  -- Use email prefix as fallback
  ) as full_name,
  COALESCE(
    au.raw_user_meta_data->>'role',  -- Try to get role from metadata first
    'student'  -- Default to student if not in metadata
  )::user_role as role,
  au.created_at,
  NOW() as updated_at
FROM auth.users au
LEFT JOIN public.users pu ON au.id = pu.id
WHERE pu.id IS NULL
ON CONFLICT (id) DO NOTHING;  -- This prevents overwriting existing profiles

-- Step 3: Verify the profiles were created
SELECT 
  'Created Profiles' as check_type,
  COUNT(*) as profiles_created
FROM public.users
WHERE created_at >= NOW() - INTERVAL '1 minute';

-- Step 4: Show all users now
SELECT 
  'All Users' as check_type,
  u.id,
  u.email,
  u.full_name,
  u.role,
  u.created_at
FROM public.users u
ORDER BY u.created_at DESC
LIMIT 10;

