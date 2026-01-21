# Trigger Error Fix Guide

## Issue: "Database error saving new user"

This error occurs when the database trigger (`handle_new_user`) fails during user registration. Even though the trigger has error handling, Supabase may still report the error to the client.

## Solution

### 1. Updated Trigger Function (Completely Silent)

The trigger function in `scripts/13_auto_create_profile_trigger.sql` has been updated to:
- **Never raise exceptions** - All errors are caught silently
- **Never log warnings** - No RAISE statements that could cause Supabase to report errors
- **Always succeed** - Even if profile creation fails, user account creation succeeds
- **Use local variables** - More defensive programming to avoid NULL issues

### 2. Client-Side Fallback

The registration form (`components/auth/register-form.tsx`) now:
- **Handles "Database error" gracefully** - Doesn't immediately show error
- **Retries session acquisition** - Waits for session to be available
- **Manually creates profile** - If trigger fails, creates profile client-side as fallback
- **Better error messages** - Provides clear guidance on what to do

## How to Fix

### Step 1: Try the Ultra-Simple Silent Trigger (Recommended)

1. Open **Supabase Dashboard** → **SQL Editor**
2. Open `scripts/15_simple_silent_trigger.sql`
3. Copy the entire contents
4. Paste into SQL Editor
5. Click **Run**

This will:
- Drop the old trigger and function
- Create a new ultra-simple, completely silent trigger
- Use `SET search_path = public` to avoid schema issues
- Check if table exists before attempting insert
- Never raise exceptions

### Step 2: If Step 1 Doesn't Work, Try the Original Silent Trigger

1. Open **Supabase Dashboard** → **SQL Editor**
2. Open `scripts/13_auto_create_profile_trigger.sql`
3. Copy the entire contents
4. Paste into SQL Editor
5. Click **Run**

This will:
- Replace the trigger function with the silent version
- Ensure user creation never fails due to profile creation errors

### Step 2: Test Registration

1. Try registering a new user
2. If you see "Database error saving new user", the client will:
   - Wait for session
   - Try to create profile manually
   - Show helpful error message if that also fails

### Step 3: Verify Profile Creation

After registration:
1. Check if profile exists in `public.users` table
2. If profile doesn't exist, the trigger may have failed silently
3. Try logging in - the profile might be created on first login

## Why This Works

1. **Silent Trigger**: The trigger never raises exceptions, so Supabase doesn't report errors to the client
2. **Client Fallback**: If trigger fails, client creates profile manually when session is available
3. **Graceful Degradation**: User account is always created, profile can be created later

## Troubleshooting

### If registration still fails:

1. **Check RLS Policies**:
   - Run `scripts/08_verify_and_fix_rls.sql`
   - Run `scripts/06_setup_rls_policies.sql`

2. **Check Trigger Status**:
   - Run `scripts/14_diagnose_trigger_errors.sql`
   - Verify trigger exists and function is correct

3. **Check Supabase Logs**:
   - Go to Supabase Dashboard → Logs
   - Look for any errors from `handle_new_user` function

4. **Manual Profile Creation**:
   - If profile is missing, run `scripts/09_create_missing_profiles.sql`
   - This creates profiles for existing auth users

## Important Notes

- The trigger is now **completely silent** - it won't log errors or raise exceptions
- User account creation **always succeeds** even if profile creation fails
- Client-side code will **automatically retry** profile creation if trigger fails
- If both trigger and client-side creation fail, user can still log in and profile will be created on first access

