# Email Setup Guide for EduLingo

The messaging system now sends email notifications when messages are sent through the platform. **Emails are delivered to Gmail, Outlook, and all email clients** via Resend. You need to configure an email service to enable this functionality.

## Option 1: Using Resend (Recommended)

Resend is a modern email API that's easy to set up and use.

### Setup Steps:

1. **Install Resend:**
   ```bash
   npm install resend
   ```

2. **Get API Key:**
   - Sign up at [resend.com](https://resend.com)
   - Go to API Keys and create a new key
   - Copy the API key

3. **Add to .env.local:**
   ```env
   RESEND_API_KEY=re_xxxxxxxxxxxxx
   EMAIL_FROM=EduLingo <noreply@yourdomain.com>
   ```

4. **Update the API route:**
   - Open `app/api/send-email/route.ts`
   - Uncomment the Resend code block (lines starting with `const { Resend }`)
   - Comment out or remove the TODO section

5. **Verify Domain (Optional):**
   - In Resend dashboard, add and verify your domain
   - This allows you to send from your own domain

## Option 2: Using Nodemailer (SMTP)

Works with any SMTP server (Gmail, Outlook, SendGrid, etc.)

### Setup Steps:

1. **Install Nodemailer:**
   ```bash
   npm install nodemailer
   npm install --save-dev @types/nodemailer
   ```

2. **Get SMTP Credentials:**
   - Gmail: Use App Password (requires 2FA)
   - SendGrid: Use SMTP credentials from dashboard
   - Custom SMTP: Use your server's SMTP settings

3. **Add to .env.local:**
   ```env
   SMTP_HOST=smtp.gmail.com
   SMTP_PORT=587
   SMTP_SECURE=false
   SMTP_USER=your-email@gmail.com
   SMTP_PASS=your-app-password
   EMAIL_FROM=EduLingo <your-email@gmail.com>
   ```

4. **Update the API route:**
   - Open `app/api/send-email/route.ts`
   - Uncomment the Nodemailer code block
   - Comment out or remove the TODO section

## Option 3: Using Supabase Edge Functions

For Supabase-native solution, you can use Edge Functions.

### Setup Steps:

1. **Install Supabase CLI:**
   ```bash
   npm install -g supabase
   ```

2. **Create Edge Function:**
   ```bash
   supabase functions new send-email
   ```

3. **Implement email sending in the Edge Function**

4. **Call the Edge Function from the API route**

## Development Mode

Currently, the system logs emails in development mode instead of sending them. Check your console/logs to see email output.

## Production

**IMPORTANT:** Make sure to configure a real email service before deploying to production. The current implementation only logs emails and doesn't actually send them.

## Testing

After setup, test by:
1. Sending a message through the platform
2. Checking the recipient's email inbox
3. Verifying the email contains the message content and platform link




