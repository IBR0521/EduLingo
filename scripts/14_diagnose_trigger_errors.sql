-- Diagnostic script to check trigger function and recent errors
-- Run this to see what's happening with profile creation

-- Step 1: Check if trigger exists
SELECT 
  'Trigger Check' as check_type,
  trigger_name,
  event_manipulation,
  event_object_table,
  action_timing,
  action_statement
FROM information_schema.triggers
WHERE trigger_schema = 'auth'
  AND event_object_table = 'users'
  AND trigger_name = 'on_auth_user_created';

-- Step 2: Check if function exists
SELECT 
  'Function Check' as check_type,
  routine_name,
  routine_type,
  security_type
FROM information_schema.routines
WHERE routine_schema = 'public'
  AND routine_name = 'handle_new_user';

-- Step 3: Check recent auth users without profiles
SELECT 
  'Missing Profiles' as check_type,
  au.id,
  au.email,
  au.raw_user_meta_data->>'role' as role_from_metadata,
  au.raw_user_meta_data->>'full_name' as name_from_metadata,
  au.created_at,
  CASE WHEN pu.id IS NULL THEN 'MISSING' ELSE 'EXISTS' END as profile_status
FROM auth.users au
LEFT JOIN public.users pu ON au.id = pu.id
WHERE au.created_at >= NOW() - INTERVAL '1 hour'
ORDER BY au.created_at DESC
LIMIT 10;

-- Step 4: Check if users table has proper constraints
SELECT 
  'Table Constraints' as check_type,
  constraint_name,
  constraint_type
FROM information_schema.table_constraints
WHERE table_schema = 'public'
  AND table_name = 'users'
ORDER BY constraint_type;

-- Step 5: Test the function manually (replace with actual user ID if needed)
-- This will show if the function works
-- SELECT public.handle_new_user() FROM auth.users WHERE email = 'test@example.com' LIMIT 1;

-- Step 6: Check for any errors in PostgreSQL logs
-- Note: You'll need to check Supabase logs in the dashboard for actual error messages






