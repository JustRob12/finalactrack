'use client'

import { createContext, useContext, useEffect, useState } from 'react'
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
}

const AuthContext = createContext<AuthContextType | undefined>(undefined)

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const [user, setUser] = useState<User | null>(null)
  const [loading, setLoading] = useState(true)

  // Function to validate user profile exists
  const validateUserProfile = async (userId: string): Promise<boolean> => {
    try {
      const { data, error } = await supabase
        .from('user_profiles')
        .select('id')
        .eq('id', userId)
        .maybeSingle()

      if (error && error.code !== 'PGRST116') {
        console.error('Error checking user profile:', error)
        return false
      }

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

        if (session) {
          // Check if we're on auth-related pages
          const isAuthPage = typeof window !== 'undefined' && 
            (window.location.pathname === '/login' || 
             window.location.pathname === '/register' || 
             window.location.pathname.startsWith('/register'))
          
          if (isAuthPage) {
            // On auth pages, allow user without profile temporarily
            console.log('📝 Auth page detected, allowing user without profile temporarily')
            setUser(session.user)
          } else {
            // Validate profile exists
            const hasProfile = await validateUserProfile(session.user.id)
            
            if (hasProfile) {
              setUser(session.user)
            } else {
              console.log('⚠️ User profile not found, signing out user')
              await supabase.auth.signOut()
              setUser(null)
            }
          }
        } else {
          setUser(null)
        }
      } catch (error) {
        console.error('Error in getInitialSession:', error)
        setUser(null)
      } finally {
        setLoading(false)
      }
    }

    getInitialSession()

    // Listen for auth state changes
    const { data: { subscription } } = supabase.auth.onAuthStateChange(
      async (event, session) => {
        console.log('🔐 Auth state changed:', event)
        
        if (session?.user) {
          // Validate profile for non-auth pages
          const isAuthPage = typeof window !== 'undefined' && 
            (window.location.pathname === '/login' || 
             window.location.pathname === '/register' || 
             window.location.pathname.startsWith('/register'))
          
          if (!isAuthPage) {
            const hasProfile = await validateUserProfile(session.user.id)
            if (!hasProfile) {
              console.log('⚠️ Profile validation failed during auth state change')
              await supabase.auth.signOut()
              setUser(null)
              return
            }
          }
          
          setUser(session.user)
        } else {
          setUser(null)
        }
        
        setLoading(false)
      }
    )

    return () => {
      subscription.unsubscribe()
    }
  }, [])

  const signIn = async (email: string, password: string) => {
    try {
      const { data, error } = await supabase.auth.signInWithPassword({
        email,
        password,
      })

      if (error) throw error

      return { error: null }
    } catch (error: any) {
      console.error('Sign in error:', error)
      return { error }
    }
  }

  const signUp = async (email: string, password: string, userData: Record<string, any>) => {
    try {
      const { data, error } = await supabase.auth.signUp({
        email,
        password,
        options: {
          data: userData,
        },
      })

      if (error) throw error

      return { error: null, data }
    } catch (error: any) {
      console.error('Sign up error:', error)
      return { error, data: null }
    }
  }

  const signInWithGoogle = async (redirectPath?: string) => {
    try {
      const redirectTo = typeof window !== 'undefined' 
        ? `${window.location.origin}/auth/callback${redirectPath ? `?next=${redirectPath}` : ''}`
        : undefined

      const { data, error } = await supabase.auth.signInWithOAuth({
        provider: 'google',
        options: {
          redirectTo,
          queryParams: {
            access_type: 'offline',
            prompt: 'consent',
          },
        },
      })

      if (error) throw error

      return { error: null }
    } catch (error: any) {
      console.error('Google sign in error:', error)
      return { error }
    }
  }

  const signOut = async () => {
    try {
      await supabase.auth.signOut()
      setUser(null)
    } catch (error) {
      console.error('Sign out error:', error)
    }
  }

  const refreshSession = async (): Promise<boolean> => {
    try {
      const { data: { session }, error } = await supabase.auth.refreshSession()
      
      if (error) {
        console.error('Session refresh error:', error)
        return false
      }

      if (session?.user) {
        setUser(session.user)
        return true
      }

      return false
    } catch (error) {
      console.error('Exception in refreshSession:', error)
      return false
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
