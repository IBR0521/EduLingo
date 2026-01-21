# Payment Reminder System Setup

The platform now includes a monthly payment reminder system that automatically sends notifications to students and parents when payments are due.

## Features

1. **Monthly Payment Tracking**
   - Teachers can set monthly payment amounts when adding students to groups
   - Payment due dates are automatically calculated (1 month from enrollment)
   - Payment status tracking (paid, pending, overdue)

2. **Automatic Reminders**
   - Reminders sent 3 days before due date
   - Overdue notifications for late payments
   - Sent via both email and SMS

3. **Phone Number Management**
   - **Parents**: Phone number is **required** (strict)
   - **Students**: Can choose "No Phone" option
   - If student has no phone, parent's phone is used for SMS reminders

## Database Setup

Run the migration script in Supabase SQL Editor:

```sql
-- Run scripts/37_add_payment_system.sql
```

This creates:
- Payment fields in `group_students` table
- `payment_reminders` table for tracking sent reminders
- `has_phone` field in `users` table

## Registration Flow

### For Parents
1. **Phone number is REQUIRED**
   - Must enter phone number during registration
   - Format: `+998XXXXXXXXX` or `9XXXXXXXXX` (Uzbekistan format)
   - Cannot proceed without phone number

### For Students
1. **Phone Number Option**
   - Choose "Yes, I have a phone" → Enter phone number
   - Choose "No, I don't have a phone" → No phone number required
   - If no phone, parent's phone will be used for payment reminders

### For Teachers/Main Teachers
- Phone number is optional

## Adding Students with Payment

When adding a student to a group:

1. Select the student
2. **Optional**: Enter monthly payment amount (in UZS)
3. If amount is set:
   - Payment due date is automatically set to 1 month from now
   - Payment status is set to "pending"
   - Reminders will be sent automatically

## Payment Reminder System

### How It Works

1. **Twice Daily Check** (via cron job or scheduled task at 9 AM and 8 PM)
   - Checks for payments due today (based on course_start_date or last_payment_date day of month)
   - Checks for overdue payments
   - **Only sends reminders if payment status is NOT "paid"**
   - Sends reminders via email and SMS
   - Reminders continue until payment is marked as received by main teacher

2. **Reminder Types**
   - **Due Soon**: 1-3 days before due date
   - **Overdue**: After due date has passed
   - **Monthly**: Regular monthly reminder

3. **Recipients**
   - **Student** (if has phone): Email + SMS
   - **Student** (no phone): Email only
   - **Parent**: Email + SMS (required for payment reminders)

### Setting Up Automatic Reminders

**Important**: Reminders are sent **twice daily** (9 AM and 8 PM) until payment is received.

#### Option 1: Cron Job (Recommended)

Set up cron jobs to call the payment reminder API twice daily:

```bash
# Add to crontab (runs at 9 AM and 8 PM daily)
0 9 * * * curl -X POST https://your-domain.com/api/payment-reminders
0 20 * * * curl -X POST https://your-domain.com/api/payment-reminders
```

#### Option 2: Vercel Cron Jobs

If using Vercel, add to `vercel.json`:

```json
{
  "crons": [
    {
      "path": "/api/payment-reminders",
      "schedule": "0 9 * * *"
    },
    {
      "path": "/api/payment-reminders",
      "schedule": "0 20 * * *"
    }
  ]
}
```

#### Option 3: External Cron Service

Use services like:
- [cron-job.org](https://cron-job.org)
- [EasyCron](https://www.easycron.com)
- [Cronitor](https://cronitor.io)

Configure to call: `POST https://your-domain.com/api/payment-reminders`

#### Option 4: Manual Trigger

You can manually trigger reminders by calling:

```bash
curl -X POST https://your-domain.com/api/payment-reminders
```

Or create an admin button in the dashboard to trigger manually.

## Environment Variables

Make sure these are set:

```env
NEXT_PUBLIC_SUPABASE_URL=your_supabase_url
SUPABASE_SERVICE_ROLE_KEY=your_service_role_key  # For API access
NEXT_PUBLIC_SITE_URL=https://your-domain.com
RESEND_API_KEY=your_resend_key  # For emails
TWILIO_ACCOUNT_SID=your_twilio_sid  # For SMS
TWILIO_AUTH_TOKEN=your_twilio_token
TWILIO_PHONE_NUMBER=your_twilio_number
```

## Payment Status Management

Teachers can manually update payment status:

1. Go to Group → Students tab
2. View payment status for each student
3. Update status when payment is received (via database or admin interface)

## Testing

1. **Test Registration**
   - Register as parent → Phone number should be required
   - Register as student → Should have "No Phone" option
   - Register as student with phone → Should validate phone format

2. **Test Payment Reminders**
   - Add student to group with payment amount
   - Set payment due date to today or tomorrow
   - Manually trigger reminder API
   - Check email and SMS delivery

3. **Test Phone Number Logic**
   - Student with phone → Should receive SMS
   - Student without phone → Only email, parent gets SMS
   - Parent → Must have phone, receives SMS

## Payment Reminder Message Format

**Email Subject**: "Payment Reminder - [Group Name]" or "Payment Overdue - [Group Name]"

**Email/SMS Content**:
- Amount in UZS
- Group name
- Due date
- Status (due soon or overdue)

## Troubleshooting

**Reminders not sending:**
1. Check cron job is running
2. Check API endpoint is accessible
3. Verify environment variables
4. Check Supabase service role key has proper permissions
5. Check email/SMS service configuration

**Phone number validation errors:**
1. Ensure phone numbers are in Uzbekistan format
2. Check `has_phone` field is set correctly
3. Verify parent has phone number if student doesn't

**Payment status not updating:**
1. Check database triggers
2. Verify payment_reminders table is being populated
3. Check payment_due_date is set correctly

## Future Enhancements

- Payment history tracking
- Payment receipt generation
- Online payment integration
- Payment status dashboard for teachers
- Automatic payment status updates
- Payment reminder preferences

