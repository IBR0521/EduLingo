-- Create profile for main teacher account that exists in auth but not in users table
-- Replace the email below with your new main teacher email

-- Step 1: Check for auth users without profiles
SELECT 
  'Missing Profiles' as check_type,
  au.id,
  au.email,
  au.raw_user_meta_data->>'full_name' as full_name_from_meta,
  au.raw_user_meta_data->>'role' as role_from_meta,
  au.created_at as auth_created_at
FROM auth.users au
LEFT JOIN public.users pu ON au.id = pu.id
WHERE pu.id IS NULL
ORDER BY au.created_at DESC;

-- Step 2: Create profile for specific main teacher (replace email)
-- Replace 'your-main-teacher-email@example.com' with your actual email
DO $$
DECLARE
  target_email TEXT := 'your-main-teacher-email@example.com';  -- REPLACE THIS WITH YOUR EMAIL
  auth_user_id UUID;
  auth_user_email TEXT;
  auth_user_name TEXT;
  auth_user_role TEXT;
BEGIN
  -- Find the auth user
  SELECT 
    id,
    email,
    COALESCE(raw_user_meta_data->>'full_name', SPLIT_PART(email, '@', 1)),
    COALESCE(raw_user_meta_data->>'role', 'main_teacher')
  INTO auth_user_id, auth_user_email, auth_user_name, auth_user_role
  FROM auth.users
  WHERE email = target_email;
  
  IF auth_user_id IS NULL THEN
    RAISE NOTICE 'User with email % not found in auth.users', target_email;
  ELSE
    RAISE NOTICE 'Found user: % (ID: %)', auth_user_email, auth_user_id;
    RAISE NOTICE 'Name: %, Role from metadata: %', auth_user_name, auth_user_role;
    
    -- Check if profile already exists
    IF EXISTS (SELECT 1 FROM public.users WHERE id = auth_user_id) THEN
      RAISE NOTICE 'Profile already exists for this user';
      
      -- Update role if it's not main_teacher
      UPDATE public.users
      SET role = 'main_teacher'::user_role,
          updated_at = NOW()
      WHERE id = auth_user_id AND role != 'main_teacher'::user_role;
      
      IF FOUND THEN
        RAISE NOTICE 'Updated role to main_teacher';
      END IF;
    ELSE
      -- Create new profile with main_teacher role
      INSERT INTO public.users (id, email, full_name, role, created_at, updated_at)
      VALUES (
        auth_user_id,
        auth_user_email,
        auth_user_name,
        'main_teacher'::user_role,  -- Force main_teacher role
        NOW(),
        NOW()
      );
      
      RAISE NOTICE 'Profile created successfully with main_teacher role';
    END IF;
  END IF;
END $$;

-- Step 3: Verify the profile was created
SELECT 
  'Main Teacher Profile' as check_type,
  u.id,
  u.email,
  u.full_name,
  u.role,
  u.created_at
FROM public.users u
WHERE u.role = 'main_teacher'
ORDER BY u.created_at DESC;

