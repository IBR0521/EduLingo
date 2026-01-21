# Quick Deployment Guide

## ✅ What's Already Done
- ✅ Git repository initialized
- ✅ All files committed
- ✅ Vercel CLI installed locally
- ✅ Deployment configuration ready

## 🚀 Next Steps

### Step 1: Push to GitHub

**Option A: Create new repository on GitHub first**
1. Go to https://github.com/new
2. Create a new repository (e.g., `english-course-platform`)
3. **DO NOT** initialize with README
4. Copy the repository URL

**Option B: If repository already exists**
```bash
git remote add origin https://github.com/YOUR_USERNAME/YOUR_REPO.git
git push -u origin main
```

### Step 2: Deploy to Vercel

**Option A: Via Dashboard (Easiest)**
1. Go to https://vercel.com/new
2. Click "Import Git Repository"
3. Select your GitHub repository
4. Click "Deploy"
5. Add environment variables (see below)

**Option B: Via CLI**
```bash
npx vercel login
npx vercel --prod
```

### Step 3: Add Environment Variables in Vercel

Go to Vercel Dashboard → Your Project → Settings → Environment Variables

Add these variables:
```
NEXT_PUBLIC_SUPABASE_URL=your_supabase_url
NEXT_PUBLIC_SUPABASE_ANON_KEY=your_supabase_anon_key
SUPABASE_SERVICE_ROLE_KEY=your_service_role_key
NEXT_PUBLIC_VAPID_PUBLIC_KEY=your_vapid_public_key
VAPID_PRIVATE_KEY=your_vapid_private_key
VAPID_SUBJECT=mailto:your-email@example.com
```

### Step 4: Update Supabase Settings

1. Go to Supabase Dashboard → Authentication → URL Configuration
2. Set Site URL: `https://your-project.vercel.app`
3. Add Redirect URL: `https://your-project.vercel.app/auth/confirm`

## 🎯 Automated Deployment Script

You can also use the provided script:
```bash
./deploy.sh
```

This will guide you through the process.

