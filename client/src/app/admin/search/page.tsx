'use client'

import { useState, useEffect } from 'react'
import { useRouter } from 'next/navigation'
import { useAuth } from '@/contexts/AuthContext'
import { supabase } from '@/lib/supabase'
import { ArrowLeft, Search, User, BookOpen, GraduationCap } from 'lucide-react'

interface StudentProfile {
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
  } | null
}

export default function SearchStudentPage() {
  const { user, checkAndRefreshSession } = useAuth()
  const router = useRouter()
  
  const [loading, setLoading] = useState(true)
  const [searchQuery, setSearchQuery] = useState('')
  const [searching, setSearching] = useState(false)
  const [student, setStudent] = useState<StudentProfile | null>(null)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    const checkSession = async () => {
      if (!user) {
        const sessionValid = await checkAndRefreshSession()
        if (!sessionValid) {
          router.push('/login')
          return
        }
      }

      if (user) {
        // Check if user is admin
        const { data, error } = await supabase
          .from('user_profiles')
          .select('role_id')
          .eq('id', user?.id)
          .maybeSingle()

        if (error || !data || data.role_id !== 0) {
          router.push('/dashboard')
          return
        }
      }
      setLoading(false)
    }

    checkSession()
  }, [user, router, checkAndRefreshSession])

  const handleSearch = async () => {
    if (!searchQuery.trim()) {
      setError('Please enter a Student ID')
      return
    }

    setSearching(true)
    setError(null)
    setStudent(null)

    try {
      const { data, error } = await supabase
        .from('user_profiles')
        .select(`
          id,
          student_id,
          first_name,
          middle_initial,
          last_name,
          course_id,
          year_level,
          avatar,
          course:courses!inner(
            course_name,
            short
          )
        `)
        .eq('student_id', searchQuery.trim())
        .eq('role_id', 1) // Only students
        .maybeSingle()

      if (error) {
        console.error('Error searching for student:', error)
        setError('Failed to search for student. Please try again.')
        return
      }

      if (!data) {
        setError('No student found with this Student ID')
        return
      }

      // Transform the data to match the interface
      const transformedData = {
        ...data,
        course: Array.isArray(data.course) ? data.course[0] : data.course
      }

      setStudent(transformedData)
    } catch (error) {
      console.error('Error searching for student:', error)
      setError('An unexpected error occurred. Please try again.')
    } finally {
      setSearching(false)
    }
  }

  const handleKeyPress = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter') {
      handleSearch()
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
    <div className="min-h-screen bg-white">
      {/* Header */}
      <header className="bg-white border-b border-gray-200 px-6 py-4">
        <div className="flex items-center justify-between">
          <div className="flex items-center space-x-3">
            <button
              onClick={() => router.push('/admin')}
              className="flex items-center space-x-2 text-gray-600 hover:text-gray-900 transition-colors"
            >
              <ArrowLeft className="w-5 h-5" />
              <span className="text-sm font-medium">Back to Dashboard</span>
            </button>
          </div>
          <div className="flex items-center space-x-2">
            <Search className="w-6 h-6 text-orange-600" />
            <h1 className="text-xl font-semibold text-gray-900">Search Student</h1>
          </div>
        </div>
      </header>

      {/* Content */}
      <main className="p-6">
        <div className="max-w-2xl mx-auto">
          {/* Search Section */}
          <div className="bg-white rounded-lg shadow-lg p-6 mb-6">
            <h2 className="text-lg font-semibold text-gray-900 mb-4">Search by Student ID</h2>
            
            <div className="flex space-x-3">
              <div className="flex-1">
                <input
                  type="text"
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  onKeyPress={handleKeyPress}
                  placeholder="Enter Student ID (e.g., 2024-1218)"
                  className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-orange-500 focus:border-transparent"
                />
              </div>
              <button
                onClick={handleSearch}
                disabled={searching}
                className="px-6 py-3 bg-orange-600 text-white rounded-lg hover:bg-orange-700 transition-colors disabled:opacity-50 disabled:cursor-not-allowed flex items-center space-x-2"
              >
                {searching ? (
                  <>
                    <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white"></div>
                    <span>Searching...</span>
                  </>
                ) : (
                  <>
                    <Search className="w-4 h-4" />
                    <span>Search</span>
                  </>
                )}
              </button>
            </div>

            {error && (
              <div className="mt-4 p-4 bg-red-50 border border-red-200 rounded-lg">
                <p className="text-red-700 text-sm">{error}</p>
              </div>
            )}
          </div>

          {/* Student Card */}
          {student && (
            <div className="bg-white rounded-lg shadow-lg overflow-hidden border border-gray-200">
              {/* Header */}
              <div className="bg-gradient-to-r from-orange-50 to-orange-100 px-6 py-4">
                <h3 className="text-lg font-semibold text-gray-900">Student Information</h3>
              </div>

              {/* Student Details */}
              <div className="p-6">
                <div className="flex items-start space-x-4">
                  {/* Avatar */}
                  <div className="w-20 h-20 bg-orange-100 rounded-full flex items-center justify-center flex-shrink-0">
                    {student.avatar ? (
                      <img
                        src={student.avatar}
                        alt="Profile"
                        className="w-full h-full object-cover rounded-full"
                      />
                    ) : (
                      <User className="w-10 h-10 text-orange-600" />
                    )}
                  </div>

                  {/* Student Info */}
                  <div className="flex-1 space-y-4">
                    {/* Name and ID */}
                    <div>
                      <h4 className="text-xl font-semibold text-gray-900">
                        {student.first_name} {student.middle_initial} {student.last_name}
                      </h4>
                      <p className="text-sm text-gray-600">Student ID: {student.student_id}</p>
                    </div>



                    {/* Course Info */}
                    <div className="flex items-center space-x-2 text-gray-600">
                      <BookOpen className="w-4 h-4" />
                      <span className="text-sm">
                        {student.course?.course_name} ({student.course?.short})
                      </span>
                    </div>

                    {/* Year Level */}
                    <div className="flex items-center space-x-2 text-gray-600">
                      <GraduationCap className="w-4 h-4" />
                      <span className="text-sm">{student.year_level}</span>
                    </div>
                  </div>
                </div>


              </div>
            </div>
          )}

          {/* Instructions */}
          {!student && !error && (
            <div className="bg-blue-50 border border-blue-200 rounded-lg p-6">
              <div className="flex items-center space-x-2 text-blue-700 mb-2">
                <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                </svg>
                <span className="font-medium">How to Search</span>
              </div>
              <ul className="text-blue-600 text-sm space-y-1">
                <li>• Enter the exact Student ID (e.g., 0008-0008)</li>
                <li>• The search is case-sensitive</li>
                <li>• Only registered students will appear in results</li>
                <li>• Press Enter or click Search to find the student</li>
              </ul>
            </div>
          )}
        </div>
      </main>
    </div>
  )
}
