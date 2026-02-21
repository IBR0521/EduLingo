# Persistent Sessions Setup Guide

This guide explains how to configure the platform so users stay logged in until they explicitly log out.

## ✅ Implementation Status

The platform is now configured for persistent sessions. Users will **NOT** be logged out automatically and will remain logged in until they click the logout button.

## What Has Been Implemented

### 1. Automatic Session Refresh Hook ✅
- **Location**: `lib/auth-session-refresh.ts`
- **Function**: Refreshes session every 15 minutes automatically
- **Integration**: Used in `components/dashboard/dashboard-layout.tsx`
- **Features**:
  - Background refresh every 15 minutes
  - Refresh when user returns to tab (visibility change)
  - Handles errors gracefully

### 2. Middleware Session Refresh ✅
- **Location**: `middleware.ts`
- **Function**: Refreshes session on every request
- **Benefit**: Keeps session alive during active use

### 3. Long-Lived Cookies ✅
- **Location**: `lib/supabase/server.ts` and `middleware.ts`
- **Configuration**: Cookies set with 1-year expiration
- **Security**: 
  - `httpOnly` cookies (protected from JavaScript)
  - `secure` in production (HTTPS only)
  - `sameSite=lax` for cross-site protection

### 4. Dashboard Integration ✅
- **Location**: `components/dashboard/dashboard-layout.tsx`
- **Function**: Uses `useSessionRefresh` hook to keep sessions alive on all dashboard pages

## Supabase Dashboard Configuration

To ensure sessions persist indefinitely, you need to configure Supabase Auth settings:

### Step 1: Access Auth Settings
1. Go to your Supabase Dashboard: https://supabase.com/dashboard
2. Select your project (EduLingo)
3. Navigate to **Authentication** → **Settings**

### Step 2: Configure Session Duration
1. Find the **"JWT expiry"** or **"Access token expiry"** setting
2. Set it to a very long duration (recommended: **31536000 seconds** = 1 year)
   - Or set to **0** for no expiration (if supported by your Supabase plan)

### Step 3: Configure Refresh Token Settings
1. Find **"Refresh token expiry"** or **"Session duration"**
2. Set it to a very long duration (recommended: **31536000 seconds** = 1 year)
   - Or set to **0** for no expiration (if supported)

### Step 4: Enable Auto-Refresh (if available)
1. Look for **"Auto-refresh tokens"** or **"Token refresh"** option
2. Enable it to automatically refresh tokens before they expire

### Step 5: Save Changes
- Click **Save** to apply the changes

## How It Works

1. **On Login**: 
   - Session is created with long expiration
   - Session is immediately refreshed

2. **During Active Use**:
   - Middleware refreshes session on every request
   - Background hook refreshes every 15 minutes
   - Session expiration is continuously extended

3. **When User Returns**:
   - Session refreshes when tab becomes visible
   - Long-lived cookies ensure session persists

4. **Result**:
   - Users stay logged in indefinitely
   - Only explicit logout will end the session
   - Sessions persist across browser restarts
   - Sessions persist across device restarts

## Verification

To verify persistent sessions are working:

1. **Login Test**:
   - Log in to the platform
   - Wait 15+ minutes
   - Verify you're still logged in

2. **Browser Restart Test**:
   - Log in to the platform
   - Close the browser completely
   - Reopen the browser and navigate to the platform
   - Verify you're still logged in

3. **Tab Return Test**:
   - Log in to the platform
   - Switch to another tab for 20+ minutes
   - Return to the platform tab
   - Verify you're still logged in

## Security Considerations

While persistent sessions improve user experience, consider these security measures:

1. **Logout Button**: Always provide a clear logout option
2. **Session Monitoring**: Monitor for suspicious activity
3. **Device Management**: Consider adding "Active Sessions" management
4. **MFA**: Encourage users to enable Multi-Factor Authentication
5. **Secure Cookies**: Already configured with httpOnly and secure flags

## Troubleshooting

### Users Still Getting Logged Out

1. **Check Supabase Settings**:
   - Verify JWT expiry is set to a long duration
   - Check refresh token expiry settings

2. **Check Browser Settings**:
   - Ensure cookies are enabled
   - Check if browser is blocking third-party cookies
   - Verify browser isn't in private/incognito mode

3. **Check Network**:
   - Ensure stable internet connection
   - Check if firewall is blocking Supabase requests

4. **Check Console**:
   - Open browser DevTools → Console
   - Look for any session-related errors
   - Check Network tab for failed auth requests

### Session Refresh Not Working

1. **Verify Hook Integration**:
   - Check that `useSessionRefresh()` is called in dashboard layout
   - Verify hook is not being unmounted prematurely

2. **Check Middleware**:
   - Verify middleware is running (check logs)
   - Ensure middleware isn't blocking requests

3. **Check Supabase Connection**:
   - Verify environment variables are set correctly
   - Test Supabase connection directly

## Additional Notes

- Sessions will persist even if the user closes the browser
- Sessions will persist across device restarts
- Users must explicitly click logout to end their session
- The session refresh happens silently in the background
- No user interaction is required to maintain the session



