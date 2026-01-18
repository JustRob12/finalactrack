# Google OAuth Setup for Local Development

## Problem
When clicking "Sign in with Google" locally, it redirects to the deployed version instead of `http://localhost:3000`.

## Solution
You need to add your local development URL to Supabase's allowed redirect URLs.

## Steps to Fix

### 1. Go to Supabase Dashboard
1. Open your Supabase project: https://supabase.com/dashboard
2. Navigate to **Authentication** → **URL Configuration**

### 2. Add Local Development URLs
In the **Redirect URLs** section, add these URLs:

```
http://localhost:3000/login
http://localhost:3000/register
http://localhost:3000/*
http://127.0.0.1:3000/login
http://127.0.0.1:3000/register
http://127.0.0.1:3000/*
```

**Important:** Make sure to click **Save** after adding the URLs.

### 3. Verify Site URL
Also check that your **Site URL** includes:
- Production: `https://finalacetrack.vercel.app`
- Or leave it as your production URL (this is fine)

### 4. Check Google OAuth Provider Settings
1. In Supabase Dashboard, go to **Authentication** → **Providers**
2. Click on **Google** provider
3. Make sure it's **Enabled**
4. Verify your Google OAuth credentials are set up correctly

### 5. Test Locally
1. Start your local dev server: `npm run dev`
2. Open `http://localhost:3000/login` or `http://localhost:3000/register`
3. Click "Sign in with Google"
4. Check the browser console - you should see: `Google OAuth redirect URL: http://localhost:3000/login` (or `/register`)
5. After Google authentication, you should be redirected back to the appropriate page

## Troubleshooting

### Still redirecting to production?
1. **Clear browser cache and cookies** for localhost
2. **Check browser console** for the redirect URL (should show localhost)
3. **Verify Supabase redirect URLs** are saved correctly
4. **Check if you're using a different port** - if so, add that port to Supabase (e.g., `http://localhost:3001/register`)

### Getting "redirect_uri_mismatch" error?
- This means the redirect URL isn't whitelisted in Supabase
- Add the exact URL you see in the error to Supabase's redirect URLs
- Make sure to include the full path (e.g., `/register`)

### Still not working?
1. Check the browser's Network tab to see what redirect URL is being sent
2. Verify your Supabase project URL and anon key in `client/src/lib/supabase.ts`
3. Make sure you're testing on the same domain/port that's whitelisted

## Production vs Development

- **Local Development**: Uses `window.location.origin` which will be `http://localhost:3000`
- **Production**: Uses `window.location.origin` which will be `https://finalacetrack.vercel.app`

The code automatically detects which environment you're in, but **both URLs must be whitelisted in Supabase**.

