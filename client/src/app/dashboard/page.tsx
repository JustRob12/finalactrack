'use client'

import { useState, useEffect } from 'react'
import { useRouter } from 'next/navigation'
import { useAuth } from '@/contexts/AuthContext'
import { supabase } from '@/lib/supabase'

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

export default function DashboardPage() {
  const { user } = useAuth()
  const router = useRouter()
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    if (!user) {
      router.push('/login')
      return
    }

    fetchUserProfile()
  }, [user, router])

  const fetchUserProfile = async () => {
    try {
      // Fetching profile for user
      
      // First try to get the user profile with a simpler query
      const { data, error } = await supabase
        .from('user_profiles')
        .select('*')
        .eq('id', user?.id)
        .maybeSingle() // Use maybeSingle instead of single to avoid 406 error

      // Profile query completed

      if (error) {
        console.error('Error fetching profile:', error)
        // Profile doesn't exist - DO NOT CREATE - redirect to login
        router.push('/login')
        return
      } else if (data) {
        // Profile found
        
        // Check if user has admin role (role_id = 0) and redirect to admin dashboard
        if (data.role_id === 0) {
          // User is admin, redirecting to admin dashboard
          router.push('/admin')
          return
        } else {
          // Redirect students to the new student dashboard
          // User is student, redirecting to student dashboard
          router.push('/student')
          return
        }
      } else {
        // No profile found - DO NOT CREATE - redirect to login
        router.push('/login')
        return
      }
    } catch (error) {
      console.error('Error fetching profile:', error)
      // Fallback - redirect to student dashboard
      router.push('/student')
    } finally {
      setLoading(false)
    }
  }

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
    <div className="min-h-screen bg-white flex items-center justify-center">
      <div className="text-center">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-orange-600 mx-auto"></div>
        <p className="mt-4 text-gray-600">Redirecting...</p>
      </div>
    </div>
  )
}
