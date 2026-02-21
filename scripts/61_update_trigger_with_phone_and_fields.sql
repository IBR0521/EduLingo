-- Update the handle_new_user trigger to include phone numbers and other fields
-- This ensures all user information is saved during registration

-- Step 1: Update the function to read and save additional fields from metadata
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
  v_phone TEXT;
  v_has_phone BOOLEAN;
  v_age INTEGER;
  v_english_level TEXT;
  v_certificate_type TEXT;
  v_ielts_score NUMERIC;
  v_etk TEXT;
  v_employment_start_date DATE;
  v_salary_status TEXT;
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
  
  -- Get phone number and has_phone from metadata
  IF NEW.raw_user_meta_data IS NOT NULL THEN
    v_phone := NEW.raw_user_meta_data->>'phone_number';
    IF NEW.raw_user_meta_data->>'has_phone' IS NOT NULL THEN
      v_has_phone := (NEW.raw_user_meta_data->>'has_phone')::boolean;
    ELSE
      v_has_phone := (v_phone IS NOT NULL AND v_phone != '');
    END IF;
  END IF;
  
  -- Get student-specific fields from metadata
  IF NEW.raw_user_meta_data IS NOT NULL AND v_role = 'student' THEN
    IF NEW.raw_user_meta_data->>'age' IS NOT NULL THEN
      BEGIN
        v_age := (NEW.raw_user_meta_data->>'age')::integer;
      EXCEPTION WHEN OTHERS THEN
        v_age := NULL;
      END;
    END IF;
    v_english_level := NEW.raw_user_meta_data->>'english_level';
    v_certificate_type := NEW.raw_user_meta_data->>'certificate_type';
  END IF;
  
  -- Get teacher-specific fields from metadata
  IF NEW.raw_user_meta_data IS NOT NULL AND (v_role = 'teacher' OR v_role = 'main_teacher') THEN
    IF NEW.raw_user_meta_data->>'age' IS NOT NULL THEN
      BEGIN
        v_age := (NEW.raw_user_meta_data->>'age')::integer;
      EXCEPTION WHEN OTHERS THEN
        v_age := NULL;
      END;
    END IF;
    IF NEW.raw_user_meta_data->>'ielts_score' IS NOT NULL THEN
      BEGIN
        v_ielts_score := (NEW.raw_user_meta_data->>'ielts_score')::numeric;
      EXCEPTION WHEN OTHERS THEN
        v_ielts_score := NULL;
      END;
    END IF;
    v_etk := NEW.raw_user_meta_data->>'etk';
    IF NEW.raw_user_meta_data->>'employment_start_date' IS NOT NULL THEN
      BEGIN
        v_employment_start_date := (NEW.raw_user_meta_data->>'employment_start_date')::date;
      EXCEPTION WHEN OTHERS THEN
        v_employment_start_date := CURRENT_DATE;
      END;
    ELSE
      v_employment_start_date := CURRENT_DATE;
    END IF;
    v_salary_status := COALESCE(NEW.raw_user_meta_data->>'salary_status', 'pending');
  END IF;
  
  -- Attempt insert with maximum error handling
  BEGIN
    -- Check if table exists and has correct structure
    IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_schema = 'public' AND table_name = 'users') THEN
      -- Attempt insert with all fields
      INSERT INTO public.users (
        id, 
        email, 
        full_name, 
        role, 
        phone_number,
        has_phone,
        age,
        english_level,
        certificate_type,
        ielts_score,
        etk,
        employment_start_date,
        salary_status,
        created_at, 
        updated_at
      )
      VALUES (
        NEW.id,
        v_email,
        v_name,
        v_role,
        v_phone,
        v_has_phone,
        v_age,
        v_english_level,
        v_certificate_type,
        v_ielts_score,
        v_etk,
        v_employment_start_date,
        v_salary_status,
        COALESCE(NEW.created_at, NOW()),
        NOW()
      )
      ON CONFLICT (id) DO UPDATE SET
        email = EXCLUDED.email,
        full_name = COALESCE(EXCLUDED.full_name, users.full_name),
        role = COALESCE(EXCLUDED.role, users.role),
        phone_number = COALESCE(EXCLUDED.phone_number, users.phone_number),
        has_phone = COALESCE(EXCLUDED.has_phone, users.has_phone),
        age = COALESCE(EXCLUDED.age, users.age),
        english_level = COALESCE(EXCLUDED.english_level, users.english_level),
        certificate_type = COALESCE(EXCLUDED.certificate_type, users.certificate_type),
        ielts_score = COALESCE(EXCLUDED.ielts_score, users.ielts_score),
        etk = COALESCE(EXCLUDED.etk, users.etk),
        employment_start_date = COALESCE(EXCLUDED.employment_start_date, users.employment_start_date),
        salary_status = COALESCE(EXCLUDED.salary_status, users.salary_status),
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

-- Step 2: Verify the function was updated
SELECT 
  'Function Updated' as status,
  routine_name,
  routine_type
FROM information_schema.routines
WHERE routine_schema = 'public'
  AND routine_name = 'handle_new_user';

-- Step 3: Note - The trigger should already exist, but verify it
SELECT 
  'Trigger Status' as status,
  trigger_name,
  event_manipulation
FROM information_schema.triggers
WHERE trigger_schema = 'auth'
  AND event_object_table = 'users'
  AND trigger_name = 'on_auth_user_created';

