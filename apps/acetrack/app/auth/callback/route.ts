import { NextResponse } from 'next/server'
import { createClient } from '@supabase/supabase-js'

export async function GET(request: Request) {
  const { searchParams, origin } = new URL(request.url)
  const code = searchParams.get('code')
  const next = searchParams.get('next') ?? '/login'
  
  console.log('🔐 OAuth Callback received')
  console.log('Code present:', !!code)
  console.log('Next path:', next)

  if (code) {
    try {
      const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!
      const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
      
      console.log('🔧 Creating Supabase client for code exchange')
      
      const supabase = createClient(supabaseUrl, supabaseAnonKey, {
        auth: {
          persistSession: false, // Don't persist in server-side route
          detectSessionInUrl: false,
          flowType: 'pkce'
        }
      })

      console.log('🔄 Exchanging code for session...')
      const { data, error } = await supabase.auth.exchangeCodeForSession(code)
      
      if (error) {
        console.error('❌ Code exchange error:', error.message)
        return NextResponse.redirect(`${origin}/auth/auth-code-error?error=${encodeURIComponent(error.message)}`)
      }
      
      console.log('✅ Code exchange successful, user:', data.user?.email)
      
      // Check if user profile exists, create if not
      if (data.user) {
        const { data: profile, error: profileError } = await supabase
          .from('user_profiles')
          .select('id')
          .eq('id', data.user.id)
          .maybeSingle()
        
        if (!profile && !profileError) {
          console.log('📝 Creating user profile for OAuth user...')
          
          // Extract name from user metadata
          const fullName = data.user.user_metadata?.full_name || 
                          data.user.user_metadata?.name || 
                          data.user.email?.split('@')[0] || 
                          'User'
          
          const { error: insertError } = await supabase
            .from('user_profiles')
            .insert({
              id: data.user.id,
              first_name: fullName.split(' ')[0] || fullName,
              last_name: fullName.split(' ').slice(1).join(' ') || '',
              email: data.user.email,
              role_id: 1, // Student role
              created_at: new Date().toISOString(),
              updated_at: new Date().toISOString()
            })
          
          if (insertError) {
            console.error('❌ Error creating user profile:', insertError)
          } else {
            console.log('✅ User profile created successfully')
          }
        } else if (profile) {
          console.log('✅ User profile already exists')
        }
      }
      
      const forwardedHost = request.headers.get('x-forwarded-host')
      const isLocalEnv = process.env.NODE_ENV === 'development'
      
      // Create response with redirect
      let redirectUrl = `${origin}${next}`
      if (!isLocalEnv && forwardedHost) {
        redirectUrl = `https://${forwardedHost}${next}`
      }
      
      console.log('🎯 Redirecting to:', redirectUrl)
      
      // Create response and set session cookies
      const response = NextResponse.redirect(redirectUrl)
      
      // Set the session cookies manually
      if (data.session) {
        response.cookies.set({
          name: 'sb-access-token',
          value: data.session.access_token,
          path: '/',
          sameSite: 'lax',
          httpOnly: true,
          secure: !isLocalEnv
        })
        
        response.cookies.set({
          name: 'sb-refresh-token',
          value: data.session.refresh_token,
          path: '/',
          sameSite: 'lax',
          httpOnly: true,
          secure: !isLocalEnv
        })
      }
      
      return response
    } catch (err) {
      console.error('❌ Unexpected error in callback:', err)
      return NextResponse.redirect(`${origin}/auth/auth-code-error?error=unexpected`)
    }
  }

  console.log('❌ No code present in callback')
  // Return error page with instructions
  return NextResponse.redirect(`${origin}/auth/auth-code-error?error=no_code`)
}
