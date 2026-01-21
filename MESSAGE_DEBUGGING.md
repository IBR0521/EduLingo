# Message Sending Debugging Guide

## What I've Fixed

1. ✅ Added comprehensive error logging
2. ✅ Added validation error messages with toasts
3. ✅ Fixed button click handler to prevent form submission
4. ✅ Added try-catch error handling
5. ✅ Added detailed console logging at each step

## How to Debug

### Step 1: Open Browser Console
1. Press `F12` or `Cmd+Option+I` (Mac) / `Ctrl+Shift+I` (Windows)
2. Go to the "Console" tab
3. Clear the console (click the clear icon)

### Step 2: Try Sending a Message
1. Click "Compose Message"
2. Select a recipient
3. Type a message
4. Click "Send Message"

### Step 3: Check Console Output

You should see one of these logs:

**If the function is called:**
```
handleSendMessage called { formData: {...}, user: {...} }
```

**If validation fails:**
```
Validation failed: [reason]
```

**If sending starts:**
```
Attempting to send message: { sender_id: "...", recipient_id: "...", ... }
```

**If successful:**
```
✅ Message sent successfully: { id: "...", ... }
```

**If there's an error:**
```
Database error sending message: { message: "...", details: "...", ... }
```

## Common Issues & Solutions

### Issue 1: "Validation failed: No recipient selected"
- **Cause**: Recipient dropdown is empty or not selected
- **Solution**: Make sure users are loaded. Check if `users` array has data.

### Issue 2: "Validation failed: Empty message content"
- **Cause**: Message content is empty or only whitespace
- **Solution**: Type a message with actual content (not just spaces)

### Issue 3: "Error: User ID is missing"
- **Cause**: User is not authenticated or session expired
- **Solution**: Refresh the page and log in again

### Issue 4: "Database error sending message"
- **Cause**: RLS policy issue, connection problem, or invalid data
- **Solution**: Check the error details in console. Common causes:
  - RLS policy blocking insert
  - Network connectivity issue
  - Invalid recipient_id or sender_id

### Issue 5: No console logs at all
- **Cause**: Button click handler not working or JavaScript error
- **Solution**: 
  - Check for JavaScript errors in console (red errors)
  - Make sure the button is not disabled
  - Check if the formData state is properly initialized

## Quick Test

Run this in the browser console to check if everything is set up:

```javascript
// Check if user is loaded
console.log('User:', window.__USER__); // This won't work, but check the component

// Check if Supabase is configured
console.log('Supabase URL:', process.env.NEXT_PUBLIC_SUPABASE_URL);
```

## Next Steps

1. **Share the console output** - Copy all console logs when you try to send a message
2. **Check network tab** - In DevTools, go to "Network" tab and see if there's a request to Supabase
3. **Check for errors** - Look for any red error messages in the console

