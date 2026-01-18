'use client'

import { useState, useEffect, Suspense } from 'react'
import { useRouter, useSearchParams } from 'next/navigation'
import Link from 'next/link'
import { useAuth } from '@/contexts/AuthContext'
import { supabase } from '@/lib/supabase'
import { ArrowLeft, X, AlertCircle } from 'lucide-react'
import Image from 'next/image'

function LoginPageContent() {
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')
  const [redirecting, setRedirecting] = useState(false) // Prevent multiple redirects
  const [showRegisterModal, setShowRegisterModal] = useState(false) // Modal for unregistered users
  const { signInWithGoogle, user, signOut } = useAuth()
  const router = useRouter()
  const searchParams = useSearchParams()

  // Handle Google OAuth callback and redirect based on user role
  useEffect(() => {
    const handleGoogleCallback = async () => {
      // Check for OAuth callback indicators (query params or hash fragments)
      const code = searchParams.get('code')
      const accessToken = searchParams.get('access_token')
      const hashParams = typeof window !== 'undefined' ? new URLSearchParams(window.location.hash.substring(1)) : null
      const hashAccessToken = hashParams?.get('access_token')
      const hashCode = hashParams?.get('code')
      
      // Check if we have an OAuth callback (either query param or hash fragment)
      const isOAuthCallback = code || accessToken || hashAccessToken || hashCode
      
      if (isOAuthCallback && !redirecting) {
        console.log('🔐 OAuth callback detected')
        setLoading(true)
        setRedirecting(true) // Prevent multiple redirect attempts
        
        // Wait for user to be available (Supabase processes the callback)
        let attempts = 0
        const maxAttempts = 10
        
        while (!user && attempts < maxAttempts) {
          await new Promise(resolve => setTimeout(resolve, 500))
          attempts++
          
          // Check session directly
          const { data: { session } } = await supabase.auth.getSession()
          if (session?.user) {
            console.log('✅ Session found, user:', session.user.id)
            break
          }
        }
        
        // Get current user (might be set by AuthContext now)
        const { data: { user: currentUser } } = await supabase.auth.getUser()
        const userToCheck = user || currentUser
        
        if (userToCheck) {
          try {
            // Get user email
            const userEmail = userToCheck.email || userToCheck.user_metadata?.email || ''
            
            if (!userEmail) {
              console.error('❌ No email found for user')
              setError('Email not found. Please try again.')
              setLoading(false)
              setRedirecting(false)
              // Sign out the user
              await signOut()
              return
            }

            // Check if user profile exists by ID first (most reliable), then by email
            const { data: profile, error: profileError } = await supabase
              .from('user_profiles')
              .select('role_id, username, id')
              .eq('id', userToCheck.id)
              .maybeSingle()

            if (profileError && profileError.code !== 'PGRST116') {
              // PGRST116 is "not found" error, which is expected if user doesn't exist
              console.error('Error fetching user profile:', profileError)
              setError('Error checking user profile. Please try again.')
              setLoading(false)
              setRedirecting(false)
              await signOut()
              return
            }

            if (profile) {
              // User profile exists, proceed with login
              console.log('✅ User profile found, role_id:', profile.role_id)
              
              // Clear URL hash/query params before redirecting
              if (typeof window !== 'undefined') {
                window.history.replaceState({}, document.title, '/login')
              }
              
              switch (profile.role_id) {
                case 0: // Admin
                  router.push('/admin')
                  break
                case 2: // Scanner
                  router.push('/scanner')
                  break
                default: // Student (role_id = 1) or any other role
                  router.push('/dashboard')
                  break
              }
            } else {
              // User profile does NOT exist - show register modal
              console.log('⚠️ No profile found for email:', userEmail)
              
              // Clear URL hash/query params
              if (typeof window !== 'undefined') {
                window.history.replaceState({}, document.title, '/login')
              }
              
              // Sign out the user since they don't have a profile
              await signOut()
              
              // Show modal asking user to register first
              setShowRegisterModal(true)
              setLoading(false)
              setRedirecting(false)
            }
          } catch (error) {
            console.error('Error checking user profile:', error)
            setError('An error occurred. Please try again.')
            setLoading(false)
            setRedirecting(false)
            await signOut()
          }
        } else {
          console.error('❌ User not found after OAuth callback')
          setError('Authentication failed. Please try again.')
          setLoading(false)
          setRedirecting(false) // Reset on error
        }
      }
    }

    // Run callback handler
    handleGoogleCallback()
  }, [user, searchParams, router, redirecting])

  const handleGoogleSignIn = async () => {
    setError('')
    setLoading(true)
    
    const { error } = await signInWithGoogle()
    
    if (error) {
      setError(error.message || 'Failed to sign in with Google. Please try again.')
      setLoading(false)
    }
    // If successful, user will be redirected to Google, then back here
    // The useEffect will handle the role-based redirect
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-orange-50 to-white flex items-center justify-center p-4">
      {/* Back to Home Button */}
      <button
        onClick={() => router.push('/')}
        className="absolute top-6 left-6 flex items-center space-x-2 text-gray-600 hover:text-gray-900 transition-colors"
      >
        <ArrowLeft className="w-5 h-5" />
        <span className="text-sm font-medium">Back to Home</span>
      </button>

      <div className="w-full max-w-md">
        {/* Logo and Welcome */}
        <div className="text-center mb-8">
          <div className="inline-flex items-center justify-center w-16 h-16 mb-4">
            <Image
              src="/images/aces-logo.png"
              alt="ACES Logo"
              width={64}
              height={64}
              className="rounded-full"
            />
          </div>
          <h1 className="text-3xl font-bold text-gray-900 mb-2">Welcome Back!</h1>
          <p className="text-gray-600">Sign in to your Acetrack account</p>
        </div>

        {/* Login Form */}
        <div className="card">
          {error && (
            <div className="bg-red-50 border border-red-200 text-red-700 px-4 py-3 rounded-lg mb-6">
              {error}
            </div>
          )}

          {/* Google Sign In Button */}
          <button
            type="button"
            onClick={handleGoogleSignIn}
            disabled={loading}
            className="w-full flex items-center justify-center gap-3 bg-white border-2 border-gray-300 hover:border-gray-400 text-gray-700 font-semibold py-3 px-6 rounded-lg transition-all duration-200 shadow-sm hover:shadow-md disabled:opacity-50 disabled:cursor-not-allowed"
          >
            {loading ? (
              <>
                <div className="w-5 h-5 border-2 border-gray-400 border-t-transparent rounded-full animate-spin"></div>
                <span>Signing in...</span>
              </>
            ) : (
              <>
                <svg className="w-5 h-5" viewBox="0 0 24 24">
                  <path
                    fill="#4285F4"
                    d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z"
                  />
                  <path
                    fill="#34A853"
                    d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z"
                  />
                  <path
                    fill="#FBBC05"
                    d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z"
                  />
                  <path
                    fill="#EA4335"
                    d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z"
                  />
                </svg>
                <span>Sign in with Google</span>
              </>
            )}
          </button>

          <div className="mt-6 text-center">
            <p className="text-gray-600">
              Don't have an account?{' '}
              <Link href="/register" className="text-orange-500 hover:text-orange-600 font-semibold">
                Sign up here
              </Link>
            </p>
          </div>
        </div>

        {/* Footer */}
        <div className="text-center mt-8">
          <p className="text-sm text-gray-500">
            © 2025 Acetrack. All rights reserved.
          </p>
        </div>
      </div>

      {/* Please Register First Modal */}
      {showRegisterModal && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-xl shadow-2xl max-w-md w-full p-6 relative">
            {/* Close Button */}
            <button
              onClick={() => setShowRegisterModal(false)}
              className="absolute top-4 right-4 text-gray-400 hover:text-gray-600 transition-colors"
            >
              <X className="w-6 h-6" />
            </button>

            {/* Modal Content */}
            <div className="text-center">
              <div className="w-16 h-16 bg-orange-100 rounded-full flex items-center justify-center mx-auto mb-4">
                <AlertCircle className="w-8 h-8 text-orange-600" />
              </div>
              
              <h2 className="text-2xl font-bold text-gray-900 mb-2">
                You Are Not Yet Registered
              </h2>
              
              <p className="text-gray-600 mb-6">
                Your account is not registered in our system. Please create an account first before signing in.
              </p>

              <div className="flex gap-3">
                <button
                  onClick={() => setShowRegisterModal(false)}
                  className="flex-1 px-4 py-2 border-2 border-gray-300 text-gray-700 font-semibold rounded-lg hover:bg-gray-50 transition-colors"
                >
                  Cancel
                </button>
                <button
                  onClick={() => {
                    setShowRegisterModal(false)
                    router.push('/register')
                  }}
                  className="flex-1 btn-primary"
                >
                  Go to Registration
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}

export default function LoginPage() {
  return (
    <Suspense fallback={
      <div className="min-h-screen bg-gradient-to-br from-orange-50 to-white flex items-center justify-center">
        <div className="text-center">
          <div className="inline-block animate-spin rounded-full h-12 w-12 border-4 border-orange-500 border-t-transparent"></div>
          <p className="mt-4 text-gray-600">Loading...</p>
        </div>
      </div>
    }>
      <LoginPageContent />
    </Suspense>
  )
}
