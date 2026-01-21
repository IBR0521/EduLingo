-- Create a database trigger to automatically create user profiles
-- This bypasses RLS issues by using a SECURITY DEFINER function
-- The profile will be created with role from user metadata, or 'student' as default

-- Step 1: Create a function that creates the user profile
-- This function runs with SECURITY DEFINER, so it bypasses RLS
-- IMPORTANT: This function must NEVER raise an exception that would fail user creation
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS TRIGGER AS $$
DECLARE
  user_role_value user_role := 'student'; -- Default role
  user_full_name TEXT;
  role_text TEXT;
  v_email TEXT;
  v_id UUID;
BEGIN
  -- Store values in local variables to avoid any issues
  v_id := NEW.id;
  v_email := COALESCE(NEW.email, 'unknown@example.com');
  
  -- Get role from user metadata if available
  role_text := NULL;
  IF NEW.raw_user_meta_data IS NOT NULL THEN
    role_text := NEW.raw_user_meta_data->>'role';
  END IF;
  
  -- Validate and set role
  IF role_text IS NOT NULL AND role_text IN ('main_teacher', 'teacher', 'student', 'parent') THEN
    BEGIN
      user_role_value := role_text::user_role;
    EXCEPTION WHEN OTHERS THEN
      -- If casting fails, use default
      user_role_value := 'student';
    END;
  ELSE
    -- Default to student
    user_role_value := 'student';
  END IF;
  
  -- Get full name from metadata
  user_full_name := NULL;
  IF NEW.raw_user_meta_data IS NOT NULL THEN
    user_full_name := NEW.raw_user_meta_data->>'full_name';
  END IF;
  
  -- Ensure full_name is not empty
  IF user_full_name IS NULL OR LENGTH(TRIM(user_full_name)) = 0 THEN
    user_full_name := SPLIT_PART(v_email, '@', 1);
    IF user_full_name IS NULL OR LENGTH(TRIM(user_full_name)) = 0 THEN
      user_full_name := 'User';
    END IF;
  END IF;
  
  -- Insert into public.users table with comprehensive error handling
  -- This must NEVER fail - if it does, we catch it and continue silently
  BEGIN
    INSERT INTO public.users (id, email, full_name, role, created_at, updated_at)
    VALUES (
      v_id,
      v_email,
      TRIM(user_full_name),
      user_role_value,
      COALESCE(NEW.created_at, NOW()),
      NOW()
    )
    ON CONFLICT (id) DO UPDATE SET
      email = EXCLUDED.email,
      full_name = COALESCE(EXCLUDED.full_name, users.full_name),
      role = COALESCE(EXCLUDED.role, users.role),
      updated_at = NOW();
  EXCEPTION WHEN OTHERS THEN
    -- Silently catch ALL errors - do not raise, log, or do anything
    -- The user account was created successfully, profile creation can be retried later
    -- We return NEW anyway so auth user creation succeeds
    NULL; -- Do nothing, just continue
  END;
  
  -- Always return NEW to allow auth user creation to succeed
  RETURN NEW;
EXCEPTION WHEN OTHERS THEN
  -- Ultimate safety net - if anything goes wrong, still return NEW
  -- This ensures user creation never fails due to profile creation
  -- Do NOT raise, log, or do anything - just return NEW
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Step 2: Create trigger that fires after a user is created in auth.users
DROP TRIGGER IF EXISTS on_auth_user_created ON auth.users;

CREATE TRIGGER on_auth_user_created
  AFTER INSERT ON auth.users
  FOR EACH ROW
  EXECUTE FUNCTION public.handle_new_user();

-- Step 3: Verify the trigger was created
SELECT 
  'Trigger Status' as check_type,
  trigger_name,
  event_manipulation,
  event_object_table,
  action_statement
FROM information_schema.triggers
WHERE trigger_schema = 'auth'
  AND event_object_table = 'users'
  AND trigger_name = 'on_auth_user_created';

-- Step 4: Test (this will show if the function exists)
SELECT 
  'Function Status' as check_type,
  routine_name,
  routine_type
FROM information_schema.routines
WHERE routine_schema = 'public'
  AND routine_name = 'handle_new_user';

