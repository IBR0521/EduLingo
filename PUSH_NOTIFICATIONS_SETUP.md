# Push Notifications Setup Guide

## Overview

The platform now supports **Web Push Notifications** that will appear on users' phones and devices, even when they're not actively using the platform!

## How It Works

1. **User enables push notifications** - Users can toggle push notifications in the Notifications page
2. **Notifications are created** - When messages, announcements, grades, etc. are created
3. **Push notification sent** - Automatically sent to user's device
4. **User sees notification** - Appears on their phone/device even if browser is closed

## Setup Instructions

### 1. Generate VAPID Keys

VAPID (Voluntary Application Server Identification) keys are required for push notifications.

**Option A: Using web-push library (Recommended)**

```bash
npx web-push generate-vapid-keys
```

This will output:
```
Public Key: <your-public-key>
Private Key: <your-private-key>
```

**Option B: Using online generator**
- Visit: https://web-push-codelab.glitch.me/
- Generate keys and copy them

### 2. Add Environment Variables

Add these to your `.env.local` file:

```env
# VAPID Keys for Push Notifications
VAPID_PUBLIC_KEY=<your-public-key>
VAPID_PRIVATE_KEY=<your-private-key>
VAPID_SUBJECT=mailto:admin@yourdomain.com

# Also expose public key to client
NEXT_PUBLIC_VAPID_PUBLIC_KEY=<your-public-key>
```

### 3. Create Database Table

Run this SQL script in Supabase SQL Editor:

```sql
-- Run scripts/42_create_push_subscriptions.sql
```

Or manually create the table:

```sql
CREATE TABLE IF NOT EXISTS push_subscriptions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID REFERENCES users(id) ON DELETE CASCADE NOT NULL,
  endpoint TEXT NOT NULL,
  p256dh_key TEXT NOT NULL,
  auth_key TEXT NOT NULL,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  UNIQUE(user_id, endpoint)
);

CREATE INDEX IF NOT EXISTS idx_push_subscriptions_user ON push_subscriptions(user_id);

ALTER TABLE push_subscriptions ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can manage own push subscriptions"
ON push_subscriptions
FOR ALL
USING (auth.uid() = user_id)
WITH CHECK (auth.uid() = user_id);
```

### 4. Deploy Service Worker

The service worker file (`public/sw.js`) is already created. Make sure it's accessible at `/sw.js`.

### 5. Test Push Notifications

1. Open the platform in a browser (Chrome, Firefox, Safari, Edge)
2. Go to Notifications page
3. Toggle "Push Notifications" switch
4. Grant permission when prompted
5. Send a test notification

## Features

✅ **Web Push Notifications**
- Works on mobile browsers (iOS Safari, Chrome Android, etc.)
- Works on desktop browsers
- Appears even when browser is closed
- Click notification to open platform

✅ **Automatic Sending**
- Messages → Push notification sent
- Announcements → Push notification sent
- Grades → Push notification sent
- Assignments → Push notification sent
- All notifications → Push notification sent

✅ **User Control**
- Users can enable/disable push notifications
- Permission-based (requires user consent)
- Works across devices

## Browser Support

- ✅ Chrome/Edge (Android & Desktop)
- ✅ Firefox (Android & Desktop)
- ✅ Safari (iOS 16.4+ & macOS)
- ✅ Samsung Internet
- ⚠️ Older browsers may not support

## Mobile App Integration (Future)

For native mobile apps, you can:
1. Use Firebase Cloud Messaging (FCM)
2. Use Apple Push Notification Service (APNs)
3. Integrate with existing push notification infrastructure

## Troubleshooting

### "Push notifications not supported"
- Check if browser supports Push API
- Try Chrome or Firefox
- iOS Safari requires iOS 16.4+

### "Permission denied"
- User denied permission
- Go to browser settings and enable notifications
- Clear browser cache and try again

### "Failed to enable push notifications"
- Check VAPID keys are set correctly
- Verify service worker is registered
- Check browser console for errors

### Notifications not appearing
- Check if user has enabled push notifications
- Verify VAPID keys match
- Check service worker is active
- Verify database table exists

## Security

- Push subscriptions are user-specific
- RLS policies ensure users can only manage their own subscriptions
- VAPID keys authenticate the server
- Notifications are encrypted end-to-end

## Next Steps

1. ✅ Generate VAPID keys
2. ✅ Add to environment variables
3. ✅ Run database migration
4. ✅ Test push notifications
5. ✅ Users can enable in Notifications page

---

**Status:** Push notifications are now implemented! Users will receive notifications on their phones when messages, announcements, and other notifications are created.

