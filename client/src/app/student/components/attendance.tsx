'use client'

import { useState, useEffect } from 'react'
import { useAuth } from '@/contexts/AuthContext'
import { supabase } from '@/lib/supabase'
import { Calendar, Clock, CheckCircle, XCircle, User, FileText } from 'lucide-react'

interface AttendanceRecord {
  id: number
  event_id: number
  event_name: string
  event_date: string
  time_in: string | null
  time_out: string | null
  status: 'present' | 'partial' | 'absent'
}

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

interface AttendanceProps {
  profile: UserProfile | null
}

export default function Attendance({ profile }: AttendanceProps) {
  const { user } = useAuth()
  const [attendanceRecords, setAttendanceRecords] = useState<AttendanceRecord[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    if (profile?.student_id) {
      fetchAttendanceRecords()
    }
  }, [profile?.student_id])

  const fetchAttendanceRecords = async () => {
    if (!profile?.student_id) return

    setLoading(true)
    setError(null)
    
    try {
      // Fetch all events first
      const { data: events, error: eventsError } = await supabase
        .from('events')
        .select('id, name, start_datetime')
        .order('start_datetime', { ascending: false })

      if (eventsError) throw eventsError

      // Fetch attendance records for this student
      const { data: attendance, error: attendanceError } = await supabase
        .from('attendance')
        .select('id, event_id, time_in, time_out')
        .eq('student_id', profile.student_id)
        .order('time_in', { ascending: false })

      if (attendanceError) throw attendanceError

      // Create a map of attendance records for quick lookup
      const attendanceMap = new Map(attendance?.map(record => [record.event_id, record]) || [])

      // Create records for ALL events, marking as absent if no attendance record exists
      const allRecordsWithEvents: AttendanceRecord[] = (events || []).map(event => {
        const attendanceRecord = attendanceMap.get(event.id)
        
        if (attendanceRecord) {
          // Student has attendance record for this event
          let status: 'present' | 'partial' | 'absent' = 'absent'
          
          if (attendanceRecord.time_in && attendanceRecord.time_out) {
            status = 'present'
          } else if (attendanceRecord.time_in || attendanceRecord.time_out) {
            status = 'partial'
          }

          return {
            id: attendanceRecord.id,
            event_id: event.id,
            event_name: event.name,
            event_date: event.start_datetime,
            time_in: attendanceRecord.time_in,
            time_out: attendanceRecord.time_out,
            status
          }
        } else {
          // Student has no attendance record for this event - mark as absent
          return {
            id: 0, // No attendance record ID
            event_id: event.id,
            event_name: event.name,
            event_date: event.start_datetime,
            time_in: null,
            time_out: null,
            status: 'absent'
          }
        }
      })

      setAttendanceRecords(allRecordsWithEvents)
    } catch (error) {
      console.error('Error fetching attendance records:', error)
      setError('Failed to load attendance records. Please try again.')
    } finally {
      setLoading(false)
    }
  }

  const formatDateTime = (dateTime: string) => {
    return new Date(dateTime).toLocaleString('en-US', {
      year: 'numeric',
      month: 'short',
      day: 'numeric',
      hour: '2-digit',
      minute: '2-digit',
      hour12: true
    })
  }

  const formatDate = (dateTime: string) => {
    return new Date(dateTime).toLocaleDateString('en-US', {
      year: 'numeric',
      month: 'long',
      day: 'numeric'
    })
  }

  const getStatusIcon = (status: string) => {
    switch (status) {
      case 'present':
        return <CheckCircle className="w-5 h-5 text-green-600" />
      case 'partial':
        return <Clock className="w-5 h-5 text-yellow-600" />
      case 'absent':
        return <XCircle className="w-5 h-5 text-red-600" />
      default:
        return <XCircle className="w-5 h-5 text-gray-400" />
    }
  }

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'present':
        return 'bg-green-100 text-green-800 border-green-200'
      case 'partial':
        return 'bg-yellow-100 text-yellow-800 border-yellow-200'
      case 'absent':
        return 'bg-red-100 text-red-800 border-red-200'
      default:
        return 'bg-gray-100 text-gray-800 border-gray-200'
    }
  }

  const getStatusText = (status: string) => {
    switch (status) {
      case 'present':
        return 'Present'
      case 'partial':
        return 'Partial'
      case 'absent':
        return 'Absent'
      default:
        return 'Unknown'
    }
  }


  if (loading) {
    return (
      <div className="space-y-6">
        <div className="flex items-center justify-between">
          <h2 className="text-xl sm:text-2xl font-bold text-gray-900">Check Attendance</h2>
        </div>
        <div className="flex items-center justify-center py-12">
          <div className="text-center">
            <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-orange-600 mx-auto mb-4"></div>
            <p className="text-gray-600">Loading attendance records...</p>
          </div>
        </div>
      </div>
    )
  }

  if (error) {
    return (
      <div className="space-y-6">
        <div className="flex items-center justify-between">
          <h2 className="text-xl sm:text-2xl font-bold text-gray-900">Check Attendance</h2>
        </div>
        <div className="bg-red-50 border border-red-200 rounded-lg p-6 text-center">
          <XCircle className="w-12 h-12 text-red-600 mx-auto mb-4" />
          <h3 className="text-lg font-semibold text-red-800 mb-2">Error Loading Records</h3>
          <p className="text-red-700 mb-4">{error}</p>
          <button
            onClick={fetchAttendanceRecords}
            className="bg-red-600 hover:bg-red-700 text-white px-4 py-2 rounded-lg transition-colors"
          >
            Try Again
          </button>
        </div>
      </div>
    )
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between space-y-4 sm:space-y-0">
        <div>
          <h2 className="text-xl sm:text-2xl font-bold text-gray-900">Check Attendance</h2>
          <p className="text-gray-600 mt-1">View your attendance records and event participation</p>
        </div>
      </div>

      {/* Student Info Card */}
      <div className="bg-gradient-to-r from-orange-50 to-orange-100 rounded-xl p-6 border border-orange-200">
        <div className="flex items-center space-x-4">
          <div className="w-16 h-16 bg-orange-200 rounded-full flex items-center justify-center">
            <User className="w-8 h-8 text-orange-600" />
          </div>
          <div>
            <h3 className="text-lg font-semibold text-gray-900">
              {profile?.first_name} {profile?.middle_initial} {profile?.last_name}
            </h3>
            <p className="text-orange-700 font-medium">{profile?.student_id}</p>
            <p className="text-sm text-orange-600">{profile?.course?.course_name} • {profile?.year_level}</p>
          </div>
        </div>
      </div>

      {/* Attendance Summary */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
        <div className="bg-green-50 border border-green-200 rounded-lg p-4">
          <div className="flex items-center space-x-3">
            <CheckCircle className="w-8 h-8 text-green-600" />
            <div>
              <p className="text-2xl font-bold text-green-800">
                {attendanceRecords.filter(r => r.status === 'present').length}
              </p>
              <p className="text-sm text-green-600">Present</p>
            </div>
          </div>
        </div>
        <div className="bg-yellow-50 border border-yellow-200 rounded-lg p-4">
          <div className="flex items-center space-x-3">
            <Clock className="w-8 h-8 text-yellow-600" />
            <div>
              <p className="text-2xl font-bold text-yellow-800">
                {attendanceRecords.filter(r => r.status === 'partial').length}
              </p>
              <p className="text-sm text-yellow-600">Partial</p>
            </div>
          </div>
        </div>
        <div className="bg-red-50 border border-red-200 rounded-lg p-4">
          <div className="flex items-center space-x-3">
            <XCircle className="w-8 h-8 text-red-600" />
            <div>
              <p className="text-2xl font-bold text-red-800">
                {attendanceRecords.filter(r => r.status === 'absent').length}
              </p>
              <p className="text-sm text-red-600">Absent</p>
            </div>
          </div>
        </div>
      </div>

      {/* Attendance Records */}
      {attendanceRecords.length === 0 ? (
        <div className="bg-gray-50 border border-gray-200 rounded-lg p-8 text-center">
          <FileText className="w-16 h-16 text-gray-400 mx-auto mb-4" />
          <h3 className="text-lg font-semibold text-gray-900 mb-2">No Events Available</h3>
          <p className="text-gray-600">There are no events in the system yet. Check back later for upcoming events.</p>
        </div>
      ) : (
        <div className="bg-white rounded-lg border border-gray-200 overflow-hidden">
          <div className="bg-gray-50 px-6 py-4 border-b border-gray-200">
            <h3 className="text-lg font-semibold text-gray-900 flex items-center">
              <Calendar className="w-5 h-5 mr-2 text-orange-600" />
              Attendance Logs
            </h3>
          </div>
          <div className="divide-y divide-gray-200">
            {attendanceRecords.map((record, index) => (
              <div key={`${record.event_id}-${record.id || 'absent'}`} className="p-6 hover:bg-gray-50 transition-colors">
                <div className="flex flex-col lg:flex-row lg:items-center lg:justify-between space-y-4 lg:space-y-0">
                  {/* Event Info */}
                  <div className="flex-1">
                    <div className="flex items-start space-x-4">
                      <div className="flex-shrink-0">
                        {getStatusIcon(record.status)}
                      </div>
                      <div className="flex-1">
                        <h4 className="text-lg font-semibold text-gray-900 mb-1">
                          {record.event_name}
                        </h4>
                        <p className="text-sm text-gray-600 mb-2">
                          {formatDate(record.event_date)}
                        </p>
                        <div className="flex flex-col sm:flex-row sm:items-center space-y-2 sm:space-y-0 sm:space-x-4">
                          {record.time_in && (
                            <div className="flex items-center space-x-2 text-sm">
                              <Clock className="w-4 h-4 text-green-600" />
                              <span className="text-gray-700">
                                <span className="font-medium">Time In:</span> {formatDateTime(record.time_in)}
                              </span>
                            </div>
                          )}
                          {record.time_out && (
                            <div className="flex items-center space-x-2 text-sm">
                              <Clock className="w-4 h-4 text-red-600" />
                              <span className="text-gray-700">
                                <span className="font-medium">Time Out:</span> {formatDateTime(record.time_out)}
                              </span>
                            </div>
                          )}
                        </div>
                      </div>
                    </div>
                  </div>

                  {/* Status Badge */}
                  <div className="flex-shrink-0">
                    <span className={`inline-flex items-center px-3 py-1 rounded-full text-sm font-medium border ${getStatusColor(record.status)}`}>
                      {getStatusText(record.status)}
                    </span>
                  </div>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  )
}
