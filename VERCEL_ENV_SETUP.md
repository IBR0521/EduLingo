# Vercel Environment Variables Setup

## ⚠️ Error: Missing API Keys

The deployment is failing because required environment variables are missing. Follow these steps to fix it:

## 🔧 Step-by-Step: Add Environment Variables in Vercel

### 1. Go to Vercel Dashboard
1. Visit: https://vercel.com/dashboard
2. Click on your **EduLingo** project
3. Go to **Settings** → **Environment Variables**

### 2. Add Required Variables

Add these **6 environment variables** one by one:

#### ✅ Required (Application won't work without these):

**1. NEXT_PUBLIC_SUPABASE_URL**
- **Value**: Your Supabase project URL
- **Where to find**: Supabase Dashboard → Settings → API → Project URL
- **Example**: `https://xxxxxxxxxxxxx.supabase.co`

**2. NEXT_PUBLIC_SUPABASE_ANON_KEY**
- **Value**: Your Supabase anon/public key
- **Where to find**: Supabase Dashboard → Settings → API → Project API keys → `anon` `public`
- **Example**: `eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...`

**3. SUPABASE_SERVICE_ROLE_KEY**
- **Value**: Your Supabase service role key (⚠️ Keep this secret!)
- **Where to find**: Supabase Dashboard → Settings → API → Project API keys → `service_role` `secret`
- **Example**: `eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...`
- **Important**: This is a secret key - never expose it publicly

#### ⚠️ Optional (For Push Notifications):

**4. NEXT_PUBLIC_VAPID_PUBLIC_KEY**
- **Value**: Your VAPID public key
- **Where to find**: Check your `.env.local` file or generate new ones (see below)
- **Example**: `BEl62iUYgUivxIkv69yViEuiBIa40HI...`

**5. VAPID_PRIVATE_KEY**
- **Value**: Your VAPID private key (⚠️ Keep this secret!)
- **Where to find**: Check your `.env.local` file or generate new ones (see below)
- **Example**: `gndYI56E9MseXz5iBmk9HX7RfSg...`

**6. VAPID_SUBJECT**
- **Value**: Email or URL for VAPID
- **Example**: `mailto:admin@yourdomain.com` or `https://yourdomain.com`

### 3. Set Environment Scope

For each variable, make sure to select:
- ✅ **Production**
- ✅ **Preview** (optional, but recommended)
- ✅ **Development** (optional)

### 4. Save and Redeploy

1. Click **Save** after adding each variable
2. Go to **Deployments** tab
3. Click **Redeploy** on the latest deployment
4. Or push a new commit to trigger auto-deployment

## 🔑 How to Get Your Supabase Keys

1. Go to https://supabase.com/dashboard
2. Select your project
3. Go to **Settings** → **API**
4. You'll see:
   - **Project URL** → Use for `NEXT_PUBLIC_SUPABASE_URL`
   - **Project API keys**:
     - `anon` `public` → Use for `NEXT_PUBLIC_SUPABASE_ANON_KEY`
     - `service_role` `secret` → Use for `SUPABASE_SERVICE_ROLE_KEY`

## 🔑 How to Generate VAPID Keys (If You Don't Have Them)

If you don't have VAPID keys yet, generate them:

```bash
npx web-push generate-vapid-keys
```

This will output:
- **Public Key** → Use for `NEXT_PUBLIC_VAPID_PUBLIC_KEY`
- **Private Key** → Use for `VAPID_PRIVATE_KEY`

## ✅ After Adding Variables

1. **Redeploy** your project in Vercel
2. The deployment should now succeed
3. Your application will be live!

## 🚨 Common Issues

### "Missing Supabase configuration"
- Make sure `NEXT_PUBLIC_SUPABASE_URL` and `NEXT_PUBLIC_SUPABASE_ANON_KEY` are set

### "Server configuration error"
- Make sure `SUPABASE_SERVICE_ROLE_KEY` is set

### "Push notifications not configured"
- This is OK if you haven't set VAPID keys yet
- Push notifications will be disabled but the app will work

## 📝 Quick Checklist

- [ ] `NEXT_PUBLIC_SUPABASE_URL` added
- [ ] `NEXT_PUBLIC_SUPABASE_ANON_KEY` added
- [ ] `SUPABASE_SERVICE_ROLE_KEY` added
- [ ] `NEXT_PUBLIC_VAPID_PUBLIC_KEY` added (optional)
- [ ] `VAPID_PRIVATE_KEY` added (optional)
- [ ] `VAPID_SUBJECT` added (optional)
- [ ] All variables set for Production environment
- [ ] Redeployed the project

