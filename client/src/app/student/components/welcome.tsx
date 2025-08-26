'use client'

import { Users } from 'lucide-react'

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

interface WelcomeProps {
  profile: UserProfile | null
}

export default function Welcome({ profile }: WelcomeProps) {
  return (
    <div className="text-center py-12">
      <div className="w-24 h-24 bg-orange-100 rounded-full mx-auto mb-6 flex items-center justify-center">
        <Users className="w-12 h-12 text-orange-600" />
      </div>
      <h2 className="text-3xl font-bold text-gray-900 mb-4">Welcome!</h2>
      <p className="text-xl text-gray-600 mb-6">
        Hello, {profile?.first_name} {profile?.last_name}!
      </p>
      <p className="text-gray-600 max-w-md mx-auto">
        Welcome to Acetrack. Here you can view events, check your attendance, and manage your profile.
      </p>
    </div>
  )
}
