# Quick Deploy Steps - Get Your Platform Online Now! 🚀

## Step 1: Commit Your Changes

Open your terminal and run:

```bash
cd /Users/ibrohimrahmat/Downloads/english-course-platform

# Remove git lock if it exists
rm -f .git/index.lock

# Stage all changes
git add .

# Commit the changes
git commit -m "Fix teacher dashboard to use real database data, remove mock data"

# Push to GitHub
git push origin main
```

---

## Step 2: Deploy to Vercel

### Option A: Via Vercel Dashboard (Easiest)

1. **Go to Vercel**: https://vercel.com
2. **Sign in** with your GitHub account
3. **Click "Add New..." → "Project"**
4. **Select your repository**: `IBR0521/EduLingo`
5. **Configure**:
   - Framework: Next.js (auto-detected)
   - Root Directory: `./`
   - Build Command: `npm run build`
   - Output Directory: `.next`
6. **Add Environment Variables** (Click "Environment Variables"):
   
   ```
   NEXT_PUBLIC_SUPABASE_URL
   = https://sxhbdfkaahoregjiiyyw.supabase.co
   
   NEXT_PUBLIC_SUPABASE_ANON_KEY
   = [Get from Supabase Dashboard → Settings → API → anon public key]
   
   SUPABASE_SERVICE_ROLE_KEY
   = [Get from Supabase Dashboard → Settings → API → service_role key]
   
   CRON_SECRET
   = [Any random string, e.g., "my-secret-cron-key-12345"]
   ```
   
   **Important:** Select all environments (Production, Preview, Development)

7. **Click "Deploy"**
8. **Wait 2-5 minutes** for build to complete
9. **Your site is live!** 🎉

### Option B: Via Vercel CLI

```bash
# Install Vercel CLI (if not installed)
npm install -g vercel

# Login
vercel login

# Deploy
vercel

# Follow prompts, then add environment variables:
vercel env add NEXT_PUBLIC_SUPABASE_URL
vercel env add NEXT_PUBLIC_SUPABASE_ANON_KEY
vercel env add SUPABASE_SERVICE_ROLE_KEY
vercel env add CRON_SECRET

# Deploy to production
vercel --prod
```

---

## Step 3: Get Your Supabase Keys

1. Go to: https://supabase.com/dashboard
2. Select your project
3. Go to **Settings** → **API**
4. Copy:
   - **Project URL** → Use for `NEXT_PUBLIC_SUPABASE_URL`
   - **anon public** key → Use for `NEXT_PUBLIC_SUPABASE_ANON_KEY`
   - **service_role** key → Use for `SUPABASE_SERVICE_ROLE_KEY` ⚠️ Keep secret!

---

## Step 4: Test Your Deployment

After deployment completes:

1. Visit your Vercel URL: `https://your-project.vercel.app`
2. Test registration: Create a new account
3. Test login: Sign in with existing account
4. Test teacher dashboard: Should show real data (not mock data)
5. Check all features work

---

## Automatic Deployments

Once connected:
- ✅ Every `git push` to `main` → Auto-deploys to production
- ✅ No manual deployment needed after initial setup!

---

## Troubleshooting

**Build fails?**
- Check Vercel build logs
- Run `npm run build` locally to test

**Environment variables not working?**
- Make sure they're set in Vercel dashboard
- Select "Production" environment
- Redeploy after adding variables

**Database connection issues?**
- Verify Supabase keys are correct
- Check Supabase project is active

---

## Your Site Will Be Live At:

After deployment: `https://your-project-name.vercel.app`

You can also add a custom domain in Vercel dashboard → Settings → Domains

---

## That's It! 🎉

Your platform will be online and accessible to everyone!

