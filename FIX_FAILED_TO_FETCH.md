# Fix "Failed to Fetch" Error

## 🔴 Problem
Getting "Failed to fetch" when trying to log in or register on your deployed Vercel site.

## ✅ Solution: Configure Supabase to Allow Your Vercel Domain

### Step 1: Get Your Vercel URL

1. Go to **Vercel Dashboard**: https://vercel.com/dashboard
2. Click on your **EduLingo** project
3. Copy your **production URL** (e.g., `https://edulingo.vercel.app` or `https://v0-english-course-platform-xxxxx.vercel.app`)

### Step 2: Configure Supabase URL Settings

1. Go to **Supabase Dashboard**: https://supabase.com/dashboard
2. Select your project: `qlopkllkiuqvbdiqbrvp`
3. Go to **Authentication** → **URL Configuration**

4. **Set Site URL**:
   - Replace the current Site URL with your Vercel URL
   - Example: `https://your-project.vercel.app`

5. **Add Redirect URLs**:
   - Click **Add URL**
   - Add: `https://your-project.vercel.app/auth/confirm`
   - Add: `https://your-project.vercel.app/**` (wildcard for all routes)
   - Also add your localhost for development: `http://localhost:3000/**`

6. **Click Save**

### Step 3: Verify Environment Variables in Vercel

Make sure these are set in **Vercel Dashboard** → **Settings** → **Environment Variables**:

✅ `NEXT_PUBLIC_SUPABASE_URL` = `https://qlopkllkiuqvbdiqbrvp.supabase.co`
✅ `NEXT_PUBLIC_SUPABASE_ANON_KEY` = (your anon key)
✅ `SUPABASE_SERVICE_ROLE_KEY` = (your service role key)

### Step 4: Check Supabase Project Settings

1. Go to **Supabase Dashboard** → **Settings** → **API**
2. Verify your **Project URL** is correct
3. Check that **API keys** are active

### Step 5: Redeploy on Vercel

After updating Supabase settings:
1. Go to **Vercel Dashboard** → Your Project
2. **Deployments** tab
3. Click **Redeploy** on the latest deployment

## 🔍 Additional Troubleshooting

### Check Browser Console

1. Open your Vercel site
2. Press `F12` to open Developer Tools
3. Go to **Console** tab
4. Try to log in
5. Look for error messages - they will tell you exactly what's wrong

### Common Errors and Fixes

**Error: "Failed to fetch"**
- ✅ Supabase URL not configured in Supabase Dashboard
- ✅ CORS issue - add Vercel URL to Supabase allowed URLs

**Error: "Invalid API key"**
- ✅ Check environment variables in Vercel are correct
- ✅ Make sure `NEXT_PUBLIC_SUPABASE_ANON_KEY` is set

**Error: "Network request failed"**
- ✅ Check if Supabase project is active (not paused)
- ✅ Verify Supabase URL is correct

### Test Connection

You can test if Supabase is accessible from your Vercel domain:

1. Open browser console on your Vercel site
2. Run this command:
```javascript
fetch('https://qlopkllkiuqvbdiqbrvp.supabase.co/rest/v1/', {
  headers: {
    'apikey': 'YOUR_ANON_KEY',
    'Authorization': 'Bearer YOUR_ANON_KEY'
  }
}).then(r => console.log('Success:', r.status)).catch(e => console.error('Error:', e))
```

If this fails, it's a CORS/URL configuration issue in Supabase.

## 📝 Quick Checklist

- [ ] Vercel URL added to Supabase Site URL
- [ ] Vercel URL added to Supabase Redirect URLs
- [ ] Environment variables set in Vercel
- [ ] Supabase project is active (not paused)
- [ ] Redeployed on Vercel after changes

## 🆘 Still Not Working?

If it's still not working after these steps:

1. **Check Supabase Project Status**:
   - Make sure your Supabase project is not paused
   - Free tier projects can pause after inactivity

2. **Verify Network Access**:
   - Try accessing Supabase directly: `https://qlopkllkiuqvbdiqbrvp.supabase.co`
   - If this doesn't load, your Supabase project might be paused

3. **Check Vercel Logs**:
   - Go to Vercel Dashboard → Your Project → **Logs**
   - Look for any errors during build or runtime

4. **Test Locally First**:
   - Make sure it works on `localhost:3000` with `.env.local`
   - This confirms the code is correct

