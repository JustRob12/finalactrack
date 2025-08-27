'use client'

import { createContext, useContext, useEffect, useState } from 'react'
import { User, Session } from '@supabase/supabase-js'
import { supabase } from '@/lib/supabase'

interface AuthContextType {
  user: User | null
  loading: boolean
  signIn: (email: string, password: string) => Promise<{ error: Error | null }>
  signUp: (email: string, password: string, userData: Record<string, any>) => Promise<{ error: Error | null; data?: { user: User | null; session: Session | null } | null }>
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
          setUser(session.user)
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
      
      if (event === 'TOKEN_REFRESHED') {
        // Token refreshed successfully
        setUser(session?.user ?? null)
      } else if (event === 'PASSWORD_RECOVERY') {
        // Password recovery event detected
        setUser(session?.user ?? null)
      } else if (event === 'SIGNED_OUT') {
        // User signed out
        setUser(null)
      } else if (event === 'SIGNED_IN') {
        // User signed in
        setUser(session?.user ?? null)
      } else {
        setUser(session?.user ?? null)
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
        // Session refreshed successfully
        setUser(data.session.user)
        return true
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
