# SMS Setup Guide for Messages

The messaging system now sends SMS notifications to Android Messages app and iCloud Messages when messages are sent through the platform. This requires Twilio configuration.

## Setup Steps

### 1. Get Twilio Account

1. **Sign up for Twilio:**
   - Go to [twilio.com](https://www.twilio.com)
   - Create a free account (includes trial credits)
   - Verify your email and phone number

2. **Get Your Credentials:**
   - After signing up, go to the Twilio Console Dashboard
   - You'll see your **Account SID** and **Auth Token**
   - Copy these values

3. **Get a Phone Number:**
   - In Twilio Console, go to Phone Numbers > Manage > Buy a number
   - Choose a number (or use the trial number provided)
   - Copy the phone number (format: +1234567890)

### 2. Install Twilio (Optional - API route uses fetch)

The current implementation uses Twilio REST API directly via fetch, so no additional npm package is required. However, if you want to use the Twilio SDK:

```bash
npm install twilio
```

### 3. Add Environment Variables

Add these to your `.env.local` file:

```env
# Twilio SMS Configuration
TWILIO_ACCOUNT_SID=ACxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxx
TWILIO_AUTH_TOKEN=your_auth_token_here
TWILIO_PHONE_NUMBER=+1234567890
```

**Important:** 
- Replace `ACxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxx` with your actual Account SID
- Replace `your_auth_token_here` with your actual Auth Token
- Replace `+1234567890` with your Twilio phone number (must include country code with +)

### 4. Add Phone Numbers to User Accounts

Users need to have phone numbers in their profiles to receive SMS:

1. **Via Database:**
   ```sql
   -- Run the migration script
   -- scripts/36_add_phone_numbers.sql
   
   -- Then update users with phone numbers
   UPDATE users SET phone_number = '+1234567890' WHERE email = 'user@example.com';
   ```

2. **Via Registration Form:**
   - Phone number field can be added to registration form (optional)
   - Format: `+998901234567` or `901234567` (local format accepted)

3. **Via Profile Settings:**
   - Users can add/update phone numbers in their profile settings

### 5. Phone Number Format (Uzbekistan)

Phone numbers for Uzbekistan must follow this format:
- ✅ **Full format:** `+998901234567` (country code +998 + 9 digits)
- ✅ **Local format:** `901234567` (will be automatically converted to +998901234567)
- ✅ **Without +:** `998901234567` (will be automatically converted to +998901234567)
- ❌ Incorrect: `1234567890`, `(998) 90-123-45-67`, `998-90-123-45-67`

**Uzbekistan Phone Number Examples:**
- Mobile: `+998901234567` or `901234567`
- Mobile: `+998901234567` or `901234567`
- The system automatically adds +998 if you provide a 9-digit number starting with 9

### 6. Testing

1. **Test SMS Sending:**
   - Send a message through the platform
   - Check if SMS is received on the recipient's phone
   - SMS will appear in:
     - Android Messages app
     - iPhone Messages app (iCloud)
     - Any SMS-capable messaging app

2. **Check Logs:**
   - Check server logs for SMS sending status
   - Twilio dashboard shows message logs and delivery status

### 7. Twilio Trial Limitations

**Free Trial Account:**
- Can only send SMS to verified phone numbers
- Limited credits (usually $15.50)
- Messages include "Sent from a Twilio trial account" prefix

**To Remove Trial Limitations:**
1. Upgrade your Twilio account
2. Verify your account (may require credit card)
3. Trial prefix will be removed

### 8. Cost Considerations

- **Twilio Pricing:** ~$0.0075 per SMS in US
- **International:** Varies by country
- Check [Twilio Pricing](https://www.twilio.com/sms/pricing) for details

### 9. Production Considerations

**Before going to production:**
- ✅ Upgrade Twilio account from trial
- ✅ Verify your sending phone number
- ✅ Set up proper error handling
- ✅ Monitor SMS delivery rates
- ✅ Consider rate limiting
- ✅ Set up webhooks for delivery status (optional)

### 10. Alternative SMS Services

If you prefer other SMS services, you can modify `/app/api/send-sms/route.ts`:

**Options:**
- **AWS SNS** (Amazon Simple Notification Service)
- **Vonage** (formerly Nexmo)
- **MessageBird**
- **Plivo**

### Troubleshooting

**SMS not sending:**
1. Check Twilio credentials in `.env.local`
2. Verify phone number format (Uzbekistan: +998XXXXXXXXX or 9XXXXXXXXX)
3. Check Twilio console for errors
4. Ensure user has phone_number in database
5. Check server logs for error messages

**SMS not received:**
1. Verify phone number is correct (Uzbekistan format)
2. Check if phone number is in correct format (+998XXXXXXXXX)
3. Ensure Twilio account has credits
4. Check Twilio dashboard for delivery status
5. Verify recipient's phone can receive SMS
6. For Uzbekistan: Ensure number starts with +998 or 9 (local format)

**Trial account issues:**
- Can only send to verified numbers
- Upgrade account to send to any number
- Check trial account limitations

---

## How It Works

1. **User sends message** through platform
2. **Message saved** to database
3. **Email sent** to recipient's email (Gmail, etc.)
4. **SMS sent** to recipient's phone (if phone number exists)
5. **Recipient receives:**
   - Email in Gmail app
   - SMS in Messages app (Android/iCloud)

Both notifications happen automatically when a message is sent!

