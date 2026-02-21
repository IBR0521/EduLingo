# Vercel Automatic Deployment Guide

## How Automatic Deployment Works

Since you've connected GitHub to Vercel, here's how it works:

### 1. **Automatic Deployment Flow**

```
You make changes → Push to GitHub → Vercel detects changes → Builds & Deploys automatically
```

**Step by step:**
1. You edit files in your project
2. You commit and push to GitHub:
   ```bash
   git add .
   git commit -m "Your changes"
   git push
   ```
3. Vercel automatically detects the push
4. Vercel builds your project
5. Vercel deploys the new version
6. Your site is updated! 🎉

### 2. **What Happens Automatically**

✅ **Every push to main/master branch** → Production deployment  
✅ **Every push to other branches** → Preview deployment  
✅ **Pull requests** → Preview deployment for testing

### 3. **Environment Variables Setup**

You need to add environment variables in Vercel dashboard:

1. Go to your Vercel project dashboard
2. Click **Settings** → **Environment Variables**
3. Add these variables:

   ```
   NEXT_PUBLIC_SUPABASE_URL
   = https://sxhbdfkaahoregjiiyyw.supabase.co
   
   NEXT_PUBLIC_SUPABASE_ANON_KEY
   = your-anon-key-here
   
   SUPABASE_SERVICE_ROLE_KEY
   = your-service-role-key-here
   
   CRON_SECRET
   = any-random-secret-string
   ```

4. Select environments: **Production**, **Preview**, and **Development**
5. Click **Save**

### 4. **Cron Job Setup**

The `vercel.json` file already includes the cron job configuration:

```json
{
  "crons": [
    {
      "path": "/api/cron/class-reports",
      "schedule": "0 * * * *"
    }
  ]
}
```

This means:
- **Path**: `/api/cron/class-reports` (your API endpoint)
- **Schedule**: `0 * * * *` (runs every hour at minute 0)

**After you push this file to GitHub:**
- Vercel will automatically set up the cron job
- It will run every hour automatically
- No manual setup needed!

### 5. **Deployment Checklist**

Before pushing to GitHub, make sure:

- [ ] All code changes are committed
- [ ] `.env.local` is NOT committed (it's in `.gitignore` - good!)
- [ ] Environment variables are set in Vercel dashboard
- [ ] `vercel.json` includes cron configuration
- [ ] Database functions are run in Supabase (SQL scripts)

### 6. **How to Deploy Updates**

**Simple workflow:**

```bash
# 1. Make your changes
# Edit files...

# 2. Stage changes
git add .

# 3. Commit changes
git commit -m "Add class reporting system"

# 4. Push to GitHub
git push

# 5. Vercel automatically deploys!
# Check Vercel dashboard to see deployment progress
```

### 7. **Checking Deployment Status**

1. Go to your Vercel dashboard
2. Click on your project
3. See the **Deployments** tab
4. You'll see:
   - ✅ **Ready** = Successfully deployed
   - 🔄 **Building** = Currently deploying
   - ❌ **Error** = Something went wrong (check logs)

### 8. **Viewing Deployment Logs**

If something goes wrong:

1. Go to Vercel dashboard → Your project
2. Click on a deployment
3. Click **View Function Logs** or **Build Logs**
4. Check for errors

### 9. **Testing the Cron Job**

After deployment:

1. Wait for the next hour (or check Vercel dashboard for cron execution)
2. Check Vercel dashboard → **Crons** tab
3. You should see execution logs
4. Or test manually:
   ```
   https://your-domain.vercel.app/api/cron/class-reports
   ```

### 10. **Important Notes**

⚠️ **Environment Variables:**
- Must be set in Vercel dashboard (not just `.env.local`)
- `.env.local` only works for local development
- Vercel uses its own environment variables

⚠️ **Database Functions:**
- SQL scripts must be run in Supabase manually
- They don't deploy automatically
- Run `scripts/58_class_completion_reporting.sql` in Supabase SQL Editor

⚠️ **Cron Jobs:**
- Only work on Production deployments (not preview)
- Free tier: Limited cron executions
- Pro tier: More cron executions

### 11. **Troubleshooting**

**Problem: Deployment fails**
- Check build logs in Vercel
- Make sure all dependencies are in `package.json`
- Check for TypeScript errors

**Problem: Cron job not running**
- Verify `vercel.json` is committed to GitHub
- Check Vercel dashboard → Crons tab
- Make sure you're on Production deployment

**Problem: Environment variables not working**
- Verify they're set in Vercel dashboard
- Make sure they're added to Production environment
- Redeploy after adding variables

### 12. **Quick Start Commands**

```bash
# Check current status
git status

# Add all changes
git add .

# Commit changes
git commit -m "Description of changes"

# Push to GitHub (triggers Vercel deployment)
git push

# Check deployment in browser
# Go to: https://your-project.vercel.app
```

## Summary

✅ **Automatic Deployment**: Already set up! Just push to GitHub  
✅ **Cron Job**: Configured in `vercel.json` - will work after deployment  
✅ **Environment Variables**: Need to add in Vercel dashboard  
✅ **Database Functions**: Run SQL scripts in Supabase manually  

**Next Steps:**
1. Add environment variables in Vercel dashboard
2. Push `vercel.json` to GitHub (already done!)
3. Run SQL script in Supabase
4. Push any code changes to GitHub
5. Vercel will automatically deploy!

That's it! Your updates will deploy automatically every time you push to GitHub. 🚀



