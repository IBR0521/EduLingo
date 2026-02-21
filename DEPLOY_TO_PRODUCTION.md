# Deploy to Production - Step by Step Guide

## Quick Deployment Options

### Option 1: Deploy via Vercel Dashboard (Recommended for First Time)

1. **Go to Vercel Dashboard**
   - Visit: https://vercel.com
   - Sign in with your GitHub account

2. **Import Your Project**
   - Click "Add New..." → "Project"
   - Select your GitHub repository: `english-course-platform`
   - Click "Import"

3. **Configure Project Settings**
   - Framework Preset: **Next.js** (auto-detected)
   - Root Directory: `./` (default)
   - Build Command: `npm run build` (default)
   - Output Directory: `.next` (default)
   - Install Command: `npm install` (default)

4. **Add Environment Variables**
   Click "Environment Variables" and add:
   
   ```
   NEXT_PUBLIC_SUPABASE_URL
   = https://sxhbdfkaahoregjiiyyw.supabase.co
   
   NEXT_PUBLIC_SUPABASE_ANON_KEY
   = [Your Supabase Anon Key - get from Supabase Dashboard]
   
   SUPABASE_SERVICE_ROLE_KEY
   = [Your Supabase Service Role Key - get from Supabase Dashboard]
   
   CRON_SECRET
   = [Any random secret string for cron job security]
   ```
   
   **Important:** Select all environments: Production, Preview, Development

5. **Deploy**
   - Click "Deploy"
   - Wait for build to complete (2-5 minutes)
   - Your site will be live at: `https://your-project.vercel.app`

---

### Option 2: Deploy via Vercel CLI (Alternative)

1. **Install Vercel CLI** (if not already installed)
   ```bash
   npm install -g vercel
   ```

2. **Login to Vercel**
   ```bash
   vercel login
   ```

3. **Deploy**
   ```bash
   vercel
   ```
   
   Follow the prompts:
   - Link to existing project? **Yes** (if you have one) or **No** (to create new)
   - Project name: `english-course-platform`
   - Directory: `./`
   - Override settings? **No**

4. **Add Environment Variables**
   ```bash
   vercel env add NEXT_PUBLIC_SUPABASE_URL
   vercel env add NEXT_PUBLIC_SUPABASE_ANON_KEY
   vercel env add SUPABASE_SERVICE_ROLE_KEY
   vercel env add CRON_SECRET
   ```

5. **Deploy to Production**
   ```bash
   vercel --prod
   ```

---

## Before Deploying - Commit Your Changes

You have uncommitted changes. Let's commit them:

```bash
# Stage all changes
git add .

# Commit with descriptive message
git commit -m "Fix teacher dashboard to use real database data instead of mock data"

# Push to GitHub (this will trigger automatic Vercel deployment if connected)
git push origin main
```

---

## Environment Variables Setup

### Get Your Supabase Keys

1. Go to: https://supabase.com/dashboard
2. Select your project
3. Go to **Settings** → **API**
4. Copy:
   - **Project URL** → `NEXT_PUBLIC_SUPABASE_URL`
   - **anon public** key → `NEXT_PUBLIC_SUPABASE_ANON_KEY`
   - **service_role** key → `SUPABASE_SERVICE_ROLE_KEY` (⚠️ Keep this secret!)

### Generate CRON_SECRET

Use any random string:
```bash
# Option 1: Use openssl
openssl rand -base64 32

# Option 2: Use online generator
# Visit: https://randomkeygen.com/
```

---

## Post-Deployment Checklist

- [ ] Environment variables are set in Vercel
- [ ] Site is accessible at your Vercel URL
- [ ] Can log in with existing account
- [ ] Can register new account
- [ ] Teacher dashboard shows real data (not mock data)
- [ ] Database connection works
- [ ] Cron job is configured (check Vercel dashboard → Crons)

---

## Automatic Deployments

Once connected to GitHub:
- ✅ Every push to `main` branch → Production deployment
- ✅ Every push to other branches → Preview deployment
- ✅ Pull requests → Preview deployment

**No manual deployment needed after initial setup!**

---

## Troubleshooting

### Build Fails
- Check build logs in Vercel dashboard
- Ensure all dependencies are in `package.json`
- Check for TypeScript errors: `npm run build` locally

### Environment Variables Not Working
- Verify they're set in Vercel dashboard
- Make sure they're added to **Production** environment
- Redeploy after adding variables

### Database Connection Issues
- Verify Supabase URL and keys are correct
- Check Supabase project is active
- Verify RLS policies allow access

### Cron Job Not Running
- Check `vercel.json` is committed to GitHub
- Verify cron path: `/api/cron/class-reports`
- Check Vercel dashboard → Crons tab

---

## Your Deployment URL

After deployment, your site will be available at:
- **Production**: `https://your-project-name.vercel.app`
- **Custom Domain**: (if configured) `https://yourdomain.com`

---

## Next Steps After Deployment

1. **Test the platform** - Create accounts, test features
2. **Set up custom domain** (optional) - In Vercel dashboard → Settings → Domains
3. **Monitor deployments** - Check Vercel dashboard for build status
4. **Set up monitoring** - Use Vercel Analytics (built-in)

---

## Need Help?

- Vercel Docs: https://vercel.com/docs
- Supabase Docs: https://supabase.com/docs
- Check deployment logs in Vercel dashboard

