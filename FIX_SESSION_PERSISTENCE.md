# Fix: Sessions Not Persisting After Closing Browser

## The Problem
Users are getting logged out when they close the browser tab, even though we want them to stay logged in.

## Root Cause
Supabase JWT expiry settings in the dashboard might be too short. The code is configured correctly, but Supabase itself might be expiring tokens too quickly.

## Solution: Configure Supabase Dashboard

### Step 1: Go to Supabase Auth Settings

1. Go to: https://supabase.com/dashboard
2. Select your project
3. Go to **Authentication** → **Settings**

### Step 2: Configure JWT Expiry

1. Find **"JWT expiry"** or **"Access token expiry"** setting
2. Change it to: **31536000** (1 year in seconds)
   - Or set to maximum allowed value
3. **Save** the changes

### Step 3: Configure Refresh Token Settings

1. Find **"Refresh token expiry"** setting
2. Change it to: **31536000** (1 year in seconds)
   - Or set to maximum allowed value
3. **Save** the changes

### Step 4: Verify Cookie Settings

Make sure these are enabled:
- ✅ **"Enable email confirmations"** - Can be disabled if you want instant login
- ✅ Cookies should be enabled (default)

## How It Works Now

1. **Server-side cookies**: Set with 1-year expiration (already configured)
2. **Middleware**: Refreshes session on every request (already configured)
3. **Client-side refresh**: Refreshes every 15 minutes (already configured)
4. **Supabase JWT expiry**: Needs to be set to 1 year (YOU NEED TO DO THIS)

## After Configuration

Once you update Supabase settings:
1. Users will stay logged in even after closing browser
2. Sessions persist across browser restarts
3. Sessions persist across computer restarts
4. Users only log out when they click "Log out"

## Test It

1. Log in to your platform
2. Close the browser completely
3. Reopen browser and go to your platform
4. You should still be logged in! ✅

## If Still Not Working

If sessions still don't persist after configuring Supabase:

1. **Clear browser cookies** for your site
2. **Log in again** (this creates new cookies with correct expiration)
3. **Close browser and reopen** - should stay logged in

The issue is likely that old cookies were created with short expiration before we fixed the settings.

