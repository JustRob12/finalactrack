'use client'

import { useEffect, useState } from 'react'
import { useAuth } from '@/lib/contexts/authContext'
import { supabase } from '@/lib/config/supabase'
import { Card } from '@/components/ui/card'
import { Skeleton } from '@/components/ui/skeleton'
import { Input } from '@/components/ui/input'
import { Calendar, Clock, MapPin, Search } from 'lucide-react'
import Image from 'next/image'

interface AttendanceRecord {
  id: number
  event_id: number
  student_id: string
  firstname: string
  middlename: string | null
  lastname: string
  course_id: number
  avatar: string | null
  time_in: string | null
  time_out: string | null
  year_level: string
  event: {
    id: number
    name: string
    description: string | null
    location: string
    banner: string | null
    start_datetime: string
    end_datetime: string
  }
}

export default function AttendanceHistoryPage() {
  const { user } = useAuth()
  const [attendance, setAttendance] = useState<AttendanceRecord[]>([])
  const [filteredAttendance, setFilteredAttendance] = useState<AttendanceRecord[]>([])
  const [loading, setLoading] = useState(true)
  const [searchQuery, setSearchQuery] = useState('')

  useEffect(() => {
    if (user?.id) {
      fetchAttendanceHistory()
    } else if (user === null) {
      setLoading(false)
    }
  }, [user?.id])

  useEffect(() => {
    if (searchQuery.trim() === '') {
      setFilteredAttendance(attendance)
    } else {
      const query = searchQuery.toLowerCase()
      const filtered = attendance.filter(record => 
        record.event.name.toLowerCase().includes(query) ||
        record.event.location.toLowerCase().includes(query)
      )
      setFilteredAttendance(filtered)
    }
  }, [searchQuery, attendance])

  const fetchAttendanceHistory = async () => {
    try {
      setLoading(true)

      const { data, error } = await supabase
        .from('attendance')
        .select(`
          *,
          event:events(
            id,
            name,
            description,
            location,
            banner,
            start_datetime,
            end_datetime
          )
        `)
        .eq('student_id', user?.id)
        .order('time_in', { ascending: false })

      if (error) throw error

      setAttendance(data || [])
      setFilteredAttendance(data || [])
    } catch (error) {
      console.error('Error fetching attendance history:', error)
      setAttendance([])
      setFilteredAttendance([])
    } finally {
      setLoading(false)
    }
  }

  const formatDateTime = (timestamp: string | null) => {
    if (!timestamp) return 'N/A'
    
    const date = new Date(timestamp)
    const today = new Date()
    const isToday = date.toDateString() === today.toDateString()
    
    const timeString = date.toLocaleTimeString('en-US', { 
      hour: 'numeric', 
      minute: '2-digit',
      hour12: true 
    })
    
    if (isToday) {
      return `Today at ${timeString}`
    } else {
      const dateString = date.toLocaleDateString('en-US', { 
        month: 'short', 
        day: 'numeric',
        year: date.getFullYear() !== today.getFullYear() ? 'numeric' : undefined
      })
      return `${dateString} at ${timeString}`
    }
  }

  const formatEventDate = (datetime: string) => {
    const date = new Date(datetime)
    const today = new Date()
    
    return date.toLocaleDateString('en-US', { 
      month: 'short', 
      day: 'numeric',
      year: date.getFullYear() !== today.getFullYear() ? 'numeric' : undefined
    })
  }

  if (loading || !user) {
    return (
      <div className="space-y-6 pb-8">
        <div className="pt-5">
          <Skeleton className="h-8 w-48 mb-2" />
          <Skeleton className="h-4 w-64" />
        </div>
        <Skeleton className="h-10 w-full" />
        <div className="space-y-3">
          <Skeleton className="h-32 w-full" />
          <Skeleton className="h-32 w-full" />
          <Skeleton className="h-32 w-full" />
        </div>
      </div>
    )
  }

  return (
    <div className="space-y-6 pb-8">
      {/* Header */}
      <div className="pt-5">
        <h1 className="text-2xl font-bold mb-1">Attendance History</h1>
        <p className="text-muted-foreground text-sm">
          View all your event attendance records
        </p>
      </div>

      {/* Search */}
      <div className="relative">
        <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
        <Input
          placeholder="Search by event name or location..."
          value={searchQuery}
          onChange={(e) => setSearchQuery(e.target.value)}
          className="pl-9"
        />
      </div>

      {/* Stats Summary */}
      <div className="grid grid-cols-2 md:grid-cols-3 gap-3">
        <Card className="p-4">
          <p className="text-xs text-muted-foreground mb-1">Total Attended</p>
          <p className="text-2xl font-bold text-primary">{attendance.length}</p>
        </Card>
        <Card className="p-4">
          <p className="text-xs text-muted-foreground mb-1">This Month</p>
          <p className="text-2xl font-bold">
            {attendance.filter(record => {
              if (!record.time_in) return false
              const recordDate = new Date(record.time_in)
              const now = new Date()
              return recordDate.getMonth() === now.getMonth() && 
                     recordDate.getFullYear() === now.getFullYear()
            }).length}
          </p>
        </Card>
        <Card className="p-4 col-span-2 md:col-span-1">
          <p className="text-xs text-muted-foreground mb-1">This Week</p>
          <p className="text-2xl font-bold">
            {attendance.filter(record => {
              if (!record.time_in) return false
              const recordDate = new Date(record.time_in)
              const now = new Date()
              const weekStart = new Date(now)
              weekStart.setDate(now.getDate() - now.getDay())
              weekStart.setHours(0, 0, 0, 0)
              return recordDate >= weekStart
            }).length}
          </p>
        </Card>
      </div>

      {/* Attendance List */}
      {filteredAttendance.length === 0 ? (
        <Card className="p-12 flex flex-col items-center justify-center text-center">
          <Image 
            src="/characters/not-found.png" 
            width={80} 
            height={80} 
            alt="No attendance records" 
            className="mb-4"
          />
          <p className="text-muted-foreground font-medium">
            {searchQuery ? 'No matching attendance records' : 'No attendance records yet'}
          </p>
          <p className="text-sm text-muted-foreground/70 mt-1">
            {searchQuery ? 'Try a different search term' : 'Your attendance history will appear here'}
          </p>
        </Card>
      ) : (
        <div className="space-y-3">
          {filteredAttendance.map((record) => (
            <Card key={record.id} className="p-4 hover:shadow-md transition-shadow">
              <div className="flex gap-4">
                {/* Event Banner/Icon */}
                {record.event.banner ? (
                  <div className="relative w-20 h-20 rounded-lg overflow-hidden flex-shrink-0 bg-muted">
                    <Image
                      src={record.event.banner}
                      alt={record.event.name}
                      fill
                      className="object-cover"
                    />
                  </div>
                ) : (
                  <div className="w-20 h-20 rounded-lg bg-primary/10 flex items-center justify-center flex-shrink-0">
                    <Calendar className="h-8 w-8 text-primary" />
                  </div>
                )}

                {/* Event Details */}
                <div className="flex-1 min-w-0">
                  <h3 className="font-semibold text-base mb-1 truncate">
                    {record.event.name}
                  </h3>
                  
                  <div className="space-y-1.5">
                    <div className="flex items-center gap-2 text-sm text-muted-foreground">
                      <Calendar className="h-3.5 w-3.5 flex-shrink-0" />
                      <span className="truncate">
                        {formatEventDate(record.event.start_datetime)}
                      </span>
                    </div>
                    
                    <div className="flex items-center gap-2 text-sm text-muted-foreground">
                      <MapPin className="h-3.5 w-3.5 flex-shrink-0" />
                      <span className="truncate">{record.event.location}</span>
                    </div>

                    <div className="flex items-center gap-2 text-sm">
                      <Clock className="h-3.5 w-3.5 flex-shrink-0 text-green-600" />
                      <span className="text-green-600 font-medium">
                        {formatDateTime(record.time_in)}
                      </span>
                    </div>

                    {record.time_out && (
                      <div className="flex items-center gap-2 text-sm">
                        <Clock className="h-3.5 w-3.5 flex-shrink-0 text-orange-600" />
                        <span className="text-orange-600 font-medium">
                          Out: {formatDateTime(record.time_out)}
                        </span>
                      </div>
                    )}
                  </div>
                </div>
              </div>
            </Card>
          ))}
        </div>
      )}
    </div>
  )
}