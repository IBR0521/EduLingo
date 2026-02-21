# Fix Vercel Git Connection

## If Repository is NOT Connected

### Option 1: Reconnect via General Settings

1. **Go to Settings → General** (in the left sidebar)
2. Look for **"Git Repository"** section
3. If it says "Not connected" or shows no repository:
   - Click **"Connect Git Repository"** or **"Change"**
   - Select **GitHub**
   - Authorize Vercel (if needed)
   - Select your repository: `IBR0521/EduLingo`
   - Click **"Connect"**

### Option 2: Re-import the Project

1. **Go to Vercel Dashboard** (main page)
2. Click **"Add New..." → "Project"**
3. Select **"Import Git Repository"**
4. Choose **GitHub**
5. Select: `IBR0521/EduLingo`
6. Configure settings (if needed)
7. Add environment variables
8. Click **"Deploy"**

### Option 3: Use Deploy Hooks (Manual Deployment)

If automatic deployment isn't working, you can use Deploy Hooks:

1. **Go to Settings → Git → Deploy Hooks**
2. Create a new hook:
   - **Name**: `Manual Deploy`
   - **Branch**: `main`
3. Click **"Create Hook"**
4. Copy the hook URL
5. Use it to trigger deployments manually

---

## Check Current Connection Status

1. **Go to Settings → General**
2. Look for **"Git Repository"** section
3. It should show:
   - Repository: `IBR0521/EduLingo`
   - Provider: `GitHub`
   - Production Branch: `main`

If it's not connected, follow Option 1 above.

---

## After Connecting

Once connected:
- ✅ Every `git push` will trigger automatic deployment
- ✅ You'll see deployments in the "Deployments" tab
- ✅ No manual deployment needed!

---

## Troubleshooting

**Problem: Can't see repository in list**
- Make sure you're logged into GitHub in Vercel
- Check that Vercel has access to your GitHub account
- Go to GitHub → Settings → Applications → Authorized OAuth Apps
- Verify Vercel is authorized

**Problem: Repository shows but deployments don't trigger**
- Check Settings → Git → "deployment_status Events" is enabled (should be blue)
- Check Settings → Git → "repository_dispatch Events" is enabled (should be blue)
- Try pushing again: `git push origin main`

**Problem: Still not working**
- Disconnect and reconnect the repository
- Or create a new project and import the repository fresh

