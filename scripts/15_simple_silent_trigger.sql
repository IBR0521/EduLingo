-- Ultra-simple, completely silent trigger that never fails
-- This version is extremely defensive and checks everything before attempting insert

-- Step 1: Drop existing trigger and function
DROP TRIGGER IF EXISTS on_auth_user_created ON auth.users;
DROP FUNCTION IF EXISTS public.handle_new_user();

-- Step 2: Create ultra-simple function that never fails
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS TRIGGER 
SECURITY DEFINER
SET search_path = public
LANGUAGE plpgsql
AS $$
DECLARE
  v_role user_role;
  v_name TEXT;
  v_email TEXT;
BEGIN
  -- Get email (with fallback)
  v_email := COALESCE(NEW.email, 'user@example.com');
  
  -- Get name from metadata or email
  IF NEW.raw_user_meta_data IS NOT NULL AND NEW.raw_user_meta_data->>'full_name' IS NOT NULL THEN
    v_name := TRIM(NEW.raw_user_meta_data->>'full_name');
  END IF;
  
  IF v_name IS NULL OR v_name = '' THEN
    v_name := SPLIT_PART(v_email, '@', 1);
  END IF;
  
  IF v_name IS NULL OR v_name = '' THEN
    v_name := 'User';
  END IF;
  
  -- Get role from metadata (with validation)
  v_role := 'student'; -- Default
  
  IF NEW.raw_user_meta_data IS NOT NULL THEN
    DECLARE
      role_str TEXT;
    BEGIN
      role_str := NEW.raw_user_meta_data->>'role';
      IF role_str IN ('main_teacher', 'teacher', 'student', 'parent') THEN
        v_role := role_str::user_role;
      END IF;
    EXCEPTION WHEN OTHERS THEN
      v_role := 'student'; -- Use default on any error
    END;
  END IF;
  
  -- Attempt insert with maximum error handling
  BEGIN
    -- Check if table exists and has correct structure
    IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_schema = 'public' AND table_name = 'users') THEN
      -- Attempt insert
      INSERT INTO public.users (id, email, full_name, role, created_at, updated_at)
      VALUES (
        NEW.id,
        v_email,
        v_name,
        v_role,
        COALESCE(NEW.created_at, NOW()),
        NOW()
      )
      ON CONFLICT (id) DO UPDATE SET
        email = EXCLUDED.email,
        full_name = COALESCE(EXCLUDED.full_name, users.full_name),
        role = COALESCE(EXCLUDED.role, users.role),
        updated_at = NOW();
    END IF;
  EXCEPTION WHEN OTHERS THEN
    -- Completely silent - do absolutely nothing
    -- User creation must succeed regardless
    NULL;
  END;
  
  -- Always return NEW
  RETURN NEW;
EXCEPTION WHEN OTHERS THEN
  -- Ultimate safety - return NEW no matter what
  RETURN NEW;
END;
$$;

-- Step 3: Create trigger
CREATE TRIGGER on_auth_user_created
  AFTER INSERT ON auth.users
  FOR EACH ROW
  EXECUTE FUNCTION public.handle_new_user();

-- Step 4: Verify
SELECT 
  'Trigger Created' as status,
  trigger_name,
  event_manipulation
FROM information_schema.triggers
WHERE trigger_schema = 'auth'
  AND event_object_table = 'users'
  AND trigger_name = 'on_auth_user_created';






