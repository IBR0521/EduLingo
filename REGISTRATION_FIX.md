# Registration and Profile Creation Fix

## Problem
- Profile creation fails with "Session available: false"
- All accounts default to "student" role
- RLS policies block profile creation when session isn't available

## Solution 1: Database Trigger (RECOMMENDED)

The best solution is to use a database trigger that automatically creates the profile when a user signs up. This bypasses RLS entirely.

### Steps:

1. **Run the trigger script in Supabase:**
   - Open Supabase Dashboard → SQL Editor
   - Run `scripts/13_auto_create_profile_trigger.sql`
   - This creates a trigger that automatically creates profiles with the correct role

2. **How it works:**
   - When a user signs up in `auth.users`, the trigger fires
   - It reads the `role` from `raw_user_meta_data` (set during signup)
   - Creates the profile in `public.users` with the correct role
   - Uses `SECURITY DEFINER` to bypass RLS

3. **Benefits:**
   - No session timing issues
   - No RLS policy conflicts
   - Automatic profile creation
   - Correct role is always used

## Solution 2: Improved Client-Side (Fallback)

If you can't use the trigger, the registration form now:
- Checks if profile already exists (created by trigger)
- Updates role if it doesn't match
- Retries profile creation with better session handling
- Includes role in signup metadata

## How to Use

### Option A: Use Database Trigger (Best)

1. Run `scripts/13_auto_create_profile_trigger.sql` in Supabase
2. The registration form will automatically work
3. Profiles will be created with the correct role from metadata

### Option B: Fix RLS Policy Only

1. Run `scripts/12_fix_users_insert_policy.sql` in Supabase
2. Ensure session is available before creating profile
3. The improved retry logic should handle session timing

## Verification

After running the trigger script, test registration:
1. Select a role (e.g., "Main Teacher")
2. Fill in the form and submit
3. Check browser console - you should see:
   - "Profile already exists (created by trigger)"
   - Or "Profile created successfully" with correct role
4. Verify in Supabase that the profile has the correct role

## Troubleshooting

If profiles still default to "student":
- Check browser console for role logs
- Verify the trigger is running (check Supabase logs)
- Ensure role is in signup metadata (check `auth.users.raw_user_meta_data`)
- Run the trigger script again to ensure it's set up








