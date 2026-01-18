# Fix: Google OAuth Redirecting to Production Instead of Localhost

## Problem
When clicking "Sign in with Google" locally, it redirects to `https://finalacetrack.vercel.app` instead of `http://localhost:3000`.

## Root Cause
This happens because **Supabase's Site URL or Redirect URL configuration** is overriding your local redirect URL.

## Solution Steps

### Step 1: Check Browser Console
1. Open your browser's Developer Tools (F12)
2. Go to the **Console** tab
3. Click "Sign in with Google"
4. Look for the debug logs that show:
   ```
   🔍 Google OAuth Debug Info:
     - Current origin: http://localhost:3000
     - Redirect path: /login
     - Full redirect URL: http://localhost:3000/login
   ```
5. **If the redirect URL shows `localhost:3000` but still goes to production**, the issue is in Supabase configuration.

### Step 2: Fix Supabase Configuration

#### A. Check Site URL
1. Go to **Supabase Dashboard** → **Authentication** → **URL Configuration**
2. Check the **Site URL** field
3. **For local development**, you can temporarily set it to:
   ```
   http://localhost:3000
   ```
   **OR** leave it as production URL (this is fine, but you need Step 2B)

#### B. Add Redirect URLs (MOST IMPORTANT)
1. In the same **URL Configuration** page
2. Scroll to **Redirect URLs** section
3. **Add these URLs** (one per line):
   ```
   http://localhost:3000/login
   http://localhost:3000/register
   http://localhost:3000/*
   http://127.0.0.1:3000/login
   http://127.0.0.1:3000/register
   http://127.0.0.1:3000/*
   ```
4. **Also add your production URLs** (if not already there):
   ```
   https://finalacetrack.vercel.app/login
   https://finalacetrack.vercel.app/register
   https://finalacetrack.vercel.app/*
   ```
5. **Click "Save"** (very important!)

#### C. Check Google OAuth Provider Settings
1. Go to **Authentication** → **Providers** → **Google**
2. Make sure it's **Enabled**
3. Verify your **Client ID** and **Client Secret** are correct
4. Check **Authorized redirect URIs** in your Google Cloud Console should include:
   - `https://qnhppyeudwzfkhzjfnke.supabase.co/auth/v1/callback`
   - (This is your Supabase project URL + `/auth/v1/callback`)

### Step 3: Clear Browser Cache
1. Clear your browser's cache and cookies for `localhost:3000`
2. Or use **Incognito/Private mode** to test

### Step 4: Test Again
1. Start your dev server: `npm run dev`
2. Open `http://localhost:3000/login`
3. Open browser console (F12)
4. Click "Sign in with Google"
5. Check the console logs to see what redirect URL is being sent
6. After Google authentication, you should be redirected back to `http://localhost:3000/login`

## Common Issues

### Issue 1: "redirect_uri_mismatch" Error
**Cause:** The redirect URL isn't whitelisted in Supabase  
**Fix:** Add the exact URL from the error message to Supabase's Redirect URLs

### Issue 2: Still Redirecting to Production
**Cause:** Supabase Site URL is set to production and redirect URLs don't include localhost  
**Fix:** 
- Add localhost URLs to Redirect URLs (Step 2B above)
- OR temporarily change Site URL to `http://localhost:3000` for local development

### Issue 3: Redirect URL Shows Correctly in Console but Still Goes to Production
**Cause:** Supabase is ignoring the `redirectTo` parameter because it's not in the allowed list  
**Fix:** Make sure you **saved** the Redirect URLs in Supabase (Step 2B)

## Verification Checklist

- [ ] Browser console shows `http://localhost:3000/login` as redirect URL
- [ ] Supabase Redirect URLs include `http://localhost:3000/login` and `http://localhost:3000/register`
- [ ] Supabase Redirect URLs are **saved** (clicked Save button)
- [ ] Browser cache cleared or using incognito mode
- [ ] Google OAuth provider is enabled in Supabase
- [ ] After Google auth, redirects back to `http://localhost:3000/login` (not production)

## Still Not Working?

1. **Check the actual redirect URL in browser console** - does it show localhost?
2. **Check Supabase logs** - Go to Supabase Dashboard → Logs → Auth Logs to see what's happening
3. **Try a different browser** - Sometimes browser extensions interfere
4. **Check if you're using a different port** - If your dev server runs on port 3001, add that to Supabase too

## Important Notes

- **Site URL** in Supabase is used as a fallback if the redirect URL doesn't match allowed URLs
- **Redirect URLs** must match **exactly** (including protocol http/https and port number)
- You can have **both** localhost and production URLs in the Redirect URLs list
- The `/*` wildcard allows all paths under that domain

