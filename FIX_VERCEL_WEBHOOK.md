    # Fix Vercel Webhook Issue

## Problem
GitHub is connected to Vercel, but the webhook is empty. This means Vercel won't detect when you push code.

## Solution: Reconnect Repository to Regenerate Webhook

### Step 1: Disconnect Repository in Vercel

1. Go to **Vercel Dashboard** → Your Project
2. Click **Settings** (gear icon)
3. Go to **Git** section
4. Find the connected repository
5. Click **"Disconnect"** or **"Remove"** button
6. Confirm the disconnection

### Step 2: Reconnect Repository

1. In the same **Git** settings page
2. Click **"Connect Git Repository"** button
3. Select **GitHub** as the Git provider
4. You might need to authorize Vercel again
5. Find and select your repository: **`IBR0521/EduLingo`**
6. Select branch: **`main`**
7. Click **"Connect"** or **"Import"**

### Step 3: Verify Webhook is Created

After reconnecting:

1. Go to **GitHub** → Your Repository: `https://github.com/IBR0521/EduLingo`
2. Click **Settings** (top right of repository)
3. Click **Webhooks** (left sidebar)
4. You should now see a webhook from Vercel
5. The webhook URL should look like: `https://api.vercel.com/v1/integrations/deploy/...`

### Step 4: Test the Webhook

1. Make a small change:
   ```bash
   echo "# Webhook test" >> README.md
   git add README.md
   git commit -m "Test webhook"
   git push
   ```

2. Check GitHub Webhooks:
   - Go to Settings → Webhooks
   - Click on the Vercel webhook
   - Check "Recent Deliveries" tab
   - You should see a new delivery after pushing

3. Check Vercel Dashboard:
   - Go to Deployments tab
   - You should see a new deployment starting

## Alternative: Manual Webhook Creation (If Reconnect Doesn't Work)

If reconnecting doesn't create the webhook automatically:

### Get Webhook URL from Vercel

1. Go to Vercel Dashboard → Project → Settings → Git
2. Look for webhook URL or integration details
3. Copy the webhook URL

### Create Webhook in GitHub

1. Go to GitHub → Repository → Settings → Webhooks
2. Click **"Add webhook"**
3. Paste the webhook URL from Vercel
4. Content type: **application/json**
5. Events: Select **"Just the push event"** or **"Let me select individual events"** and choose:
   - ✅ Push
   - ✅ Pull request (optional)
6. Click **"Add webhook"**

## Verify Everything Works

After fixing the webhook:

1. **Push a test commit:**
   ```bash
   echo "<!-- Test -->" >> app/layout.tsx
   git add app/layout.tsx
   git commit -m "Test webhook connection"
   git push
   ```

2. **Check GitHub Webhook:**
   - Settings → Webhooks → Click on Vercel webhook
   - Recent Deliveries should show a new delivery
   - Status should be "200 OK"

3. **Check Vercel:**
   - Deployments tab should show a new deployment
   - Status should change from "Building" to "Ready"

## Troubleshooting

### Webhook Still Not Working?

1. **Check Vercel Integration:**
   - Vercel Dashboard → Settings → Integrations
   - Make sure GitHub integration is installed
   - If not, click "Add Integration" → "GitHub"

2. **Check GitHub Permissions:**
   - GitHub → Settings → Applications → Authorized OAuth Apps
   - Find "Vercel"
   - Make sure it has access to your repository

3. **Check Repository Visibility:**
   - If repository is private, make sure Vercel has access
   - Vercel Dashboard → Settings → Git → Check repository access

4. **Manual Trigger:**
   - Vercel Dashboard → Deployments → "Deploy" → "Deploy Latest Commit"
   - This will deploy even without webhook (but webhook is needed for auto-deploy)

## Expected Result

After fixing:
- ✅ Webhook appears in GitHub Settings → Webhooks
- ✅ Webhook shows recent deliveries when you push
- ✅ Vercel automatically deploys when you push to GitHub
- ✅ New deployments appear in Vercel Dashboard



