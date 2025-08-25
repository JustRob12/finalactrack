'use client'

import { createContext, useContext, useEffect, useState } from 'react'
import { User, Session } from '@supabase/supabase-js'
import { supabase } from '@/lib/supabase'

interface AuthContextType {
  user: User | null
  loading: boolean
  signIn: (email: string, password: string) => Promise<{ error: Error | null }>
  signUp: (email: string, password: string, userData: Record<string, any>) => Promise<{ error: Error | null; data?: { user: User | null; session: Session | null } }>
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
        console.log('Initial session:', session?.user?.email || 'No session')
        
        if (session) {
          setUser(session.user)
        } else {
          // Try to refresh the session if no session exists
          console.log('No session found, attempting to refresh...')
          const refreshed = await refreshSession()
          if (!refreshed) {
            console.log('Session refresh failed, user not authenticated')
            setUser(null)
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
      console.log('Auth state change:', event, session?.user?.email || 'No user')
      
      if (event === 'TOKEN_REFRESHED') {
        console.log('Token refreshed successfully')
        setUser(session?.user ?? null)
      } else if (event === 'SIGNED_OUT') {
        console.log('User signed out')
        setUser(null)
      } else if (event === 'SIGNED_IN') {
        console.log('User signed in')
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
        console.log('Performing periodic token refresh...')
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
    const { error, data } = await supabase.auth.signUp({
      email,
      password,
      options: {
        data: userData,
      },
    })
    return { error, data }
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
      console.log('Attempting to refresh session...')
      
      // First check if we have a refresh token in storage
      const currentSession = await supabase.auth.getSession()
      if (!currentSession.data.session?.refresh_token) {
        console.log('No refresh token available')
        return false
      }

      // Check if token needs refresh
      if (currentSession.data.session && shouldRefreshToken(currentSession.data.session)) {
        console.log('Token is about to expire, refreshing...')
      }

      const { data, error } = await supabase.auth.refreshSession()
      if (error) {
        console.error('Error refreshing session:', error)
        // If refresh fails, clear the user state
        setUser(null)
        return false
      }
      
      if (data.session) {
        console.log('Session refreshed successfully for:', data.session.user.email)
        setUser(data.session.user)
        return true
      } else {
        console.log('No session returned from refresh')
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
        console.log('No session to check')
        return false
      }

      if (shouldRefreshToken(session)) {
        console.log('Token needs refresh, refreshing...')
        return await refreshSession()
      } else {
        console.log('Token is still valid')
        return true
      }
    } catch (error) {
      console.error('Error checking session:', error)
      return false
    }
  }

  // Function to send forgot password email
  const forgotPassword = async (email: string) => {
    const { error } = await supabase.auth.resetPasswordForEmail(email, {
      redirectTo: `https://finalacetrack.vercel.app/reset-password`,
    })
    return { error }
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
