'use client'

import { createContext, useContext, useEffect, useState, useRef } from 'react'
import { User, Session } from '@supabase/supabase-js'
import { supabase } from '@/lib/supabase'

interface AuthContextType {
  user: User | null
  loading: boolean
  signIn: (email: string, password: string) => Promise<{ error: Error | null }>
  signUp: (email: string, password: string, userData: Record<string, any>) => Promise<{ error: Error | null; data?: { user: User | null; session: Session | null } | null }>
  signInWithGoogle: (redirectPath?: string) => Promise<{ error: Error | null }>
  signOut: () => Promise<void>
  refreshSession: () => Promise<boolean>
  checkAndRefreshSession: () => Promise<boolean>
  forgotPassword: (email: string) => Promise<{ error: Error | null }>
}

const AuthContext = createContext<AuthContextType | undefined>(undefined)

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const [user, setUser] = useState<User | null>(null)
  const [loading, setLoading] = useState(true)
  const [refreshInterval, setRefreshInterval] = useState<NodeJS.Timeout | null>(null)
  const inactivityTimerRef = useRef<NodeJS.Timeout | null>(null)

  // Function to validate user profile exists
  const validateUserProfile = async (userId: string): Promise<boolean> => {
    try {
      const { data, error } = await supabase
        .from('user_profiles')
        .select('id')
        .eq('id', userId)
        .maybeSingle()

      if (error && error.code !== 'PGRST116') {
        // PGRST116 is "not found" error, which is expected if profile doesn't exist
        console.error('Error checking user profile:', error)
        return false
      }

      // Profile exists if data is not null
      return data !== null
    } catch (error) {
      console.error('Exception in validateUserProfile:', error)
      return false
    }
  }

  useEffect(() => {
    // Get initial session
    const getInitialSession = async () => {
      try {
        const { data: { session }, error } = await supabase.auth.getSession()
        if (error) {
          console.error('Error getting session:', error)
        }
        // Initial session check
        
        if (session) {
          // Check if we're on the registration page - allow users without profiles there
          const isRegistrationPage = typeof window !== 'undefined' && 
            (window.location.pathname === '/register' || window.location.pathname.startsWith('/register'))
          
        // Check if we're on login or registration page - allow users without profiles there temporarily
        const isLoginOrRegisterPage = typeof window !== 'undefined' && 
          (window.location.pathname === '/login' || 
           window.location.pathname === '/register' || 
           window.location.pathname.startsWith('/register'))
        
        if (isLoginOrRegisterPage) {
          // On login/registration page, allow user without profile temporarily
          // Login page will check and show modal, registration page will create profile
          console.log('📝 Login/Registration page detected, allowing user without profile temporarily')
          setUser(session.user)
        } else {
          // Not on login/registration page, validate profile exists
          const hasProfile = await validateUserProfile(session.user.id)
          
          if (hasProfile) {
            setUser(session.user)
          } else {
            console.log('⚠️ User profile not found, signing out user')
            // Profile doesn't exist, sign out the user
            await supabase.auth.signOut()
            setUser(null)
          }
        }
        } else {
          // Check if we're on a password reset page
          const urlParams = new URLSearchParams(window.location.search)
          const token = urlParams.get('token')
          const access_token = urlParams.get('access_token')
          const refresh_token = urlParams.get('refresh_token')
          
          if (token || access_token || refresh_token) {
            // We're on a password reset page, don't try to refresh session
            // Password reset page detected, skipping session refresh
            setUser(null)
          } else {
            // Try to refresh the session if no session exists
            // No session found, attempting to refresh
            const refreshed = await refreshSession()
            if (!refreshed) {
              // Session refresh failed, user not authenticated
              setUser(null)
            }
          }
        }
      } catch (error) {
        console.error('Error in getInitialSession:', error)
        setUser(null)
      } finally {
        setLoading(false)
      }
    }

    getInitialSession()

    // Listen for auth changes
    const {
      data: { subscription },
    } = supabase.auth.onAuthStateChange(async (event, session) => {
      // Auth state change detected
      
      if (event === 'SIGNED_OUT') {
        // User signed out
        setUser(null)
        setLoading(false)
        return
      }
      
      if (session?.user) {
        // Check if we're on login or registration page - allow users without profiles there temporarily
        const isLoginOrRegisterPage = typeof window !== 'undefined' && 
          (window.location.pathname === '/login' || 
           window.location.pathname === '/register' || 
           window.location.pathname.startsWith('/register'))
        
        if (isLoginOrRegisterPage) {
          // On login/registration page, allow user without profile temporarily
          // Login page will check and show modal, registration page will create profile
          console.log('📝 Login/Registration page detected during auth change, allowing user without profile temporarily')
          if (event === 'TOKEN_REFRESHED') {
            setUser(session.user)
          } else if (event === 'PASSWORD_RECOVERY') {
            setUser(session.user)
          } else if (event === 'SIGNED_IN') {
            setUser(session.user)
          } else {
            setUser(session.user)
          }
        } else {
          // Not on registration page, validate profile exists
          const hasProfile = await validateUserProfile(session.user.id)
          
          if (hasProfile) {
            // Profile exists, set user
            if (event === 'TOKEN_REFRESHED') {
              // Token refreshed successfully
              setUser(session.user)
            } else if (event === 'PASSWORD_RECOVERY') {
              // Password recovery event detected
              setUser(session.user)
            } else if (event === 'SIGNED_IN') {
              // User signed in
              setUser(session.user)
            } else {
              setUser(session.user)
            }
          } else {
            // Profile doesn't exist, sign out the user
            console.log('⚠️ User profile not found during auth state change, signing out')
            await supabase.auth.signOut()
            setUser(null)
          }
        }
      } else {
        setUser(null)
      }
      
      setLoading(false)
    })

    return () => subscription.unsubscribe()
  }, [])

  // Set up periodic token refresh
  useEffect(() => {
    if (user) {
      // Clear any existing interval
      if (refreshInterval) {
        clearInterval(refreshInterval)
      }

      // Set up new interval to refresh token every 50 minutes (tokens typically expire in 1 hour)
      const interval = setInterval(async () => {
        // Performing periodic token refresh
        // refreshSession already validates profile, so this will auto-logout if profile is deleted
        await refreshSession()
      }, 50 * 60 * 1000) // 50 minutes

      setRefreshInterval(interval)

      return () => {
        if (interval) {
          clearInterval(interval)
        }
      }
    } else {
      // Clear interval if no user
      if (refreshInterval) {
        clearInterval(refreshInterval)
        setRefreshInterval(null)
      }
    }
  }, [user])

  // Set up inactivity timer for automatic logout after 2 minutes
  useEffect(() => {
    if (!user) {
      // Clear inactivity timer if no user
      if (inactivityTimerRef.current) {
        clearTimeout(inactivityTimerRef.current)
        inactivityTimerRef.current = null
      }
      return
    }

    // Function to reset the inactivity timer
    const resetInactivityTimer = () => {
      // Clear existing timer
      if (inactivityTimerRef.current) {
        clearTimeout(inactivityTimerRef.current)
      }

      // Set new timer for 2 minutes (120000 ms)
      inactivityTimerRef.current = setTimeout(async () => {
        console.log('⏰ User inactive for 2 minutes, logging out...')
        await supabase.auth.signOut()
      }, 2 * 60 * 1000) // 2 minutes
    }

    // Initial timer setup
    resetInactivityTimer()

    // Events that indicate user activity
    const activityEvents = ['mousedown', 'mousemove', 'keypress', 'scroll', 'touchstart', 'click']
    
    // Add event listeners for user activity
    activityEvents.forEach(event => {
      window.addEventListener(event, resetInactivityTimer, true)
    })

    // Cleanup function
    return () => {
      if (inactivityTimerRef.current) {
        clearTimeout(inactivityTimerRef.current)
        inactivityTimerRef.current = null
      }
      activityEvents.forEach(event => {
        window.removeEventListener(event, resetInactivityTimer, true)
      })
    }
  }, [user])

  const signIn = async (email: string, password: string) => {
    const { error } = await supabase.auth.signInWithPassword({
      email,
      password,
    })
    return { error }
  }

  const signUp = async (email: string, password: string, userData: Record<string, any>) => {
    try {
      // Sign up without email confirmation
      const { error, data } = await supabase.auth.signUp({
        email,
        password,
        options: {
          data: userData,
          emailRedirectTo: `https://finalacetrack.vercel.app/login`,
        },
      })

      return { error, data }
    } catch (error) {
      return { error: error as Error, data: null }
    }
  }

  const signInWithGoogle = async (redirectPath: string = '/login') => {
    try {
      if (typeof window === 'undefined') {
        return { error: new Error('Window is not available') }
      }

      const redirectUrl = `${window.location.origin}${redirectPath}`
      
      // Log for debugging - check browser console to verify the URL
      console.log('🔍 Google OAuth Debug Info:')
      console.log('  - Current origin:', window.location.origin)
      console.log('  - Redirect path:', redirectPath)
      console.log('  - Full redirect URL:', redirectUrl)
      console.log('  - Expected: http://localhost:3000' + redirectPath)
      
      // Warn if redirect URL doesn't match localhost (for development)
      if (!redirectUrl.includes('localhost') && !redirectUrl.includes('127.0.0.1')) {
        console.warn('⚠️ Warning: Redirect URL is not localhost. Make sure this is intentional for production.')
      }
      
      const { error } = await supabase.auth.signInWithOAuth({
        provider: 'google',
        options: {
          redirectTo: redirectUrl,
          queryParams: {
            // Force the redirect URL to be used
            redirect_to: redirectUrl,
          },
        },
      })
      
      if (error) {
        console.error('❌ Google OAuth Error:', error)
      }
      
      return { error }
    } catch (error) {
      console.error('❌ Exception in signInWithGoogle:', error)
      return { error: error as Error }
    }
  }

  const signOut = async () => {
    try {
      const { error } = await supabase.auth.signOut()
      if (error) {
        console.error('Error signing out:', error)
      }
    } catch (error) {
      console.error('Error in signOut:', error)
    }
  }

  // Function to check if token needs refresh
  const shouldRefreshToken = (session: any) => {
    if (!session?.access_token) return false
    
    try {
      const token = JSON.parse(atob(session.access_token.split('.')[1]))
      const now = Math.floor(Date.now() / 1000)
      const expiresAt = token.exp
      
      // Refresh if token expires in less than 10 minutes
      return (expiresAt - now) < 600
    } catch (error) {
      console.error('Error parsing token:', error)
      return false
    }
  }

  // Function to refresh session
  const refreshSession = async () => {
    try {
      // Attempting to refresh session
      
      // First check if we have a refresh token in storage
      const currentSession = await supabase.auth.getSession()
      if (!currentSession.data.session?.refresh_token) {
        // No refresh token available
        return false
      }

      // Check if token needs refresh
      if (currentSession.data.session && shouldRefreshToken(currentSession.data.session)) {
        // Token is about to expire, refreshing
      }

      const { data, error } = await supabase.auth.refreshSession()
      if (error) {
        console.error('Error refreshing session:', error)
        // If refresh fails, clear the user state
        setUser(null)
        return false
      }
      
      if (data.session) {
        // Check if we're on login or registration page - allow users without profiles there temporarily
        const isLoginOrRegisterPage = typeof window !== 'undefined' && 
          (window.location.pathname === '/login' || 
           window.location.pathname === '/register' || 
           window.location.pathname.startsWith('/register'))
        
        if (isLoginOrRegisterPage) {
          // On login/registration page, allow user without profile temporarily
          setUser(data.session.user)
          return true
        } else {
          // Not on registration page, validate profile exists
          const hasProfile = await validateUserProfile(data.session.user.id)
          
          if (hasProfile) {
            // Session refreshed successfully and profile exists
            setUser(data.session.user)
            return true
          } else {
            // Profile doesn't exist, sign out the user
            console.log('⚠️ User profile not found during session refresh, signing out')
            await supabase.auth.signOut()
            setUser(null)
            return false
          }
        }
      } else {
        // No session returned from refresh
        setUser(null)
        return false
      }
    } catch (error) {
      console.error('Error in refreshSession:', error)
      setUser(null)
      return false
    }
  }

  // Function to check and refresh session if needed
  const checkAndRefreshSession = async () => {
    try {
      const { data: { session } } = await supabase.auth.getSession()
      
      if (!session) {
        // No session to check
        return false
      }

      if (shouldRefreshToken(session)) {
        // Token needs refresh, refreshing
        return await refreshSession()
      } else {
        // Token is still valid
        return true
      }
    } catch (error) {
      console.error('Error checking session:', error)
      return false
    }
  }

  // Rate limiting for email requests (for password reset only)
  const emailRequestTimes = new Map<string, number>()
  const EMAIL_RATE_LIMIT_MS = 60000 // 60 seconds between requests

  // Function to send forgot password email
  const forgotPassword = async (email: string) => {
    try {
      // Check rate limiting
      const now = Date.now()
      const lastRequestTime = emailRequestTimes.get(email)
      
      if (lastRequestTime && (now - lastRequestTime) < EMAIL_RATE_LIMIT_MS) {
        const remainingTime = Math.ceil((EMAIL_RATE_LIMIT_MS - (now - lastRequestTime)) / 1000)
        return { 
          error: new Error(`Please wait ${remainingTime} seconds before requesting another email.`) 
        }
      }

      // First check if the email exists in the user_profiles table
      const { data: profileData, error: profileError } = await supabase
        .from('user_profiles')
        .select('id')
        .eq('username', email)
        .single()

      if (profileError && profileError.code !== 'PGRST116') {
        // If there's an error other than "no rows returned", return the error
        return { error: profileError }
      }

      if (!profileData) {
        // Email doesn't exist in user_profiles, return a formal message
        return { 
          error: new Error('The email address you entered is not registered in our system.') 
        }
      }

      // Send password reset email
      const { error } = await supabase.auth.resetPasswordForEmail(email, {
        redirectTo: `https://finalacetrack.vercel.app/reset-password`,
      })

      if (error) {
        return { error }
      }

      if (!error) {
        // Update rate limiting timestamp
        emailRequestTimes.set(email, now)
      }

      return { error: null }
    } catch (error) {
      // If any error occurs during the check, fall back to the original behavior
      const { error: resetError } = await supabase.auth.resetPasswordForEmail(email, {
        redirectTo: `https://finalacetrack.vercel.app/reset-password`,
      })
      return { error: resetError }
    }
  }

  const value = {
    user,
    loading,
    signIn,
    signUp,
    signInWithGoogle,
    signOut,
    refreshSession,
    checkAndRefreshSession,
    forgotPassword,
  }

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>
}

export function useAuth() {
  const context = useContext(AuthContext)
  if (context === undefined) {
    throw new Error('useAuth must be used within an AuthProvider')
  }
  return context
}
