'use client'

import { useState, useEffect } from 'react'
import { supabase } from '@/lib/supabase'
import { Calendar, MapPin, Clock, CheckCircle, Clock3, XCircle, UserCheck } from 'lucide-react'

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

interface DashboardProps {
  profile: UserProfile | null
}

export default function Dashboard({ profile }: DashboardProps) {
  const [events, setEvents] = useState<Event[]>([])
  const [eventsLoading, setEventsLoading] = useState(false)
  const [attendanceMap, setAttendanceMap] = useState<Map<number, { time_in: string | null; time_out: string | null }>>(new Map())

  // Helper function to check if event is coming soon
  const isEventComingSoon = (eventDate: string) => {
    const eventStartDate = new Date(eventDate)
    const currentDate = new Date()
    return eventStartDate > currentDate
  }

  useEffect(() => {
    fetchEvents()
    if (profile?.id) {
      fetchAttendanceRecords()
    }

    // Set up real-time subscription for events
    const eventsSubscription = supabase
      .channel('events_changes')
      .on(
        'postgres_changes',
        {
          event: '*',
          schema: 'public',
          table: 'events'
        },
        (payload) => {
          // Refetch events when any change occurs
          fetchEvents()
          if (profile?.id) {
            fetchAttendanceRecords()
          }
        }
      )
      .subscribe()

    // Set up real-time subscription for attendance
    const attendanceSubscription = supabase
      .channel('attendance_changes')
      .on(
        'postgres_changes',
        {
          event: '*',
          schema: 'public',
          table: 'attendance'
        },
        (payload) => {
          // Refetch attendance when any change occurs
          if (profile?.id) {
            fetchAttendanceRecords()
          }
        }
      )
      .subscribe()

    // Cleanup subscriptions on unmount
    return () => {
      eventsSubscription.unsubscribe()
      attendanceSubscription.unsubscribe()
    }
  }, [profile?.id])

  const fetchEvents = async () => {
    setEventsLoading(true)
    try {
      // Fetch all events (both active and inactive) for student dashboard
      const { data, error } = await supabase
        .from('events')
        .select('*')
        .order('start_datetime', { ascending: false })

      if (error) {
        console.error('Error fetching events:', error)
      } else {
        setEvents(data || [])
      }
    } catch (error) {
      console.error('Error fetching events:', error)
    } finally {
      setEventsLoading(false)
    }
  }

  const fetchAttendanceRecords = async () => {
    // IMPORTANT: attendance.student_id stores the student's *student number* (profile.student_id),
    // not the UUID. This matches what the scanner inserts from the QR payload.
    if (!profile?.student_id) return

    try {
      // Fetch attendance records for this student
      const { data: attendance, error } = await supabase
        .from('attendance')
        .select('event_id, time_in, time_out')
        .eq('student_id', profile.student_id)

      if (error) {
        console.error('Error fetching attendance:', error)
        return
      }

      // Create a map of event_id -> attendance record
      const map = new Map<number, { time_in: string | null; time_out: string | null }>()
      attendance?.forEach((record) => {
        map.set(record.event_id, {
          time_in: record.time_in,
          time_out: record.time_out
        })
      })
      setAttendanceMap(map)
    } catch (error) {
      console.error('Error fetching attendance records:', error)
    }
  }

  const getAttendanceStatus = (eventId: number): 'present' | 'absent' => {
    const attendance = attendanceMap.get(eventId)
    const hasAnyScan = attendance !== undefined && (attendance.time_in !== null || attendance.time_out !== null)
    return hasAnyScan ? 'present' : 'absent'
  }

  return (
    <div className="space-y-6">

      {/* Events Grid */}
      {eventsLoading ? (
        <div className="text-center py-12">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-orange-600 mx-auto"></div>
          <p className="mt-4 text-gray-600">Loading events...</p>
        </div>
      ) : events.length === 0 ? (
        <div className="text-center py-12">
          <Calendar className="w-16 h-16 text-gray-300 mx-auto mb-4" />
          <h3 className="text-lg font-medium text-gray-900 mb-2">No Events Available</h3>
          <p className="text-gray-600">Check back later for upcoming events.</p>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {events.map((event) => (
            <div key={event.id} className={`bg-white rounded-lg shadow-md overflow-hidden border border-gray-200 hover:shadow-lg transition-shadow ${
              event.status === 0 ? 'opacity-75' : ''
            }`}>
              {/* Event Banner */}
              <div className="h-48 bg-gray-200 relative">
                {event.banner ? (
                  <img 
                    src={event.banner} 
                    alt={event.name}
                    className="w-full h-full object-cover"
                  />
                ) : (
                  <div className="w-full h-full flex items-center justify-center bg-gradient-to-br from-orange-100 to-orange-200">
                    <Calendar className="w-12 h-12 text-orange-600" />
                  </div>
                )}
                {/* Status Badge */}
                <div className="absolute top-3 right-3">
                  {isEventComingSoon(event.start_datetime) ? (
                    <div className="flex items-center space-x-1 bg-blue-100 text-blue-800 px-2 py-1 rounded-full text-xs">
                      <Clock3 className="w-3 h-3" />
                      <span>Coming Soon</span>
                    </div>
                  ) : event.status === 1 ? (
                    <div className="flex items-center space-x-1 bg-green-100 text-green-800 px-2 py-1 rounded-full text-xs">
                      <CheckCircle className="w-3 h-3" />
                      <span>Active</span>
                    </div>
                  ) : (
                    <div className="flex items-center space-x-1 bg-red-100 text-red-800 px-2 py-1 rounded-full text-xs">
                      <XCircle className="w-3 h-3" />
                      <span>Inactive</span>
                    </div>
                  )}
                </div>

                {/* Attendance Badge (per student) */}
                {profile?.student_id && (
                  <div className="absolute top-3 left-3">
                    {getAttendanceStatus(event.id) === 'present' ? (
                      <div className="flex items-center space-x-1 bg-purple-100 text-purple-800 px-2 py-1 rounded-full text-xs">
                        <UserCheck className="w-3 h-3" />
                        <span>Present</span>
                      </div>
                    ) : (
                      <div className="flex items-center space-x-1 bg-gray-100 text-gray-700 px-2 py-1 rounded-full text-xs">
                        <XCircle className="w-3 h-3" />
                        <span>Absent</span>
                      </div>
                    )}
                  </div>
                )}
              </div>

              {/* Event Details */}
              <div className="p-4">
                <h3 className="text-lg font-semibold text-gray-900 mb-2 line-clamp-2">
                  {event.name}
                </h3>
                
                {event.description && (
                  <p className="text-gray-600 text-sm mb-3 line-clamp-2">
                    {event.description}
                  </p>
                )}

                <div className="space-y-2">
                  {/* Location */}
                  <div className="flex items-center space-x-2 text-sm text-gray-600">
                    <MapPin className="w-4 h-4 text-orange-600" />
                    <span className="line-clamp-1">{event.location}</span>
                  </div>

                  {/* Date & Time */}
                  <div className="flex items-center space-x-2 text-sm text-gray-600">
                    <Clock className="w-4 h-4 text-orange-600" />
                    <span>
                      {new Date(event.start_datetime).toLocaleDateString()} - {new Date(event.end_datetime).toLocaleDateString()}
                    </span>
                  </div>
                </div>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  )
}
