# Migration Notes - Client to Acetrack

This document shows what was migrated from your client app to the acetrack app.

## ✅ What's the Same

Both implementations use:
- **Supabase** for authentication
- **Google OAuth** as the social login provider
- **PKCE flow** for secure authentication
- **User profile validation** before allowing access
- **Session persistence** in localStorage
- **Auto-refresh tokens**

## 🔄 Key Differences

### 1. **Storage Key**
- **Client**: `finalactrack-auth`
- **Acetrack**: `acetrack-auth`

This allows both apps to run independently with separate sessions.

### 2. **Port Numbers**
- **Client**: `3000`
- **Acetrack**: `3001`

### 3. **Callback URLs**
- **Client**: `http://localhost:3000/auth/callback`
- **Acetrack**: `http://localhost:3001/auth/callback`

You'll need to add the acetrack callback URL to:
- Google Cloud Console
- Supabase Dashboard redirect URLs

### 4. **UI Components**
- **Client**: Custom components with Tailwind
- **Acetrack**: shadcn/ui components

The acetrack app uses the newer shadcn/ui component library.

### 5. **File Structure**
```
Client:                          Acetrack:
└── src/                         └── (no src folder)
    ├── app/                         ├── app/
    ├── contexts/                    └── lib/
    │   └── AuthContext.tsx              └── contexts/
    └── lib/                                 └── authContext.tsx
        └── supabase.ts                  └── supabase.ts
```

## 🎯 OAuth Redirect Configuration

You need **both** redirect URLs configured in Google & Supabase:

```
Client (Port 3000):
http://localhost:3000/auth/callback

Acetrack (Port 3001):
http://localhost:3001/auth/callback
```

## 📋 Feature Parity

| Feature | Client | Acetrack | Notes |
|---------|--------|----------|-------|
| Google OAuth | ✅ | ✅ | Same implementation |
| Email/Password | ✅ | ✅ | Same implementation |
| Profile Validation | ✅ | ✅ | Same logic |
| Session Management | ✅ | ✅ | Same approach |
| Registration Modal | ✅ | ⏳ | Can be added if needed |
| Password Reset | ✅ | ⏳ | Can be added if needed |
| Role-based Redirect | ✅ | ⏳ | Can be added if needed |

## 🔧 Additional Features in Client

The client app has some additional features you might want to migrate:

### 1. **Registration Modal**
Shows when user tries to login without a profile:

```tsx
{showRegisterModal && (
  <div className="modal">
    <p>You are not yet registered</p>
    <button onClick={() => router.push('/register')}>
      Go to Registration
    </button>
  </div>
)}
```

### 2. **Role-based Redirects**
After login, redirects based on user role:

```tsx
switch (profile.role_id) {
  case 0: router.push('/admin'); break
  case 2: router.push('/scanner'); break
  default: router.push('/dashboard'); break
}
```

### 3. **Inactivity Timeout**
Auto-signs out users after period of inactivity.

### 4. **Forgot Password**
Password reset flow with email.

## 💡 Recommendations

1. **Add the registration modal** to acetrack for better UX
2. **Implement role-based redirects** if you have different user types
3. **Add password reset** functionality
4. **Consider adding** Facebook/GitHub/Apple OAuth providers

## 🔄 To Migrate Additional Features

Just copy the relevant code from client and adjust:
- Import paths (remove `@/src/`)
- Component styling (use shadcn/ui components)
- Update redirect URLs (change port from 3000 to 3001)

## ✨ Benefits of This Setup

- **Independent Sessions**: Both apps can run simultaneously
- **Same Database**: Both apps share the same Supabase project
- **Consistent Auth**: Same authentication logic
- **Easy Testing**: Can test both apps side-by-side

---

**Need help migrating a specific feature?** Check the client implementation and adapt it using the patterns already set up in acetrack!
