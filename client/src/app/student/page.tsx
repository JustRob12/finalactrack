'use client'

import { useState, useEffect } from 'react'
import { useRouter } from 'next/navigation'
import { useAuth } from '@/contexts/AuthContext'
import { supabase } from '@/lib/supabase'
import { User, LogOut, ChevronDown, Home, QrCode, Settings } from 'lucide-react'

// Import components
import Dashboard from './components/dashboard'
import QRCodeComponent from './components/qrcode'
import Profile from './components/profile'

interface UserProfile {
  id: string
  student_id: string
  first_name: string
  middle_initial?: string
  last_name: string
  course_id: number
  year_level: string
  role_id?: number
  avatar?: string
  course?: {
    course_name: string
    short: string
  }
}

export default function StudentLayout() {
  const { user, signOut } = useAuth()
  const router = useRouter()
  const [profile, setProfile] = useState<UserProfile | null>(null)
  const [loading, setLoading] = useState(true)
  const [showDropdown, setShowDropdown] = useState(false)
  const [activeTab, setActiveTab] = useState('dashboard')

  useEffect(() => {
    if (!user) {
      router.push('/login')
      return
    }

    fetchUserProfile()
  }, [user, router])

  const createBasicProfile = async () => {
    if (!user?.id) return

    try {
      const basicProfile = {
        id: user.id,
        student_id: user.email?.split('@')[0] || 'Unknown',
        username: user.email || '',
        first_name: 'User',
        last_name: 'Name',
        course_id: 1,
        year_level: '1st Year',
        role_id: 1
      }

      console.log('Creating basic profile:', basicProfile)

      const { error: createError, data: createdProfile } = await supabase
        .from('user_profiles')
        .insert([basicProfile])
        .select(`
          *,
          course:courses(*)
        `)

      if (createError) {
        console.error('Error creating basic profile:', createError)
        // Use fallback profile
        setProfile({
          id: user.id,
          student_id: user.email?.split('@')[0] || 'Unknown',
          first_name: 'User',
          last_name: 'Name',
          course_id: 1,
          year_level: '1st Year'
        })
      } else {
        console.log('Basic profile created successfully:', createdProfile)
        
        // Check if the created profile has admin role
        if (createdProfile[0].role_id === 0) {
          console.log('Created profile is admin, redirecting to admin dashboard')
          router.push('/admin')
          return
        }
        
        setProfile(createdProfile[0])
      }
    } catch (error) {
      console.error('Exception creating basic profile:', error)
      // Use fallback profile
      setProfile({
        id: user.id,
        student_id: user.email?.split('@')[0] || 'Unknown',
        first_name: 'User',
        last_name: 'Name',
        course_id: 1,
        year_level: '1st Year'
      })
    }
  }

  const fetchUserProfile = async () => {
    try {
      console.log('Fetching profile for user ID:', user?.id)
      
      // First try to get the user profile with course information
      const { data, error } = await supabase
        .from('user_profiles')
        .select(`
          *,
          course:courses(*)
        `)
        .eq('id', user?.id)
        .maybeSingle() // Use maybeSingle instead of single to avoid 406 error

      console.log('Profile query result:', { data, error })

      if (error) {
        console.error('Error fetching profile:', error)
        // Try to create a basic profile if it doesn't exist
        await createBasicProfile()
      } else if (data) {
        console.log('Profile found:', data)
        
        // Check if user has admin role (role_id = 0) and redirect to admin dashboard
        if (data.role_id === 0) {
          console.log('User is admin, redirecting to admin dashboard')
          router.push('/admin')
          return
        }
        
        setProfile(data)
      } else {
        console.log('No profile found, creating one')
        // No profile found, create a basic one
        await createBasicProfile()
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
                    setActiveTab('profile')
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

      {/* Content Area */}
      <main className="flex-1 p-6 pb-24">
        <div className="max-w-7xl mx-auto">
          {activeTab === 'dashboard' && <Dashboard />}
          {activeTab === 'qrcode' && <QRCodeComponent profile={profile} />}
          {activeTab === 'profile' && <Profile profile={profile} />}
        </div>
      </main>

      {/* Bottom Navigation Bar */}
      <nav className="fixed bottom-0 left-0 right-0 bg-white border-t border-gray-200 px-4 py-2 z-50">
        <div className="flex items-center justify-around max-w-md mx-auto">
          {/* Dashboard */}
          <button
            onClick={() => setActiveTab('dashboard')}
            className={`flex flex-col items-center py-2 px-3 rounded-lg transition-colors ${
              activeTab === 'dashboard' ? 'text-orange-600' : 'text-gray-500'
            }`}
          >
            <Home className={`w-6 h-6 ${activeTab === 'dashboard' ? 'text-orange-600' : 'text-gray-400'}`} />
            <span className="text-xs mt-1">Dashboard</span>
          </button>

          {/* QR Code - Center Item */}
          <button
            onClick={() => setActiveTab('qrcode')}
            className="flex flex-col items-center py-2 px-3 -mt-6"
          >
            <div className="relative">
              <div className="w-14 h-14 bg-orange-600 rounded-full flex items-center justify-center shadow-lg">
                <QrCode className="w-7 h-7 text-white" />
              </div>
              <div className="absolute inset-0 w-14 h-14 bg-orange-600 rounded-full opacity-20 animate-ping"></div>
            </div>
            <span className="text-xs mt-1 text-gray-500">QR Code</span>
          </button>

          {/* Profile */}
          <button
            onClick={() => setActiveTab('profile')}
            className={`flex flex-col items-center py-2 px-3 rounded-lg transition-colors ${
              activeTab === 'profile' ? 'text-orange-600' : 'text-gray-500'
            }`}
          >
            <Settings className={`w-6 h-6 ${activeTab === 'profile' ? 'text-orange-600' : 'text-gray-400'}`} />
            <span className="text-xs mt-1">Profile</span>
          </button>
        </div>
      </nav>
    </div>
  )
}
