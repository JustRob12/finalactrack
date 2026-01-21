import { createClient } from '@supabase/supabase-js'

const supabaseUrl = 'https://qnhppyeudwzfkhzjfnke.supabase.co'
const supabaseAnonKey = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InFuaHBweWV1ZHd6ZmtoempmbmtlIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NTYwNDg0NTksImV4cCI6MjA3MTYyNDQ1OX0.Ojwg6Dmq5i5QCZ9eEZLERtt0ZPG5fBM6ZPxXgNuJrGM'

export const supabase = createClient(supabaseUrl, supabaseAnonKey, {
  auth: {
    persistSession: true,
    storageKey: 'finalactrack-auth',
    storage: typeof window !== 'undefined' ? window.localStorage : undefined,
    autoRefreshToken: true,
    detectSessionInUrl: true
  }
})

// Utility function to extract Google profile picture URL from user metadata
export const extractGoogleAvatar = (user: any): string | null => {
  if (!user?.user_metadata) {
    console.log('🔍 No user_metadata found in user object')
    return null
  }

  console.log('🔍 User metadata structure:', JSON.stringify(user.user_metadata, null, 2))

  // Try different possible paths for the Google profile picture
  const possiblePaths = [
    user.user_metadata.picture,
    user.user_metadata.avatar_url,
    user.user_metadata.photoURL,
    user.user_metadata.image,
    user.user_metadata.profile_picture,
    // Also check for nested provider data
    user.user_metadata.provider_id?.picture,
    user.user_metadata.provider_id?.avatar_url,
    user.user_metadata.provider_id?.photoURL,
    // Check for Google-specific data
    user.user_metadata.google?.picture,
    user.user_metadata.google?.avatar_url,
    user.user_metadata.google?.photoURL
  ]

  console.log('🔍 Checking possible avatar paths:', possiblePaths.filter(p => p))

  // Return the first non-empty URL found, preferring high quality versions
  for (const path of possiblePaths) {
    if (path && typeof path === 'string' && path.trim()) {
      let avatarUrl = path.trim()

      // Convert Google profile picture URLs to high quality versions
      if (avatarUrl.includes('lh3.googleusercontent.com') && avatarUrl.includes('=s')) {
        // Replace low quality parameter (=s96-c, =s50-c, etc.) with high quality (=s400-c)
        avatarUrl = avatarUrl.replace(/=s\d+-c/, '=s400-c')
        console.log('🔧 Upgraded Google avatar to high quality:', avatarUrl)
      }

      console.log('✅ Found avatar URL:', avatarUrl)
      return avatarUrl
    }
  }

  console.log('❌ No avatar URL found in user metadata')
  return null
}