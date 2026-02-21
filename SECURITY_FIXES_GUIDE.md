# Security Fixes Guide

This guide explains the security issues that were fixed and how to enable additional security features.

## Issues Fixed

### 1. Functions with Mutable search_path ✅

**Problem:** Functions without a fixed `search_path` are vulnerable to search path manipulation attacks, where an attacker could potentially redirect function calls to malicious code.

**Solution:** All functions have been updated to include `SET search_path = public` in their definition.

**Fixed Functions:**
- `get_linked_student_ids()`
- `update_user_progress()`
- `check_attendance_complete()`
- `check_grading_complete()`
- `get_main_teacher_for_group()`
- `generate_class_completion_report()`
- `process_ended_classes()`
- `update_forum_topic_stats()`

**How to Apply:**
Run the script `scripts/60_fix_security_issues.sql` in your Supabase SQL Editor.

### 2. Overly Permissive RLS Policy on pending_students ✅

**Problem:** The `pending_students` table had a policy that allowed the service role unrestricted access with `USING (true)` and `WITH CHECK (true)`, effectively bypassing row-level security.

**Solution:** The policy has been replaced with more restrictive policies:
- Service role can manage all pending students (for system operations)
- Authenticated users can only read pending students they created
- Teachers can read pending students for their groups

**How to Apply:**
This is included in `scripts/60_fix_security_issues.sql`.

### 3. Leaked Password Protection ⚠️

**Problem:** Supabase Auth's leaked password protection (HaveIBeenPwned.org integration) is currently disabled.

**Solution:** This must be enabled manually in the Supabase Dashboard.

**How to Enable:**

1. Go to your Supabase Dashboard: https://supabase.com/dashboard
2. Select your project (EduLingo)
3. Navigate to **Authentication** in the left sidebar
4. Click on **Settings** (or **Policies** → **Settings**)
5. Scroll down to the **"Password Protection"** section
6. Find the **"Leaked Password Protection"** or **"HaveIBeenPwned"** option
7. Toggle it **ON** or check the box to enable it
8. Click **Save** or the changes will auto-save

**Alternative Path (if the above doesn't work):**
1. Go to **Authentication** → **Policies**
2. Look for **"Password Requirements"** or **"Security"** section
3. Enable **"Check passwords against HaveIBeenPwned database"**

**Note:** The exact location may vary slightly depending on your Supabase dashboard version. If you can't find it:
- Look for any security or password-related settings in the Authentication section
- Check the **Project Settings** → **Auth** section
- The feature might be under **"Password Requirements"** or **"Security Settings"**

**What This Does:**
- Checks user passwords against the HaveIBeenPwned.org database
- Prevents users from using passwords that have been compromised in data breaches
- Enhances overall security by ensuring users don't reuse compromised passwords

**Note:** This feature requires an active internet connection to query the HaveIBeenPwned API. Supabase handles this automatically when enabled.

## Verification

After running `scripts/60_fix_security_issues.sql`, you can verify the fixes:

1. **Check Functions:**
   ```sql
   SELECT proname, proconfig 
   FROM pg_proc 
   WHERE pronamespace = 'public'::regnamespace 
     AND proname IN ('get_linked_student_ids', 'update_user_progress', ...);
   ```
   All functions should have `search_path=public` in their `proconfig`.

2. **Check RLS Policies:**
   ```sql
   SELECT tablename, policyname, qual, with_check
   FROM pg_policies 
   WHERE tablename = 'pending_students';
   ```
   No policy should have `qual = 'true'` or `with_check = 'true'` for INSERT/UPDATE/DELETE operations.

3. **Check Password Protection:**
   - Go to Supabase Dashboard → Authentication → Settings
   - Verify that "Leaked Password Protection" is enabled

## Additional Security Recommendations

1. **Enable MFA (Multi-Factor Authentication):**
   - Go to Authentication → Settings
   - Enable MFA for enhanced account security

2. **Review RLS Policies Regularly:**
   - Periodically audit your RLS policies
   - Ensure no overly permissive policies exist
   - Test policies with different user roles

3. **Monitor Security Alerts:**
   - Check Supabase Dashboard regularly for security warnings
   - Address any new security issues promptly

4. **Keep Dependencies Updated:**
   - Regularly update your application dependencies
   - Monitor for security vulnerabilities in packages

5. **Use Environment Variables:**
   - Never commit API keys or secrets to version control
   - Use environment variables for sensitive configuration

## Support

If you encounter any issues while applying these fixes, please:
1. Check the Supabase logs for error messages
2. Verify that all required tables and functions exist
3. Ensure you have the necessary permissions to modify functions and policies

