# Troubleshooting 404 Error on Vercel

## You DON'T Need a Domain!
Vercel automatically provides a free subdomain like:
- `your-project.vercel.app`
- `your-project-xxxxx.vercel.app`

## Common Causes of 404 Error

### 1. **Build Failed**
- Check Vercel Dashboard → Deployments → Latest deployment
- Look for "Error" status
- Check build logs for errors

### 2. **Missing Environment Variables**
The build might succeed but the app crashes at runtime if env vars are missing.

**Required Variables:**
- `NEXT_PUBLIC_SUPABASE_URL`
- `NEXT_PUBLIC_SUPABASE_ANON_KEY`
- `SUPABASE_SERVICE_ROLE_KEY`
- `CRON_SECRET`

### 3. **Wrong URL**
- Don't use deployment ID URLs
- Use the main project URL from Vercel dashboard

### 4. **Deployment Still Building**
- Wait 2-5 minutes for build to complete
- Check status in Vercel dashboard

## How to Fix

### Step 1: Check Deployment Status
1. Go to: https://vercel.com/dashboard
2. Click your project
3. Go to "Deployments" tab
4. Check the latest deployment:
   - ✅ **Ready** = Success (use the URL shown)
   - 🔄 **Building** = Wait for it
   - ❌ **Error** = Check logs below

### Step 2: If Status is "Error"
1. Click on the failed deployment
2. Click "View Function Logs" or "Build Logs"
3. Look for error messages like:
   - "Environment variable not found"
   - "Build failed"
   - "TypeScript errors"

### Step 3: Fix Common Issues

**If missing environment variables:**
1. Go to Settings → Environment Variables
2. Add all 4 required variables
3. Select: Production, Preview, Development
4. Redeploy

**If build errors:**
1. Check build logs
2. Fix the errors in your code
3. Push again to trigger new deployment

### Step 4: Get the Correct URL
1. In Vercel dashboard → Your project
2. Look at the top - you'll see your URL
3. It should be: `https://edu-lingo.vercel.app` or similar
4. Click "Visit" button to open it

## Quick Checklist

- [ ] Check deployment status in Vercel dashboard
- [ ] Verify all 4 environment variables are set
- [ ] Check build logs for errors
- [ ] Use the correct URL from Vercel dashboard
- [ ] Wait for build to complete (if still building)

## Still Getting 404?

Share:
1. What does the Vercel dashboard show? (Ready/Building/Error)
2. What URL are you trying to access?
3. Any error messages from build logs?

