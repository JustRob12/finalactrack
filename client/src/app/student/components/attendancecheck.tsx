'use client'

import { useState, useEffect } from 'react'
import { useAuth } from '@/contexts/AuthContext'
import { supabase } from '@/lib/supabase'
import { MapPin, Clock, CheckCircle } from 'lucide-react'

interface Event {
  id: number
  location: string
  name: string
  description: string | null
  banner: string | null
  status: number
  start_datetime: string
  end_datetime: string
}

interface Attendance {
  id: number
  event_id: number
  user_id: string
  check_in_time: string
  event?: Event
}

export default function AttendanceCheck() {
  const { user } = useAuth()
  const [attendance, setAttendance] = useState<Attendance[]>([])
  const [attendanceLoading, setAttendanceLoading] = useState(false)

  useEffect(() => {
    fetchAttendance()
  }, [])

  const fetchAttendance = async () => {
    if (!user?.id) return
    
    setAttendanceLoading(true)
    try {
      const { data, error } = await supabase
        .from('attendance')
        .select(`
          *,
          event:events(*)
        `)
        .eq('user_id', user.id)
        .order('check_in_time', { ascending: false })

      if (error) {
        console.error('Error fetching attendance:', error)
      } else {
        setAttendance(data || [])
      }
    } catch (error) {
      console.error('Error fetching attendance:', error)
    } finally {
      setAttendanceLoading(false)
    }
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <h2 className="text-2xl font-semibold text-gray-900">My Attendance</h2>
      </div>

      {/* Attendance List */}
      {attendanceLoading ? (
        <div className="text-center py-12">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-orange-600 mx-auto"></div>
          <p className="mt-4 text-gray-600">Loading attendance...</p>
        </div>
      ) : attendance.length === 0 ? (
        <div className="text-center py-12">
          <CheckCircle className="w-16 h-16 text-gray-300 mx-auto mb-4" />
          <h3 className="text-lg font-medium text-gray-900 mb-2">No Attendance Records</h3>
          <p className="text-gray-600">You haven't attended any events yet.</p>
        </div>
      ) : (
        <div className="space-y-4">
          {attendance.map((record) => (
            <div key={record.id} className="bg-white rounded-lg shadow-md border border-gray-200 p-4">
              <div className="flex items-start justify-between">
                <div className="flex-1">
                  <h3 className="text-lg font-semibold text-gray-900 mb-2">
                    {record.event?.name || 'Unknown Event'}
                  </h3>
                  
                  <div className="space-y-2 text-sm text-gray-600">
                    <div className="flex items-center space-x-2">
                      <MapPin className="w-4 h-4 text-orange-600" />
                      <span>{record.event?.location || 'Unknown Location'}</span>
                    </div>
                    <div className="flex items-center space-x-2">
                      <Clock className="w-4 h-4 text-orange-600" />
                      <span>Checked in: {new Date(record.check_in_time).toLocaleString()}</span>
                    </div>
                  </div>
                </div>
                <div className="flex items-center space-x-1 bg-green-100 text-green-800 px-2 py-1 rounded-full text-xs">
                  <CheckCircle className="w-3 h-3" />
                  <span>Attended</span>
                </div>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  )
}
