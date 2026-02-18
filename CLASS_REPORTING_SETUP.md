# Class Completion Reporting System Setup Guide

## Overview

This system automatically generates and sends reports to the main teacher when classes end. It checks:
- **Attendance completion**: Whether all students have been marked as present/absent
- **Grading completion**: Whether all assignments have been graded for all students

## Features

1. **Automatic Reminders**: If attendance or grading is incomplete, the system sends reminders to the teacher/assistant
2. **Completion Reports**: Once everything is complete, the system sends a detailed report to the main teacher
3. **Message Integration**: All reports are sent automatically to the messages inbox (not manually)

## Database Setup

1. Run the SQL script to create the functions and tables:
   ```sql
   -- Run this in Supabase SQL Editor
   -- File: scripts/58_class_completion_reporting.sql
   ```

2. The script creates:
   - `class_completion_reports` table: Tracks which reports have been sent
   - `check_attendance_complete()` function: Checks if all students are marked
   - `check_grading_complete()` function: Checks if all assignments are graded
   - `get_main_teacher_for_group()` function: Finds the main teacher for a group
   - `generate_class_completion_report()` function: Generates and sends reports
   - `process_ended_classes()` function: Processes all ended classes (for cron)

## API Setup

The API endpoint is located at: `/api/cron/class-reports`

### Environment Variables

Add to your `.env.local`:
```env
CRON_SECRET=your-secret-token-here  # Optional: for securing the cron endpoint
SUPABASE_SERVICE_ROLE_KEY=your-service-role-key  # Required: for bypassing RLS
```

### Testing the API

You can test the endpoint manually:
```bash
# Without authentication
curl -X POST http://localhost:3000/api/cron/class-reports

# With authentication (if CRON_SECRET is set)
curl -X POST http://localhost:3000/api/cron/class-reports \
  -H "Authorization: Bearer your-secret-token-here"
```

## Cron Job Setup

### Option 1: Vercel Cron (Recommended for Vercel deployments)

Create `vercel.json` in your project root:
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

This runs every hour. Adjust the schedule as needed:
- `0 * * * *` - Every hour
- `*/30 * * * *` - Every 30 minutes
- `0 0 * * *` - Daily at midnight

### Option 2: External Cron Service

Use services like:
- **GitHub Actions**: Create a workflow that calls your API
- **cron-job.org**: Free external cron service
- **EasyCron**: Another external cron service
- **Your own server**: Set up a cron job on your server

Example GitHub Actions workflow (`.github/workflows/class-reports.yml`):
```yaml
name: Class Reports Cron
on:
  schedule:
    - cron: '0 * * * *'  # Every hour
  workflow_dispatch:  # Allow manual trigger

jobs:
  call-api:
    runs-on: ubuntu-latest
    steps:
      - name: Call Class Reports API
        run: |
          curl -X POST ${{ secrets.API_URL }}/api/cron/class-reports \
            -H "Authorization: Bearer ${{ secrets.CRON_SECRET }}"
```

### Option 3: Manual Trigger

You can also manually trigger the function from the database:
```sql
-- Process all ended classes
SELECT * FROM process_ended_classes();

-- Process a specific class
SELECT * FROM generate_class_completion_report('schedule-id-here');
```

## How It Works

1. **Class Ends**: When a class's end time (date + duration_minutes) passes
2. **Check Completion**: System checks:
   - Are all students marked for attendance?
   - Are all assignments graded for all students?
3. **Send Reports**:
   - **If incomplete**: Sends reminder to teacher/assistant (max once per hour)
   - **If complete**: Sends completion report to main teacher (once per class)
4. **Messages**: All reports are sent as messages in the inbox, automatically

## Report Content

### Incomplete Reminder (to Teacher/Assistant)
```
Class Task Completion Reminder

Class: [Subject]
Group: [Group Name]
Date: [Date and Time]

ATTENDANCE INCOMPLETE:
  Total Students: X
  Marked: Y
  Missing: Z
  Please mark attendance for all students.

GRADING INCOMPLETE:
  Total Assignments: X
  Missing Grades: Y
  Please complete grading for all students.

Please complete these tasks as soon as possible and report to the main teacher.
```

### Completion Report (to Main Teacher)
```
Class Completion Report

Class: [Subject]
Group: [Group Name]
Date: [Date and Time]
Duration: [X] minutes

ATTENDANCE SUMMARY:
  Total Students: X
  Present: Y
  Absent: Z

GRADING SUMMARY:
  Total Assignments: X
  Fully Graded: Yes

All tasks have been completed. The class is fully processed.
```

## Troubleshooting

### Reports Not Sending

1. **Check if classes have ended**: The system only processes classes that have ended
2. **Check main teacher exists**: Ensure there's at least one user with `role = 'main_teacher'`
3. **Check cron job is running**: Verify your cron job is actually calling the API
4. **Check database logs**: Look for errors in Supabase logs

### Duplicate Reports

The system prevents duplicate reports by:
- Tracking sent reports in `class_completion_reports` table
- Limiting reminders to once per hour
- Limiting completion reports to once per class

### Testing

To test manually:
```sql
-- Find a recent ended class
SELECT id, subject, date, duration_minutes, group_id
FROM schedule
WHERE (date + (duration_minutes || ' minutes')::INTERVAL) <= NOW()
ORDER BY date DESC
LIMIT 1;

-- Generate report for that class
SELECT * FROM generate_class_completion_report('schedule-id-from-above');
```

## Notes

- Reports are sent automatically by the platform (not manually)
- Messages appear in the recipient's inbox
- The system respects the 1-hour cooldown for reminders to avoid spam
- Completion reports are sent only once per class
- The system processes classes that ended in the last 24 hours

