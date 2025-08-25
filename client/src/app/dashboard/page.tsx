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
        .select()

      if (createError) {
        console.error('Error creating basic profile:', createError)
        // Use fallback profile
        return {
          id: user.id,
          student_id: user.email?.split('@')[0] || 'Unknown',
          first_name: 'User',
          last_name: 'Name',
          course_id: 1,
          year_level: '1st Year'
        }
      } else {
        console.log('Basic profile created successfully:', createdProfile)
        return createdProfile[0]
      }
    } catch (error) {
      console.error('Exception creating basic profile:', error)
      // Use fallback profile
      return {
        id: user.id,
        student_id: user.email?.split('@')[0] || 'Unknown',
        first_name: 'User',
        last_name: 'Name',
        course_id: 1,
        year_level: '1st Year'
      }
    }
  }

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
        // Try to create a basic profile if it doesn't exist
        const profile = await createBasicProfile()
        if (profile.role_id === 0) {
          console.log('Created profile is admin, redirecting to admin dashboard')
          router.push('/admin')
          return
        } else {
          console.log('Created profile is student, redirecting to student dashboard')
          router.push('/student')
          return
        }
      } else if (data) {
        console.log('Profile found:', data)
        
        // Check if user has admin role (role_id = 0) and redirect to admin dashboard
        if (data.role_id === 0) {
          console.log('User is admin, redirecting to admin dashboard')
          router.push('/admin')
          return
        } else {
          // Redirect students to the new student dashboard
          console.log('User is student, redirecting to student dashboard')
          router.push('/student')
          return
        }
      } else {
        console.log('No profile found, creating one')
        // No profile found, create a basic one
        const profile = await createBasicProfile()
        if (profile.role_id === 0) {
          console.log('Created profile is admin, redirecting to admin dashboard')
          router.push('/admin')
          return
        } else {
          console.log('Created profile is student, redirecting to student dashboard')
          router.push('/student')
          return
        }
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
