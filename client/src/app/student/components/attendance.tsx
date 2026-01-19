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
  status: 'cleared' | 'partial' | 'absent'
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
  const [showSanctionsModal, setShowSanctionsModal] = useState(false)

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
          const hasTimeIn = !!attendanceRecord.time_in
          const hasTimeOut = !!attendanceRecord.time_out
          const status: 'cleared' | 'partial' | 'absent' =
            hasTimeIn && hasTimeOut ? 'cleared' : hasTimeIn || hasTimeOut ? 'partial' : 'absent'

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
      case 'cleared':
        return <CheckCircle className="w-5 h-5 text-green-600" />
      case 'partial':
        return <Clock className="w-5 h-5 text-orange-600" />
      case 'absent':
        return <XCircle className="w-5 h-5 text-red-600" />
      default:
        return <XCircle className="w-5 h-5 text-gray-400" />
    }
  }

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'cleared':
        return 'bg-green-100 text-green-800 border-green-200'
      case 'partial':
        return 'bg-orange-100 text-orange-800 border-orange-200'
      case 'absent':
        return 'bg-red-100 text-red-800 border-red-200'
      default:
        return 'bg-gray-100 text-gray-800 border-gray-200'
    }
  }

  const getStatusText = (status: string) => {
    switch (status) {
      case 'cleared':
        return 'Cleared'
      case 'absent':
        return 'Absent'
      case 'partial':
        return 'Partial'
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

        <button
          onClick={() => setShowSanctionsModal(true)}
          className="inline-flex items-center justify-center px-4 py-2 rounded-lg bg-orange-600 hover:bg-orange-700 text-white font-semibold transition-colors shadow-sm"
        >
          Sanctions
        </button>
      </div>

      {/* Student Info Card */}
      <div className="bg-gradient-to-r from-orange-50 to-orange-100 rounded-xl p-6 border border-orange-200">
        <div className="flex items-center space-x-4">
        
          <div>
            <h3 className="text-lg font-semibold text-gray-900">
              {profile?.first_name} {profile?.middle_initial} {profile?.last_name}
            </h3>
            <p className="text-orange-700 font-medium">{profile?.student_id}</p>
            <p className="text-sm text-orange-600">{profile?.course?.course_name} • {profile?.year_level}</p>
          </div>
        </div>
      </div>

      {/* Attendance Summary (Orange theme) */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
        <div className="bg-orange-50 border border-orange-200 rounded-xl p-4">
          <div className="flex items-center space-x-3">
            <CheckCircle className="w-8 h-8 text-green-600" />
            <div>
              <p className="text-2xl font-bold text-gray-900">
                {attendanceRecords.filter(r => r.status === 'cleared').length}
              </p>
              <p className="text-sm text-orange-700 font-medium">Cleared</p>
            </div>
          </div>
        </div>
        <div className="bg-orange-50 border border-orange-200 rounded-xl p-4">
          <div className="flex items-center space-x-3">
            <Clock className="w-8 h-8 text-orange-600" />
            <div>
              <p className="text-2xl font-bold text-gray-900">
                {attendanceRecords.filter(r => r.status === 'partial').length}
              </p>
              <p className="text-sm text-orange-700 font-medium">Partial</p>
            </div>
          </div>
        </div>
        <div className="bg-orange-50 border border-orange-200 rounded-xl p-4">
          <div className="flex items-center space-x-3">
            <XCircle className="w-8 h-8 text-red-600" />
            <div>
              <p className="text-2xl font-bold text-gray-900">
                {attendanceRecords.filter(r => r.status === 'absent').length}
              </p>
              <p className="text-sm text-orange-700 font-medium">Absent</p>
            </div>
          </div>
        </div>
      </div>

      {/* Attendance Records (Table - mobile scroll) */}
      {attendanceRecords.length === 0 ? (
        <div className="bg-gray-50 border border-gray-200 rounded-lg p-8 text-center">
          <FileText className="w-16 h-16 text-gray-400 mx-auto mb-4" />
          <h3 className="text-lg font-semibold text-gray-900 mb-2">No Events Available</h3>
          <p className="text-gray-600">There are no events in the system yet. Check back later for upcoming events.</p>
        </div>
      ) : (
        <div className="bg-white rounded-xl border border-orange-200 overflow-hidden shadow-sm">
          <div className="bg-orange-50 px-4 sm:px-6 py-4 border-b border-orange-200">
            <h3 className="text-lg font-semibold text-gray-900 flex items-center">
              <Calendar className="w-5 h-5 mr-2 text-orange-600" />
              Attendance Logs
            </h3>
            <p className="text-sm text-orange-700 mt-1">
              Note: Partial means only Time In or Time Out was recorded.
            </p>
          </div>

          {/* Mobile horizontal scroll */}
          <div className="overflow-x-auto">
            <table className="min-w-[820px] w-full border-collapse">
              <thead className="bg-white">
                <tr className="text-left">
                  <th className="px-4 sm:px-6 py-3 text-xs font-bold text-orange-700 uppercase tracking-wider border-b border-orange-100 w-[52px]">
                    No
                  </th>
                  <th className="px-4 sm:px-6 py-3 text-xs font-bold text-orange-700 uppercase tracking-wider border-b border-orange-100">
                    Event Name
                  </th>
                  <th className="px-4 sm:px-6 py-3 text-xs font-bold text-orange-700 uppercase tracking-wider border-b border-orange-100 w-[220px]">
                    Time In
                  </th>
                  <th className="px-4 sm:px-6 py-3 text-xs font-bold text-orange-700 uppercase tracking-wider border-b border-orange-100 w-[220px]">
                    Time Out
                  </th>
                  <th className="px-4 sm:px-6 py-3 text-xs font-bold text-orange-700 uppercase tracking-wider border-b border-orange-100 w-[140px]">
                    Status
                  </th>
                </tr>
              </thead>
              <tbody>
                {attendanceRecords.map((record, index) => (
                  <tr
                    key={`${record.event_id}-${record.id || 'absent'}`}
                    className="hover:bg-orange-50/40 transition-colors"
                  >
                    <td className="px-4 sm:px-6 py-4 text-sm text-gray-700 border-b border-orange-50">
                      {index + 1}
                    </td>
                    <td className="px-4 sm:px-6 py-4 border-b border-orange-50">
                      <div className="font-semibold text-gray-900">{record.event_name}</div>
                      <div className="text-xs text-gray-500 mt-1">{formatDate(record.event_date)}</div>
                    </td>
                    <td className="px-4 sm:px-6 py-4 text-sm text-gray-700 border-b border-orange-50">
                      {record.time_in ? (
                        <span className="inline-flex items-center space-x-2">
                          <Clock className="w-4 h-4 text-orange-600" />
                          <span>{formatDateTime(record.time_in)}</span>
                        </span>
                      ) : (
                        <span className="text-gray-400">—</span>
                      )}
                    </td>
                    <td className="px-4 sm:px-6 py-4 text-sm text-gray-700 border-b border-orange-50">
                      {record.time_out ? (
                        <span className="inline-flex items-center space-x-2">
                          <Clock className="w-4 h-4 text-orange-600" />
                          <span>{formatDateTime(record.time_out)}</span>
                        </span>
                      ) : (
                        <span className="text-gray-400">—</span>
                      )}
                    </td>
                    <td className="px-4 sm:px-6 py-4 border-b border-orange-50">
                      <span
                        className={`inline-flex items-center space-x-2 px-3 py-1 rounded-full text-xs font-bold border ${getStatusColor(
                          record.status
                        )}`}
                      >
                        {getStatusIcon(record.status)}
                        <span>{getStatusText(record.status)}</span>
                      </span>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* Sanctions Modal */}
      {showSanctionsModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50">
          <div className="w-full max-w-md bg-white rounded-2xl shadow-xl border border-orange-200 overflow-hidden">
            <div className="px-6 py-4 bg-orange-50 border-b border-orange-200 flex items-center justify-between">
              <h3 className="text-lg font-bold text-gray-900">Sanctions</h3>
              <button
                onClick={() => setShowSanctionsModal(false)}
                className="text-gray-500 hover:text-gray-700 transition-colors"
                aria-label="Close sanctions modal"
              >
                ✕
              </button>
            </div>

            <div className="px-6 py-5 space-y-4">
              <div className="bg-white border border-orange-200 rounded-xl p-4">
                <p className="text-sm text-gray-700">
                  {attendanceRecords.filter(r => r.status === 'absent').length === 0
                    ? 'No sanctions yet.'
                    : 'No sanctions have been assigned yet.'}
                </p>
                <p className="text-xs text-gray-500 mt-2">
                  This section will be updated once sanctions are implemented.
                </p>
              </div>

              {/* Placeholder example (only inside modal, as requested) */}
              <div className="bg-orange-50 border border-orange-200 rounded-xl p-4">
                <p className="text-xs font-bold text-orange-800 uppercase tracking-wider mb-2">
                  Example (not enforced yet)
                </p>
                <p className="text-sm text-orange-900">
                  1 absent = school supplies
                </p>
              </div>
            </div>

            <div className="px-6 py-4 border-t border-orange-200 flex justify-end">
              <button
                onClick={() => setShowSanctionsModal(false)}
                className="px-4 py-2 rounded-lg bg-orange-600 hover:bg-orange-700 text-white font-semibold transition-colors"
              >
                Close
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
