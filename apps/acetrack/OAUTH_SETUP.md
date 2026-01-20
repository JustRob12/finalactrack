# Supabase OAuth Setup for Acetrack

This guide will help you set up Google OAuth authentication for your Acetrack application.

## Prerequisites

1. A Google Cloud account
2. A Supabase project (you already have one!)

## Setup Steps

### 1. Google Cloud Console Setup

1. Go to [Google Cloud Console](https://console.cloud.google.com/)
2. Create a new project or select an existing one
3. Navigate to **APIs & Services** > **Credentials**
4. Click **Create Credentials** > **OAuth client ID**
5. Choose **Web application** as the application type
6. Configure the OAuth client:
   - **Authorized JavaScript origins**: 
     - `http://localhost:3001` (for local development)
     - Your production URL (e.g., `https://acetrack.yourdomain.com`)
   - **Authorized redirect URIs**:
     - `http://localhost:3001/auth/callback` (for local development)
     - `https://qnhppyeudwzfkhzjfnke.supabase.co/auth/v1/callback` (for Supabase)
     - Your production callback URL

7. Click **Create** and save your **Client ID** and **Client Secret**

### 2. Supabase Dashboard Setup

1. Go to your [Supabase Dashboard](https://app.supabase.com/)
2. Select your project
3. Navigate to **Authentication** > **Providers**
4. Find **Google** in the list and click to configure it
5. Enable the Google provider
6. Enter your Google **Client ID** and **Client Secret**
7. Save the configuration

### 3. Configure Redirect URLs in Supabase

1. In your Supabase Dashboard, go to **Authentication** > **URL Configuration**
2. Add these URLs to the **Redirect URLs** list:
   - `http://localhost:3001/auth/callback` (for local development)
   - Your production callback URL (e.g., `https://acetrack.yourdomain.com/auth/callback`)

### 4. Environment Variables

Create a `.env.local` file in the acetrack app directory:

```bash
# Supabase Configuration
NEXT_PUBLIC_SUPABASE_URL=https://qnhppyeudwzfkhzjfnke.supabase.co
NEXT_PUBLIC_SUPABASE_ANON_KEY=your-anon-key-here

# Google OAuth (optional - only if you want to display client ID)
# NEXT_PUBLIC_GOOGLE_CLIENT_ID=your-google-client-id-here
```

### 5. Install Dependencies

From the project root:

```bash
pnpm install
```

Or from the acetrack directory:

```bash
cd apps/acetrack
pnpm install
```

### 6. Test the Setup

1. Start the development server:
   ```bash
   pnpm dev:acetrack
   ```

2. Navigate to `http://localhost:3001/login`
3. Click "Continue with Google"
4. You should be redirected to Google's consent screen
5. After authorizing, you should be redirected back to your app

## Important Notes

- Make sure the redirect URLs match exactly (including the port number)
- For production, use HTTPS URLs
- The Google Client ID and Secret are sensitive - never commit them to version control
- The `.env.local` file is already in `.gitignore`

## Troubleshooting

### "Redirect URI mismatch" error
- Double-check that your redirect URIs in Google Cloud Console match exactly
- Make sure you're using the correct port (3001 for acetrack)

### User not redirected after Google login
- Check the browser console for errors
- Verify the Supabase callback route is working: `/auth/callback`
- Make sure the redirect URLs are configured in Supabase Dashboard

### Session not persisting
- Check that cookies are enabled in your browser
- Verify that the Supabase client is properly initialized

## Additional Resources

- [Supabase Google OAuth Documentation](https://supabase.com/docs/guides/auth/social-login/auth-google)
- [Google Cloud Console](https://console.cloud.google.com/)
- [Supabase Dashboard](https://app.supabase.com/)
