'use client'

import { useState, useEffect } from 'react'
import { useRouter } from 'next/navigation'
import { useAuth } from '@/contexts/AuthContext'
import { supabase } from '@/lib/supabase'
import { User, LogOut, ChevronDown } from 'lucide-react'

interface UserProfile {
  id: string
  student_id: string
  first_name: string
  middle_initial?: string
  last_name: string
  course_id: number
  year_level: string
  avatar?: string
  course?: {
    course_name: string
    short: string
  }
}

export default function DashboardPage() {
  const { user, signOut } = useAuth()
  const router = useRouter()
  const [profile, setProfile] = useState<UserProfile | null>(null)
  const [loading, setLoading] = useState(true)
  const [showDropdown, setShowDropdown] = useState(false)

  useEffect(() => {
    if (!user) {
      router.push('/login')
      return
    }

    fetchUserProfile()
  }, [user, router])

  const fetchUserProfile = async () => {
    try {
      console.log('Fetching profile for user ID:', user?.id)
      
      // First try to get the user profile with a simpler query
      const { data, error } = await supabase
        .from('user_profiles')
        .select('*')
        .eq('id', user?.id)
        .maybeSingle() // Use maybeSingle instead of single to avoid 406 error

      console.log('Profile query result:', { data, error })

      if (error) {
        console.error('Error fetching profile:', error)
        // If profile doesn't exist, create a basic profile object
        setProfile({
          id: user?.id || '',
          student_id: user?.email?.split('@')[0] || 'Unknown',
          first_name: 'User',
          last_name: 'Name',
          course_id: 1,
          year_level: '1st Year'
        })
      } else if (data) {
        console.log('Profile found:', data)
        setProfile(data)
      } else {
        console.log('No profile found, using fallback')
        // No profile found, create a basic one
        setProfile({
          id: user?.id || '',
          student_id: user?.email?.split('@')[0] || 'Unknown',
          first_name: 'User',
          last_name: 'Name',
          course_id: 1,
          year_level: '1st Year'
        })
      }
    } catch (error) {
      console.error('Error fetching profile:', error)
      // Fallback profile
      setProfile({
        id: user?.id || '',
        student_id: user?.email?.split('@')[0] || 'Unknown',
        first_name: 'User',
        last_name: 'Name',
        course_id: 1,
        year_level: '1st Year'
      })
    } finally {
      setLoading(false)
    }
  }

  const handleSignOut = async () => {
    try {
      await signOut()
      router.push('/login')
    } catch (error) {
      console.error('Error signing out:', error)
      router.push('/login')
    }
  }

  // Close dropdown when clicking outside
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      const target = event.target as Element
      if (!target.closest('.user-dropdown')) {
        setShowDropdown(false)
      }
    }

    document.addEventListener('mousedown', handleClickOutside)
    return () => document.removeEventListener('mousedown', handleClickOutside)
  }, [])

  if (loading) {
    return (
      <div className="min-h-screen bg-white flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-gray-400 mx-auto"></div>
          <p className="mt-4 text-gray-600">Loading...</p>
        </div>
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-white">
      {/* Top Bar */}
      <header className="bg-white border-b border-gray-200 px-6 py-4">
        <div className="flex items-center justify-between">
          <div className="flex items-center space-x-3">
            <h1 className="text-xl font-semibold text-gray-900">FinalActrack</h1>
          </div>

          {/* User Dropdown */}
          <div className="relative user-dropdown">
            <button
              onClick={() => setShowDropdown(!showDropdown)}
              className="flex items-center space-x-2 p-2 rounded-lg hover:bg-gray-100 transition-colors"
            >
              <div className="w-8 h-8 bg-gray-300 rounded-full flex items-center justify-center">
                <User className="w-4 h-4 text-gray-600" />
              </div>
              <span className="text-sm font-medium text-gray-700">
                {profile?.first_name} {profile?.last_name}
              </span>
              <ChevronDown className="w-4 h-4 text-gray-500" />
            </button>

            {/* Dropdown Menu */}
            {showDropdown && (
              <div className="absolute right-0 mt-2 w-48 bg-white rounded-lg shadow-lg border border-gray-200 py-2 z-50">
                <button
                  onClick={() => {
                    setShowDropdown(false)
                    // Add profile functionality here
                  }}
                  className="w-full text-left px-4 py-2 text-sm text-gray-700 hover:bg-gray-100 transition-colors"
                >
                  Profile
                </button>
                <button
                  onClick={() => {
                    setShowDropdown(false)
                    handleSignOut()
                  }}
                  className="w-full text-left px-4 py-2 text-sm text-gray-700 hover:bg-gray-100 transition-colors flex items-center"
                >
                  <LogOut className="w-4 h-4 mr-2" />
                  Logout
                </button>
              </div>
            )}
          </div>
        </div>
      </header>

      {/* Empty Content Area */}
      <main className="flex-1">
        {/* Completely empty - no content */}
      </main>
    </div>
  )
}
