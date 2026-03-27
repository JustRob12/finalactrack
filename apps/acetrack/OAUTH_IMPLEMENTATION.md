# OAuth/Social Login Implementation - Complete Guide

## ✅ What Has Been Set Up

Your Acetrack app now has full OAuth/Social Login support using Supabase! Here's what was implemented:

### 1. **Supabase Client** ([lib/supabase.ts](lib/supabase.ts))
- Configured with PKCE flow for better security
- Auto-refresh tokens enabled
- Session detection in URL enabled
- Custom storage key for Acetrack

### 2. **Authentication Context** ([lib/contexts/authContext.tsx](lib/contexts/authContext.tsx))
- User state management
- Profile validation (checks if user exists in your database)
- Sign in with email/password
- Sign in with Google OAuth
- Sign out functionality
- Session refresh capabilities

### 3. **OAuth Callback Route** ([app/auth/callback/route.ts](app/auth/callback/route.ts))
- Handles the OAuth redirect from Google
- Exchanges authorization code for session
- Redirects user to appropriate page after login

### 4. **Updated Login Form** ([components/forms/login/form.tsx](components/forms/login/form.tsx))
- Email/password login
- Google OAuth button
- Loading states
- Error handling
- Form validation

### 5. **Error Page** ([app/auth/auth-code-error/page.tsx](app/auth/auth-code-error/page.tsx))
- Displays when OAuth authentication fails

## 🚀 How to Use

### For Development

1. **Install dependencies** (already done):
   ```bash
   pnpm install
   ```

2. **Start the dev server**:
   ```bash
   # From root
   pnpm dev:acetrack
   
   # Or from acetrack directory
   cd apps/acetrack
   pnpm dev
   ```

3. **Access the login page**:
   ```
   http://localhost:3001/login
   ```

### Using the Authentication

#### In Your Components

```tsx
'use client'

import { useAuth } from '@/lib/contexts/authContext'

export function YourComponent() {
  const { user, loading, signOut } = useAuth()

  if (loading) {
    return <div>Loading...</div>
  }

  if (!user) {
    return <div>Please log in</div>
  }

  return (
    <div>
      <p>Welcome, {user.email}</p>
      <button onClick={signOut}>Sign Out</button>
    </div>
  )
}
```

#### Available Auth Methods

```tsx
const {
  user,              // Current user object or null
  loading,           // Auth state loading
  signIn,            // Sign in with email/password
  signUp,            // Sign up new user
  signInWithGoogle,  // Sign in with Google OAuth
  signOut,           // Sign out current user
  refreshSession,    // Manually refresh the session
} = useAuth()
```

## 🔧 Configuration Required

### Google OAuth Setup

To enable Google sign-in, you need to:

1. **Create Google OAuth credentials** - See [OAUTH_SETUP.md](OAUTH_SETUP.md) for detailed instructions

2. **Configure Supabase Dashboard**:
   - Go to Authentication > Providers
   - Enable Google provider
   - Add your Google Client ID and Secret

3. **Add Redirect URLs** in Supabase:
   - `http://localhost:3001/auth/callback` (development)
   - `https://your-domain.com/auth/callback` (production)

### Environment Variables

Your `.env.local` file should contain:

```env
NEXT_PUBLIC_SUPABASE_URL=https://qnhppyeudwzfkhzjfnke.supabase.co
NEXT_PUBLIC_SUPABASE_ANON_KEY=your-anon-key-here
```

## 📋 Important Notes

### Profile Validation

The auth system validates that users have a profile in your `user_profiles` table:

- Users without profiles will be signed out (except on login/register pages)
- This prevents unauthorized access from users who haven't completed registration
- Modal will show prompting users to register first

### Session Management

- Sessions are stored in localStorage
- Auto-refresh is enabled to keep users logged in
- Sessions persist across page reloads

### Security Features

- **PKCE Flow**: More secure OAuth flow
- **Profile Validation**: Ensures users exist in your database
- **Auto-refresh**: Keeps sessions active securely
- **Proper Error Handling**: Graceful failure modes

## 🎨 Customization

### Styling

The login form uses your existing UI components:
- `Button` component
- `Input` component
- `Field` components

You can customize these in your component library.

### Redirect Behavior

After successful Google login, users are redirected through:
1. Google consent screen
2. `/auth/callback` (processes OAuth)
3. Specified page or `/login` by default

You can customize the redirect in the login form:

```tsx
// Redirect to dashboard after Google login
await signInWithGoogle('/dashboard')
```

## 📁 File Structure

```
apps/acetrack/
├── app/
│   ├── auth/
│   │   ├── callback/
│   │   │   └── route.ts          # OAuth callback handler
│   │   └── auth-code-error/
│   │       └── page.tsx           # Error page
│   └── layout.tsx                 # Wrapped with AuthProvider
├── components/
│   └── forms/
│       └── login/
│           └── form.tsx           # Updated login form
├── lib/
│   ├── contexts/
│   │   └── authContext.tsx        # Auth state management
│   └── supabase.ts                # Supabase client
├── .env.local                     # Environment variables
├── .env.example                   # Example env file
└── OAUTH_SETUP.md                 # Detailed OAuth setup guide
```

## 🐛 Troubleshooting

### "Redirect URI mismatch"
- Check Google Cloud Console OAuth settings
- Verify redirect URIs match exactly (including port 3001)

### "User not found" modal
- User doesn't have a profile in `user_profiles` table
- Prompt user to complete registration

### Session not persisting
- Check browser cookies are enabled
- Verify localStorage is not blocked
- Check Supabase client configuration

## 📚 Additional Resources

- [Supabase Auth Documentation](https://supabase.com/docs/guides/auth)
- [Google OAuth Setup Guide](https://supabase.com/docs/guides/auth/social-login/auth-google)
- [OAUTH_SETUP.md](OAUTH_SETUP.md) - Detailed setup instructions

## 🎯 Next Steps

1. Complete Google OAuth setup (see [OAUTH_SETUP.md](OAUTH_SETUP.md))
2. Create protected routes using the `useAuth` hook
3. Add more OAuth providers if needed (Facebook, GitHub, etc.)
4. Implement email verification if required
5. Add password reset functionality
6. Create user profile management pages

---

**Questions?** Check the implementation in the client app for reference, or refer to the Supabase documentation.
