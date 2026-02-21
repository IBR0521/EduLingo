# Set Up Cron Job - Step by Step

## Your Cron Job Details

### Step 1: Go to cron-job.org
Visit: https://cron-job.org and sign up (free account)

### Step 2: Create New Cron Job

Click "Create cronjob" and fill in:

**Basic Settings:**
- **Title**: `Class Reports - Hourly`
- **URL**: `https://YOUR-PROJECT.vercel.app/api/cron/class-reports`
  - Replace `YOUR-PROJECT` with your actual Vercel project name
  - Example: `https://edu-lingo.vercel.app/api/cron/class-reports`

**Schedule:**
- **Schedule Type**: Select "Every hour"
- OR use cron expression: `0 * * * *`

**Request Settings:**
- **Request Method**: `POST`
- **Request Headers**: 
  - Click "Add Header"
  - **Key**: `Authorization`
  - **Value**: `Bearer YOUR_CRON_SECRET`
    - Replace `YOUR_CRON_SECRET` with the actual value from Vercel

**Advanced (Optional):**
- **Status**: Active ✅
- **Notifications**: Enable if you want email alerts on failures

### Step 3: Save and Test

1. Click "Create cronjob"
2. Wait a few minutes
3. Check the "Execution Log" tab to see if it ran successfully
4. You should see a successful response

### Step 4: Verify It's Working

After the first run, check:
- Vercel logs: Go to your Vercel project → Logs → See if the API was called
- cron-job.org logs: See execution history
- Your database: Check if any class reports were processed

## Troubleshooting

**If you get 401 Unauthorized:**
- Double-check the CRON_SECRET value in Vercel
- Make sure the header is exactly: `Bearer YOUR_CRON_SECRET` (with space after Bearer)

**If you get 404 Not Found:**
- Verify your Vercel URL is correct
- Make sure the deployment is live

**If you get 500 Error:**
- Check Vercel logs for details
- Verify SUPABASE_SERVICE_ROLE_KEY is set in Vercel

## Test Manually First

Before setting up the cron, test the endpoint manually:

```bash
curl -X POST \
  -H "Authorization: Bearer YOUR_CRON_SECRET" \
  https://YOUR-PROJECT.vercel.app/api/cron/class-reports
```

You should get a JSON response like:
```json
{
  "success": true,
  "message": "Class reports processed",
  "processed": 0,
  "successful": 0,
  "errors": 0,
  "timestamp": "2024-..."
}
```

