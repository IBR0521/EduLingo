# Test Your Cron Endpoint

## Quick Test Methods

### Method 1: Using Browser (Easiest)

1. **Get your Vercel URL** (e.g., `https://edu-lingo.vercel.app`)
2. **Get your CRON_SECRET** from Vercel → Settings → Environment Variables
3. **Open browser and go to:**
   ```
   https://YOUR-URL.vercel.app/api/cron/class-reports
   ```
   - This uses GET method (the endpoint supports both GET and POST)
   - You should see a JSON response

### Method 2: Using curl (Terminal)

Run this command (replace with your values):

```bash
curl -X POST \
  -H "Authorization: Bearer YOUR_CRON_SECRET" \
  https://YOUR-URL.vercel.app/api/cron/class-reports
```

### Method 3: Using the Test Script

```bash
cd /Users/ibrohimrahmat/Downloads/english-course-platform
./test-cron.sh YOUR_VERCEL_URL YOUR_CRON_SECRET
```

## Expected Response

If working correctly, you should see:

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

## Common Issues

### 401 Unauthorized
- **Problem**: CRON_SECRET doesn't match
- **Fix**: Check the value in Vercel environment variables
- **Note**: If CRON_SECRET is not set, the endpoint will work without auth (for testing)

### 404 Not Found
- **Problem**: Wrong URL or route not deployed
- **Fix**: Verify the URL is correct and deployment is complete

### 500 Internal Server Error
- **Problem**: Missing Supabase keys or database function doesn't exist
- **Fix**: 
  - Check `SUPABASE_SERVICE_ROLE_KEY` is set in Vercel
  - Verify the database function `process_ended_classes` exists in Supabase

### No Response / Timeout
- **Problem**: Endpoint might be cold-starting (first request takes longer)
- **Fix**: Wait a bit and try again

## Check Vercel Logs

1. Go to Vercel Dashboard → Your Project
2. Click "Logs" tab
3. Look for:
   - API calls to `/api/cron/class-reports`
   - Any error messages
   - Function execution logs

## If You Don't See API Calls in Vercel

Possible reasons:
1. **Cron job hasn't run yet** - Wait for the scheduled time
2. **Cron job failed silently** - Check cron-job.org execution logs
3. **Wrong URL configured** - Verify the URL in cron-job.org
4. **Authorization failed** - Check CRON_SECRET matches

## Next Steps

1. **Test the endpoint manually first** (using Method 1 or 2 above)
2. **If manual test works**, then check cron-job.org:
   - Go to your cron job
   - Check "Execution Log" tab
   - See if it shows success or error
3. **If cron shows success but no Vercel logs**, check:
   - Vercel → Logs → Filter by function name
   - Make sure you're looking at the right time period

