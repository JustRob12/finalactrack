'use client'

import { useState, useEffect } from 'react'
import { useRouter } from 'next/navigation'
import { useAuth } from '@/contexts/AuthContext'
import { supabase } from '@/lib/supabase'
import { ArrowLeft, Search, User, Calendar, CheckCircle, XCircle } from 'lucide-react'

interface StudentProfile {
  id: string
  student_id: string
  first_name: string
  middle_initial?: string
  last_name: string
  year_level: string
  course?: {
    course_name: string
    short: string
  } | null
}

interface Event {
  id: number
  name: string
  start_datetime: string
  end_datetime: string
}

interface AttendanceStatus {
  event_id: number
  event_name: string
  time_in: string | null
  time_out: string | null
  status: 'present' | 'absent' | 'partial'
}

export default function ScannerSearchPage() {
  const { user, checkAndRefreshSession } = useAuth()
  const router = useRouter()
  
  const [searchId, setSearchId] = useState('')
  const [student, setStudent] = useState<StudentProfile | null>(null)
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [attendanceStatus, setAttendanceStatus] = useState<AttendanceStatus[]>([])
  const [loadingAttendance, setLoadingAttendance] = useState(false)

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
        // Check if user has scanner role (role_id = 2)
        const { data: profile, error } = await supabase
          .from('user_profiles')
          .select('role_id')
          .eq('id', user.id)
          .maybeSingle()

        if (error || !profile || profile.role_id !== 2) {
          router.push('/login')
          return
        }
      }
    }

    checkSession()
  }, [user, router, checkAndRefreshSession])

  const handleSearch = async () => {
    if (!searchId.trim()) {
      setError('Please enter a student ID')
      return
    }

    setLoading(true)
    setError(null)
    setStudent(null)
    setAttendanceStatus([])

    try {
      const { data, error } = await supabase
        .from('user_profiles')
        .select(`
          id,
          student_id,
          first_name,
          middle_initial,
          last_name,
          year_level,
          course:courses!inner(
            course_name,
            short
          )
        `)
        .eq('student_id', searchId.trim())
        .eq('role_id', 1) // Only students
        .maybeSingle()

      if (error) {
        console.error('Error searching for student:', error)
        setError('Error searching for student')
        return
      }

      if (!data) {
        setError('Student not found')
        return
      }

      // Transform the course data to handle the join result
      const transformedData = {
        ...data,
        course: Array.isArray(data.course) ? data.course[0] : data.course
      }

      setStudent(transformedData)
      fetchAttendanceStatus(transformedData.student_id)
    } catch (error) {
      console.error('Error searching for student:', error)
      setError('Error searching for student')
    } finally {
      setLoading(false)
    }
  }

  const fetchAttendanceStatus = async (studentId: string) => {
    setLoadingAttendance(true)
    try {
      // Fetch all events
      const { data: events, error: eventsError } = await supabase
        .from('events')
        .select('id, name, start_datetime, end_datetime')
        .order('start_datetime', { ascending: false })

      if (eventsError) throw eventsError

      // Fetch attendance records for this student
      const { data: attendance, error: attendanceError } = await supabase
        .from('attendance')
        .select('event_id, time_in, time_out')
        .eq('student_id', studentId)

      if (attendanceError) throw attendanceError

      // Create a map of attendance records by event_id
      const attendanceMap = new Map()
      attendance?.forEach(record => {
        attendanceMap.set(record.event_id, record)
      })

      // Create attendance status for each event
      const statusArray: AttendanceStatus[] = events?.map(event => {
        const attendanceRecord = attendanceMap.get(event.id)
        
        let status: 'present' | 'absent' | 'partial' = 'absent'
        if (attendanceRecord) {
          if (attendanceRecord.time_in && attendanceRecord.time_out) {
            status = 'present'
          } else if (attendanceRecord.time_in || attendanceRecord.time_out) {
            status = 'partial'
          }
        }

        return {
          event_id: event.id,
          event_name: event.name,
          time_in: attendanceRecord?.time_in || null,
          time_out: attendanceRecord?.time_out || null,
          status
        }
      }) || []

      setAttendanceStatus(statusArray)
    } catch (error) {
      console.error('Error fetching attendance status:', error)
    } finally {
      setLoadingAttendance(false)
    }
  }

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'present':
        return 'text-green-600 bg-green-100'
      case 'partial':
        return 'text-yellow-600 bg-yellow-100'
      case 'absent':
        return 'text-red-600 bg-red-100'
      default:
        return 'text-gray-600 bg-gray-100'
    }
  }

  const getStatusIcon = (status: string) => {
    switch (status) {
      case 'present':
        return <CheckCircle className="w-4 h-4" />
      case 'partial':
        return <Calendar className="w-4 h-4" />
      case 'absent':
        return <XCircle className="w-4 h-4" />
      default:
        return <Calendar className="w-4 h-4" />
    }
  }

  return (
    <div className="min-h-screen bg-white">
      {/* Header */}
      <header className="bg-white border-b border-gray-200 px-6 py-4">
        <div className="flex items-center justify-between">
          <div className="flex items-center space-x-3">
            <button
              onClick={() => router.push('/scanner')}
              className="p-2 rounded-lg hover:bg-gray-100 transition-colors"
            >
              <ArrowLeft className="w-5 h-5 text-gray-600" />
            </button>
            <div className="flex items-center space-x-2">
              <Search className="w-6 h-6 text-blue-600" />
              <h1 className="text-xl font-semibold text-gray-900">Search Student</h1>
            </div>
          </div>
        </div>
      </header>

      {/* Content */}
      <main className="p-6">
        <div className="max-w-2xl mx-auto">
          {/* Search Form */}
          <div className="bg-white rounded-lg shadow-lg p-6 mb-6">
            <h2 className="text-lg font-semibold text-gray-900 mb-4">Search by Student ID</h2>
            
            <div className="flex space-x-3">
              <input
                type="text"
                value={searchId}
                onChange={(e) => setSearchId(e.target.value)}
                placeholder="Enter student ID (e.g., 0008-0008)"
                className="flex-1 px-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                onKeyPress={(e) => e.key === 'Enter' && handleSearch()}
              />
              <button
                onClick={handleSearch}
                disabled={loading}
                className="px-6 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors disabled:opacity-50 disabled:cursor-not-allowed flex items-center space-x-2"
              >
                {loading ? (
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
              <div className="mt-4 p-3 bg-red-50 border border-red-200 rounded-lg">
                <p className="text-red-700 text-sm">{error}</p>
              </div>
            )}
          </div>

          {/* Student Card */}
          {student && (
            <div className="bg-white rounded-lg shadow-lg overflow-hidden">
              {/* Student Header */}
              <div className="bg-gradient-to-r from-blue-600 to-blue-700 p-6 text-white">
                <div className="flex items-center justify-between">
                  <div className="flex items-center space-x-4">
                    <div className="w-16 h-16 bg-white/20 rounded-full flex items-center justify-center">
                      <User className="w-8 h-8" />
                    </div>
                    <div>
                      <h2 className="text-xl font-semibold">
                        {student.first_name} {student.middle_initial} {student.last_name}
                      </h2>
                      <p className="text-blue-100">Student ID: {student.student_id}</p>
                    </div>
                  </div>
                </div>
              </div>

              {/* Student Details */}
              <div className="p-6">
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-6">
                  <div>
                    <h3 className="text-sm font-medium text-gray-500 mb-1">Course</h3>
                    <p className="text-gray-900">
                      {student.course ? `${student.course.course_name} (${student.course.short})` : 'Not specified'}
                    </p>
                  </div>
                  <div>
                    <h3 className="text-sm font-medium text-gray-500 mb-1">Year Level</h3>
                    <p className="text-gray-900">{student.year_level}</p>
                  </div>
                </div>

                {/* Attendance Status */}
                <div>
                  <h3 className="text-lg font-semibold text-gray-900 mb-4 flex items-center">
                    <Calendar className="w-5 h-5 mr-2 text-blue-600" />
                    Attendance Status
                  </h3>
                  
                  {loadingAttendance ? (
                    <div className="text-center py-8">
                      <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600 mx-auto"></div>
                      <p className="text-gray-600 mt-2 text-sm">Loading attendance...</p>
                    </div>
                  ) : attendanceStatus.length > 0 ? (
                    <div className="space-y-3">
                      {attendanceStatus.map((status) => (
                        <div key={status.event_id} className="flex items-center justify-between p-3 bg-gray-50 rounded-lg">
                          <div className="flex-1">
                            <h4 className="font-medium text-gray-900">{status.event_name}</h4>
                            <div className="text-sm text-gray-600 space-x-4">
                              {status.time_in && (
                                <span>Time In: {new Date(status.time_in).toLocaleString()}</span>
                              )}
                              {status.time_out && (
                                <span>Time Out: {new Date(status.time_out).toLocaleString()}</span>
                              )}
                            </div>
                          </div>
                          <div className={`flex items-center space-x-2 px-3 py-1 rounded-full text-sm font-medium ${getStatusColor(status.status)}`}>
                            {getStatusIcon(status.status)}
                            <span className="capitalize">{status.status}</span>
                          </div>
                        </div>
                      ))}
                    </div>
                  ) : (
                    <div className="text-center py-8">
                      <Calendar className="w-12 h-12 text-gray-400 mx-auto mb-4" />
                      <p className="text-gray-600">No attendance records found</p>
                    </div>
                  )}
                </div>
              </div>
            </div>
          )}
        </div>
      </main>
    </div>
  )
}
