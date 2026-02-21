# External Cron Job Setup - Run Every Hour

Since Vercel Hobby plan only allows once-daily cron jobs, we'll use an external service to run it every hour.

## Option 1: cron-job.org (Recommended - Free)

### Setup Steps:

1. **Go to**: https://cron-job.org
2. **Sign up** for a free account
3. **Create a new cron job**:
   - **Title**: "Class Reports - Every Hour"
   - **URL**: `https://your-project.vercel.app/api/cron/class-reports`
   - **Schedule**: `0 * * * *` (every hour)
   - **Request Method**: `POST`
   - **Request Headers**: 
     - Key: `Authorization`
     - Value: `Bearer YOUR_CRON_SECRET` (use the CRON_SECRET from your Vercel env vars)
   - **Status**: Active

4. **Save** the cron job

### Benefits:
- ✅ Free
- ✅ Runs every hour
- ✅ Reliable
- ✅ Easy to monitor

---

## Option 2: GitHub Actions (Free)

### Setup Steps:

1. **Create file**: `.github/workflows/class-reports.yml`

2. **Add this content**:
```yaml
name: Class Reports Cron

on:
  schedule:
    - cron: '0 * * * *'  # Every hour
  workflow_dispatch:  # Allow manual trigger

jobs:
  trigger-cron:
    runs-on: ubuntu-latest
    steps:
      - name: Call Vercel Cron Endpoint
        run: |
          curl -X POST \
            -H "Authorization: Bearer ${{ secrets.CRON_SECRET }}" \
            https://your-project.vercel.app/api/cron/class-reports
```

3. **Add secret to GitHub**:
   - Go to: Repository → Settings → Secrets and variables → Actions
   - Add secret: `CRON_SECRET` = (your CRON_SECRET value)

### Benefits:
- ✅ Free
- ✅ Runs every hour
- ✅ Integrated with your codebase

---

## Option 3: EasyCron (Free Tier)

1. **Go to**: https://www.easycron.com
2. **Sign up** for free account
3. **Create cron job**:
   - URL: `https://your-project.vercel.app/api/cron/class-reports`
   - Schedule: Every hour
   - Method: POST
   - Headers: `Authorization: Bearer YOUR_CRON_SECRET`

---

## Option 4: Upgrade to Vercel Pro

If you want to use Vercel's built-in cron:
- Upgrade to Vercel Pro ($20/month)
- Change schedule back to `0 * * * *` in `vercel.json`
- No external service needed

---

## Recommended: cron-job.org

**Why?**
- Easiest to set up
- Free tier is generous
- Reliable service
- Good monitoring dashboard

**Steps:**
1. Get your Vercel deployment URL (after deployment)
2. Get your CRON_SECRET from Vercel environment variables
3. Set up cron-job.org as described above

---

## After Setup

Once you set up the external cron:
1. You can remove or keep the cron in `vercel.json` (it won't run on Hobby plan anyway)
2. The external service will call your API endpoint every hour
3. Check logs in both Vercel and the cron service to monitor

---

## Testing

After setting up, test manually:
```bash
curl -X POST \
  -H "Authorization: Bearer YOUR_CRON_SECRET" \
  https://your-project.vercel.app/api/cron/class-reports
```

You should get a JSON response with the processing results.

