'use client'

import { useState, useEffect } from 'react'
import { useRouter } from 'next/navigation'
import { useAuth } from '@/contexts/AuthContext'
import { LogOut, ChevronDown, Download, Calendar, Users, FileText, MapPin, Clock, ChevronDown as ChevronDownIcon, CheckCircle, XCircle } from 'lucide-react'
import { supabase } from '@/lib/supabase'
import * as XLSX from 'xlsx'
import { PieChart, Pie, Cell, ResponsiveContainer, Tooltip, Legend } from 'recharts'

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
  course_name: string
  course_short: string
}

interface UserProfile {
  id: string
  first_name: string
  last_name: string
  middle_name?: string
  email: string
  student_id: string
  year_level: string
  course?: {
    course_name: string
    short: string
  }
}

export default function AdminRecordsPage() {
  const { user, signOut, checkAndRefreshSession } = useAuth()
  const router = useRouter()
  const [profile, setProfile] = useState<UserProfile | null>(null)
  const [loading, setLoading] = useState(true)
  const [showDropdown, setShowDropdown] = useState(false)
  const [events, setEvents] = useState<Event[]>([])
  const [selectedEvent, setSelectedEvent] = useState<Event | null>(null)
  const [attendanceRecords, setAttendanceRecords] = useState<AttendanceRecord[]>([])
  const [loadingRecords, setLoadingRecords] = useState(false)
  const [downloading, setDownloading] = useState(false)
  const [showEventDropdown, setShowEventDropdown] = useState(false)
  const [totalUsers, setTotalUsers] = useState(0)
  const [loadingUsers, setLoadingUsers] = useState(false)

  useEffect(() => {
    const initializeAuth = async () => {
      if (!user) {
        router.push('/login')
        return
      }

      try {
        await checkAndRefreshSession()
        await fetchUserProfile()
        await fetchEvents()
      } catch (error) {
        console.error('Auth initialization error:', error)
        router.push('/login')
      } finally {
        setLoading(false)
      }
    }

    initializeAuth()
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [user, router])

  // Close dropdowns when clicking outside
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      const target = event.target as HTMLElement
      if (showEventDropdown && !target.closest('.event-dropdown')) {
        setShowEventDropdown(false)
      }
    }

    document.addEventListener('mousedown', handleClickOutside)
    return () => {
      document.removeEventListener('mousedown', handleClickOutside)
    }
  }, [showEventDropdown])

  const fetchUserProfile = async () => {
    try {
      const { data: { user } } = await supabase.auth.getUser()
      
      if (!user) return

      const { data: profileData, error } = await supabase
        .from('user_profiles')
        .select(`
          id,
          first_name,
          last_name,
          middle_initial,
          student_id,
          year_level,
          course:courses (
            course_name,
            short
          )
        `)
        .eq('id', user.id)
        .single()

      if (error) {
        console.error('Error fetching profile:', error)
        return
      }

      setProfile({
        ...profileData,
        email: user.email || '',
        course: profileData.course?.[0] || null
      })
    } catch (error) {
      console.error('Error fetching profile:', error)
    }
  }

  const fetchEvents = async () => {
    console.log('Fetching events...')
    try {
      const { data: eventsData, error } = await supabase
        .from('events')
        .select('*')
        .order('start_datetime', { ascending: false })

      if (error) {
        console.error('Error fetching events:', error)
        return
      }

      console.log('Events fetched:', eventsData)
      setEvents(eventsData || [])
    } catch (error) {
      console.error('Error fetching events:', error)
    }
  }

  const fetchAttendanceRecords = async (eventId: number) => {
    setLoadingRecords(true)
    console.log('Fetching attendance records for event:', eventId)
    try {
      const { data: recordsData, error } = await supabase
        .from('attendance')
        .select(`
          *,
          courses:course_id (
            course_name,
            short
          )
        `)
        .eq('event_id', eventId)

      if (error) {
        console.error('Error fetching attendance records:', error)
        return
      }

      console.log('Raw attendance records:', recordsData?.length)
      
      // Transform the data to include course information
      const transformedRecords = recordsData?.map(record => ({
        ...record,
        course_name: record.courses?.course_name || 'Unknown',
        course_short: record.courses?.short || 'Unknown'
      })) || []

      console.log('Transformed records count:', transformedRecords.length)
      setAttendanceRecords(transformedRecords)
    } catch (error) {
      console.error('Error fetching attendance records:', error)
    } finally {
      setLoadingRecords(false)
    }
  }

  const fetchTotalUsers = async () => {
    setLoadingUsers(true)
    console.log('Fetching total students...')
    try {
      const { count, error } = await supabase
        .from('user_profiles')
        .select('*', { count: 'exact', head: true })
        .eq('role_id', 1) // Only students

      if (error) {
        console.error('Error fetching total students:', error)
        return
      }

      console.log('Total students count:', count)
      setTotalUsers(count || 0)
    } catch (error) {
      console.error('Error fetching total students:', error)
    } finally {
      setLoadingUsers(false)
    }
  }

  const handleEventSelect = (event: Event) => {
    console.log('Event selected:', event)
    setSelectedEvent(event)
    setShowEventDropdown(false)
    fetchAttendanceRecords(event.id)
    fetchTotalUsers()
  }

  const downloadExcel = async () => {
    if (!selectedEvent || attendanceRecords.length === 0) return

    setDownloading(true)
    try {
      // Prepare data for Excel
      const excelData = attendanceRecords.map((record, index) => ({
        'No.': index + 1,
        'Student ID': record.student_id,
        'First Name': record.firstname,
        'Middle Name': record.middlename || '',
        'Last Name': record.lastname,
        'Course': record.course_name,
        'Year Level': record.year_level,
        'Time In': record.time_in ? new Date(record.time_in).toLocaleString() : 'Not recorded',
        'Time Out': record.time_out ? new Date(record.time_out).toLocaleString() : 'Not recorded'
      }))

      // Create workbook and worksheet
      const wb = XLSX.utils.book_new()
      const ws = XLSX.utils.json_to_sheet(excelData)

      // Set column widths
      const colWidths = [
        { wch: 5 },   // No.
        { wch: 15 },  // Student ID
        { wch: 20 },  // First Name
        { wch: 20 },  // Middle Name
        { wch: 20 },  // Last Name
        { wch: 30 },  // Course
        { wch: 12 },  // Year Level
        { wch: 20 },  // Time In
        { wch: 20 }   // Time Out
      ]
      ws['!cols'] = colWidths

      // Add the worksheet to workbook
      XLSX.utils.book_append_sheet(wb, ws, 'Attendance Records')

      // Generate filename with event name and current date
      const eventName = selectedEvent.name.replace(/[^a-zA-Z0-9]/g, '_')
      const currentDate = new Date().toISOString().split('T')[0]
      const filename = `${eventName}_Attendance_${currentDate}.xlsx`

      // Download the file
      XLSX.writeFile(wb, filename)
    } catch (error) {
      console.error('Error generating Excel file:', error)
    } finally {
      setDownloading(false)
    }
  }

  const handleSignOut = async () => {
    try {
      await signOut()
      router.push('/login')
    } catch (error) {
      console.error('Sign out error:', error)
    }
  }

  if (loading) {
    return (
      <div className="min-h-screen bg-white flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-orange-600 mx-auto"></div>
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
              className="text-gray-600 hover:text-gray-900 mr-4"
            >
              <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
              </svg>
            </button>
            <div className="flex items-center space-x-2">
              <FileText className="w-6 h-6 text-orange-600" />
              <h1 className="text-xl font-semibold text-gray-900">Attendance Records</h1>
            </div>
          </div>

          {/* User Dropdown */}
          <div className="relative">
            <button
              onClick={() => setShowDropdown(!showDropdown)}
              className="flex items-center space-x-2 p-2 rounded-lg hover:bg-gray-100 transition-colors"
            >
              <div className="w-8 h-8 bg-orange-100 rounded-full flex items-center justify-center">
                <span className="text-orange-600 font-medium text-sm">
                  {profile?.first_name?.[0]}{profile?.last_name?.[0]}
                </span>
              </div>
              <span className="text-sm font-medium text-gray-700">
                {profile?.first_name} {profile?.last_name}
              </span>
              <ChevronDown className="w-4 h-4 text-gray-500" />
            </button>

            {/* Dropdown Menu */}
            {showDropdown && (
              <div className="absolute right-0 mt-2 w-48 bg-white rounded-lg shadow-lg border border-gray-200 py-2 z-50">
                <div className="px-4 py-2 text-xs text-gray-500 border-b border-gray-100">
                  Administrator
                </div>
                <button
                  onClick={() => {
                    setShowDropdown(false)
                    router.push('/admin')
                  }}
                  className="w-full text-left px-4 py-2 text-sm text-gray-700 hover:bg-gray-100 transition-colors flex items-center"
                >
                  <svg className="w-4 h-4 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 7v10a2 2 0 002 2h14a2 2 0 002-2V9a2 2 0 00-2-2H5a2 2 0 00-2-2z" />
                  </svg>
                  Dashboard
                </button>
                <button
                  onClick={() => {
                    setShowDropdown(false)
                    router.push('/admin/search')
                  }}
                  className="w-full text-left px-4 py-2 text-sm text-gray-700 hover:bg-gray-100 transition-colors flex items-center"
                >
                  <svg className="w-4 h-4 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
                  </svg>
                  Search Student
                </button>
                <button
                  onClick={() => {
                    setShowDropdown(false)
                    handleSignOut()
                  }}
                  className="w-full text-left px-4 py-2 text-sm text-gray-700 hover:bg-gray-100 transition-colors flex items-center"
                >
                  <LogOut className="w-4 h-4 mr-2" />
                  Logout
                </button>
              </div>
            )}
          </div>
        </div>
      </header>

      {/* Content Area */}
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-6">
        {/* Desktop Dashboard Layout */}
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
          {/* Left Sidebar - Event Selection */}
          <div className="lg:col-span-4">
            <div className="bg-white rounded-lg border border-gray-200 p-6">
              <div className="flex items-center mb-4">
                <Calendar className="w-5 h-5 text-orange-600 mr-2" />
                <h2 className="text-lg font-semibold text-gray-900">Select Event</h2>
              </div>
              
              <div className="relative event-dropdown">
                <button
                  onClick={() => {
                    console.log('Dropdown clicked, current state:', showEventDropdown)
                    console.log('Events available:', events.length)
                    setShowEventDropdown(!showEventDropdown)
                  }}
                  className="w-full flex items-center justify-between p-3 bg-gray-50 border border-gray-200 rounded-lg hover:border-orange-300 focus:outline-none focus:border-orange-500 transition-colors"
                >
                  <div className="text-left">
                    {selectedEvent ? (
                      <div>
                        <h3 className="font-medium text-gray-900 text-sm">{selectedEvent.name}</h3>
                        <p className="text-xs text-gray-600">{selectedEvent.location}</p>
                      </div>
                    ) : (
                      <span className="text-gray-500 text-sm">Choose an event...</span>
                    )}
                  </div>
                  <ChevronDownIcon className={`w-4 h-4 text-gray-400 transition-transform ${showEventDropdown ? 'rotate-180' : ''}`} />
                </button>

                {showEventDropdown && (
                  <div className="absolute top-full left-0 right-0 mt-1 bg-white border border-gray-200 rounded-lg shadow-lg z-50 max-h-60 overflow-y-auto">
                    {events.length === 0 ? (
                      <div className="p-3 text-center text-gray-500 text-sm">
                        No events available
                      </div>
                    ) : (
                      events.map((event) => (
                        <button
                          key={event.id}
                          onClick={() => handleEventSelect(event)}
                          className="w-full text-left p-3 hover:bg-orange-50 transition-colors border-b border-gray-100 last:border-b-0"
                        >
                          <h3 className="font-medium text-gray-900 text-sm mb-1">{event.name}</h3>
                          <p className="text-xs text-gray-600 mb-1 flex items-center">
                            <MapPin className="w-3 h-3 mr-1 text-orange-600" />
                            {event.location}
                          </p>
                          <p className="text-xs text-gray-500 mb-2 flex items-center">
                            <Clock className="w-3 h-3 mr-1 text-orange-600" />
                            {new Date(event.start_datetime).toLocaleDateString()} - {new Date(event.end_datetime).toLocaleDateString()}
                          </p>
                          <div className={`inline-block px-2 py-1 rounded-full text-xs font-medium ${
                            event.status === 1 ? 'bg-green-100 text-green-800' : 'bg-gray-100 text-gray-800'
                          }`}>
                            {event.status === 1 ? 'Active' : 'Inactive'}
                          </div>
                        </button>
                      ))
                    )}
                  </div>
                )}
              </div>
            </div>
          </div>

          {/* Right Content Area */}
          <div className="lg:col-span-8">


            {/* Statistics Section */}
            {selectedEvent && (
              <div className="bg-white rounded-lg border border-gray-200 p-6 mb-6">
                <div className="flex items-center mb-4">
                  <Users className="w-5 h-5 text-orange-600 mr-2" />
                  <h2 className="text-lg font-semibold text-gray-900">Attendance Statistics</h2>
                </div>
                
                {loadingRecords || loadingUsers ? (
                  <div className="flex items-center justify-center py-8">
                    <div className="animate-spin rounded-full h-6 w-6 border-b-2 border-orange-600 mr-3"></div>
                    <span className="text-gray-600">Loading statistics...</span>
                  </div>
                ) : (
                  <div className="grid grid-cols-1 xl:grid-cols-2 gap-6">
                    {/* Pie Chart */}
                    <div className="bg-gray-50 rounded-lg p-4">
                      <h3 className="text-base font-semibold text-gray-900 mb-3 text-center">Attendance Overview</h3>
                      <div className="h-48">
                        <ResponsiveContainer width="100%" height="100%">
                          <PieChart>
                            <Pie
                              data={[
                                { name: 'Attended', value: attendanceRecords.length, color: '#ea580c' },
                                { name: 'Not Attended', value: Math.max(0, totalUsers - attendanceRecords.length), color: '#e5e7eb' }
                              ]}
                              cx="50%"
                              cy="50%"
                              innerRadius={40}
                              outerRadius={80}
                              paddingAngle={5}
                              dataKey="value"
                            >
                              {[
                                { name: 'Attended', value: attendanceRecords.length, color: '#ea580c' },
                                { name: 'Not Attended', value: Math.max(0, totalUsers - attendanceRecords.length), color: '#e5e7eb' }
                              ].map((entry, index) => (
                                <Cell key={`cell-${index}`} fill={entry.color} />
                              ))}
                            </Pie>
                            <Tooltip />
                            <Legend />
                          </PieChart>
                        </ResponsiveContainer>
                      </div>
                    </div>

                    {/* Statistics Cards */}
                    <div className="grid grid-cols-2 gap-3">
                      <div className="bg-orange-50 rounded-lg p-4 border border-orange-200">
                        <div className="flex items-center justify-between">
                          <div>
                            <p className="text-xs font-medium text-orange-600">Total Students</p>
                            <p className="text-2xl font-bold text-orange-700">{totalUsers}</p>
                          </div>
                          <Users className="w-6 h-6 text-orange-600" />
                        </div>
                      </div>
                      
                      <div className="bg-green-50 rounded-lg p-4 border border-green-200">
                        <div className="flex items-center justify-between">
                          <div>
                            <p className="text-xs font-medium text-green-600">Attended</p>
                            <p className="text-2xl font-bold text-green-700">{attendanceRecords.length}</p>
                          </div>
                          <CheckCircle className="w-6 h-6 text-green-600" />
                        </div>
                      </div>
                      
                      <div className="bg-gray-50 rounded-lg p-4 border border-gray-200">
                        <div className="flex items-center justify-between">
                          <div>
                            <p className="text-xs font-medium text-gray-600">Not Attended</p>
                            <p className="text-2xl font-bold text-gray-700">{Math.max(0, totalUsers - attendanceRecords.length)}</p>
                          </div>
                          <XCircle className="w-6 h-6 text-gray-600" />
                        </div>
                      </div>
                      
                      <div className="bg-blue-50 rounded-lg p-4 border border-blue-200">
                        <div className="flex items-center justify-between">
                          <div>
                            <p className="text-xs font-medium text-blue-600">Attendance Rate</p>
                            <p className="text-2xl font-bold text-blue-700">
                              {totalUsers > 0 ? Math.round((attendanceRecords.length / totalUsers) * 100) : 0}%
                            </p>
                          </div>
                          <Calendar className="w-6 h-6 text-blue-600" />
                        </div>
                      </div>
                    </div>
                  </div>
                )}
              </div>
            )}

            {/* Download Section */}
            {selectedEvent && (
              <div className="bg-gradient-to-r from-orange-50 to-orange-100 rounded-lg border border-orange-200 p-4 sm:p-6">
                <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
                  <div className="flex items-center">
                    <div className="w-10 h-10 sm:w-12 sm:h-12 bg-orange-100 rounded-lg flex items-center justify-center mr-3 sm:mr-4">
                      <FileText className="w-5 h-5 sm:w-6 sm:h-6 text-orange-600" />
                    </div>
                    <div className="min-w-0 flex-1">
                      <h3 className="text-base sm:text-lg font-bold text-gray-900 truncate">{selectedEvent.name}</h3>
                      <div className="text-xs sm:text-sm text-gray-600">
                        {loadingRecords ? (
                          <span className="flex items-center">
                            <div className="animate-spin rounded-full h-3 w-3 sm:h-4 sm:w-4 border-b-2 border-orange-600 mr-2"></div>
                            Loading records...
                          </span>
                        ) : (
                          `${attendanceRecords.length} registered students`
                        )}
                      </div>
                    </div>
                  </div>
                  
                  <button
                    onClick={downloadExcel}
                    disabled={attendanceRecords.length === 0 || downloading || loadingRecords}
                    className="w-full sm:w-auto inline-flex items-center justify-center px-4 sm:px-6 py-2 sm:py-3 bg-orange-600 text-white rounded-lg hover:bg-orange-700 disabled:opacity-50 disabled:cursor-not-allowed transition-all duration-200 font-semibold text-sm"
                  >
                    <Download className="w-4 h-4 mr-2" />
                    {downloading ? 'Generating...' : 'Download Excel'}
                  </button>
                </div>
                
                {attendanceRecords.length === 0 && !loadingRecords && (
                  <p className="text-gray-500 text-xs sm:text-sm mt-3">
                    No attendance records found for this event.
                  </p>
                )}
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  )
}
