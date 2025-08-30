'use client'

import { useEffect, useState } from 'react'
import { useRouter } from 'next/navigation'
import { useAuth } from '@/contexts/AuthContext'
import { supabase } from '@/lib/supabase'
import { GraduationCap, Mail, Phone, MapPin, Clock, Users, Shield, BarChart3, Search, CheckCircle, XCircle } from 'lucide-react'
import Image from 'next/image'

interface AttendanceRecord {
  event_id: number
  event_name: string
  time_in?: string
  time_out?: string
}

interface StudentInfo {
  first_name: string
  middle_initial?: string
  last_name: string
}

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

export default function HomePage() {
  const { user, loading } = useAuth()
  const router = useRouter()
  const [showLoginButton, setShowLoginButton] = useState(false)
  const [studentSearchQuery, setStudentSearchQuery] = useState('')
  const [searchingStudent, setSearchingStudent] = useState(false)
  const [studentAttendance, setStudentAttendance] = useState<AttendanceRecord[]>([])
  const [studentInfo, setStudentInfo] = useState<StudentInfo | null>(null)
  const [studentSearchError, setStudentSearchError] = useState<string | null>(null)
  const [showStudentSearch, setShowStudentSearch] = useState(false)
  const [events, setEvents] = useState<Event[]>([])
  const [currentDate, setCurrentDate] = useState(new Date())
  const [eventsLoading, setEventsLoading] = useState(false)
  const [selectedEvent, setSelectedEvent] = useState<Event | null>(null)
  const [showEventModal, setShowEventModal] = useState(false)
  const [audio] = useState(typeof window !== 'undefined' ? new Audio('/audio/arayko.mp3') : null)

  useEffect(() => {
    if (!loading) {
      if (user) {
        router.push('/dashboard')
      } else {
        setShowLoginButton(true)
      }
    }
  }, [user, loading, router])

  useEffect(() => {
    fetchEvents()
  }, [])

  const fetchEvents = async () => {
    setEventsLoading(true)
    try {
      console.log('Fetching all events from Supabase...')
      const { data, error } = await supabase
        .from('events')
        .select('*')
        .order('start_datetime', { ascending: true })

      if (error) {
        console.error('Error fetching events:', error)
        console.error('Error details:', error.message)
      } else {
        console.log('Events fetched successfully:', data)
        setEvents(data || [])
      }
    } catch (error) {
      console.error('Error fetching events:', error)
    } finally {
      setEventsLoading(false)
    }
  }

  const handleStudentSearch = async () => {
    if (!studentSearchQuery.trim()) {
      setStudentSearchError('Please enter a Student ID')
      return
    }

    setSearchingStudent(true)
    setStudentSearchError(null)
    setStudentAttendance([])
    setStudentInfo(null)
    setShowStudentSearch(false)

    try {
      // First, check if the student exists and get their info
      const { data: student, error: studentError } = await supabase
        .from('user_profiles')
        .select('student_id, first_name, middle_initial, last_name')
        .eq('student_id', studentSearchQuery.trim())
        .eq('role_id', 1) // Only students
        .maybeSingle()

      if (studentError) {
        console.error('Error searching for student:', studentError)
        setStudentSearchError('Failed to search for student. Please try again.')
        return
      }

      if (!student) {
        setStudentSearchError('No student found with this Student ID')
        return
      }

      // Get attendance records for this student
      const { data: attendance, error: attendanceError } = await supabase
        .from('attendance')
        .select(`
          event_id,
          time_in,
          time_out,
          events!inner(
            name
          )
        `)
        .eq('student_id', studentSearchQuery.trim())

      if (attendanceError) {
        console.error('Error fetching attendance:', attendanceError)
        setStudentSearchError('Failed to fetch attendance records. Please try again.')
        return
      }

      // Transform the data
      const attendanceRecords: AttendanceRecord[] = attendance?.map(record => ({
        event_id: record.event_id,
        event_name: (record.events as any)?.name || 'Unknown Event',
        time_in: record.time_in,
        time_out: record.time_out
      })) || []

      setStudentInfo({
        first_name: student.first_name,
        middle_initial: student.middle_initial,
        last_name: student.last_name
      })
      setStudentAttendance(attendanceRecords)
      setShowStudentSearch(true)
      
      // Play audio if no attendance records found
      if (attendanceRecords.length === 0) {
        playNoAttendanceAudio()
      }
    } catch (error) {
      console.error('Error searching for student:', error)
      setStudentSearchError('An unexpected error occurred. Please try again.')
      setShowStudentSearch(false)
    } finally {
      setSearchingStudent(false)
    }
  }

  const handleStudentKeyPress = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter') {
      handleStudentSearch()
    }
  }

  // Calendar helper functions
  const getDaysInMonth = (date: Date) => {
    return new Date(date.getFullYear(), date.getMonth() + 1, 0).getDate()
  }

  const getFirstDayOfMonth = (date: Date) => {
    return new Date(date.getFullYear(), date.getMonth(), 1).getDay()
  }

  const formatDate = (date: Date) => {
    // Use local date formatting to avoid timezone issues
    const year = date.getFullYear()
    const month = String(date.getMonth() + 1).padStart(2, '0')
    const day = String(date.getDate()).padStart(2, '0')
    return `${year}-${month}-${day}`
  }

  const hasEventOnDate = (date: Date) => {
    const dateStr = formatDate(date)
    return events.some(event => {
      // Parse the event date string directly to avoid timezone conversion
      const eventDateStr = event.start_datetime.split('T')[0]
      return eventDateStr === dateStr
    })
  }

  const getEventOnDate = (date: Date) => {
    const dateStr = formatDate(date)
    return events.find(event => {
      // Parse the event date string directly to avoid timezone conversion
      const eventDateStr = event.start_datetime.split('T')[0]
      return eventDateStr === dateStr
    })
  }

  const previousMonth = () => {
    setCurrentDate(new Date(currentDate.getFullYear(), currentDate.getMonth() - 1, 1))
  }

  const nextMonth = () => {
    setCurrentDate(new Date(currentDate.getFullYear(), currentDate.getMonth() + 1, 1))
  }

  const handleEventClick = (event: Event) => {
    setSelectedEvent(event)
    setShowEventModal(true)
  }

  const closeEventModal = () => {
    setShowEventModal(false)
    setSelectedEvent(null)
  }

  const playNoAttendanceAudio = () => {
    if (audio) {
      audio.currentTime = 0
      audio.play().catch(error => {
        console.log('Audio playback failed:', error)
      })
    }
  }

  if (loading) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-orange-50 to-white flex items-center justify-center">
        <div className="text-center">
          <div className="inline-flex items-center justify-center w-16 h-16 bg-orange-500 rounded-full mb-4">
            <GraduationCap className="w-8 h-8 text-white" />
          </div>
          <h1 className="text-3xl font-bold text-gray-900 mb-2">Acetrack</h1>
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-orange-500 mx-auto mt-4"></div>
        </div>
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-orange-50 to-white">
      {/* Navigation Header */}
      <nav className="bg-white shadow-lg sticky top-0 z-50">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex justify-between items-center h-16">
            <div className="flex items-center space-x-4">
              <Image
                src="/images/aces-logo.png"
                alt="ACES Logo"
                width={120}
                height={40}
                className="h-10 w-auto"
              />
            </div>
            {showLoginButton && (
              <div className="flex items-center space-x-4">
                <button
                  onClick={() => router.push('/login')}
                  className="bg-orange-500 hover:bg-orange-600 text-white px-6 py-2 rounded-lg font-medium transition-colors duration-200"
                >
                  Login
                </button>
                <button
                  onClick={() => router.push('/register')}
                  className="border border-orange-500 text-orange-500 hover:bg-orange-50 px-6 py-2 rounded-lg font-medium transition-colors duration-200"
                >
                  Register
                </button>
              </div>
            )}
          </div>
        </div>
      </nav>

      {/* Hero Section */}
      <section className="py-20 px-4 sm:px-6 lg:px-8">
        <div className="max-w-7xl mx-auto text-center">
          <div className="mb-8">
            <Image
              src="/images/acetrack-font.png"
              alt="Acetrack"
              width={300}
              height={100}
              className="mx-auto h-20 w-auto"
            />
          </div>
          <h1 className="text-4xl md:text-6xl font-bold text-gray-900 mb-6">
            Modern Student
            <span className="text-orange-500"> Attendance Tracking</span>
            <span> System</span>
          </h1>
          <p className="text-xl text-gray-600 mb-8 max-w-3xl mx-auto">
            Streamline attendance management with our advanced QR code-based system. 
            Track student attendance efficiently and accurately.
          </p>
          
          {/* Student Search and Calendar Section */}
          <div className="bg-white rounded-lg shadow-lg p-6 mb-8 max-w-7xl mx-auto">
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
              {/* Left Column - Student Search */}
              <div>
                <h3 className="text-lg font-semibold text-gray-900 mb-4 text-center">Check Your Attendance</h3>
                <p className="text-sm text-gray-600 mb-6 text-center">
                  <strong>Note:</strong> This search is only available for registered students who use QR code for attendance tracking.
                </p>
                
                <div className="flex space-x-3 mb-4">
                  <div className="flex-1">
                    <input
                      type="text"
                      value={studentSearchQuery}
                      onChange={(e) => setStudentSearchQuery(e.target.value)}
                      onKeyPress={handleStudentKeyPress}
                      placeholder="Student ID"
                      className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-orange-500 focus:border-transparent"
                    />
                  </div>
                  <button
                    onClick={handleStudentSearch}
                    disabled={searchingStudent}
                    className="px-6 py-3 bg-orange-600 text-white rounded-lg hover:bg-orange-700 transition-colors disabled:opacity-50 disabled:cursor-not-allowed flex items-center space-x-2"
                  >
                    {searchingStudent ? (
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

                {studentSearchError && (
                  <div className="mb-4 p-4 bg-red-50 border border-red-200 rounded-lg">
                    <p className="text-red-700 text-sm">{studentSearchError}</p>
                  </div>
                )}

                {/* Student Attendance Results */}
                {showStudentSearch && studentAttendance.length > 0 && studentInfo && (
                  <div>
                    <div className="bg-orange-50 border border-orange-200 rounded-lg p-4 mb-4">
                      <h4 className="text-lg font-semibold text-gray-900 mb-1">
                        {studentInfo.first_name} {studentInfo.middle_initial} {studentInfo.last_name}
                      </h4>
                    </div>
                    <h4 className="text-md font-medium text-gray-900 mb-3">Attendance Records</h4>
                    <div className="space-y-3 max-h-64 overflow-y-auto">
                      {studentAttendance.map((record) => (
                        <div key={record.event_id} className="bg-gray-50 rounded-lg p-3">
                          <div className="flex items-center space-x-2 mb-2">
                            <CheckCircle className="w-4 h-4 text-green-600" />
                            <span className="text-sm font-medium text-gray-700">{record.event_name}</span>
                          </div>
                          <div className="grid grid-cols-2 gap-2 text-xs text-gray-600">
                            <div className="flex items-center space-x-1">
                              <span className="font-medium">Time In:</span>
                              <span>{record.time_in ? new Date(record.time_in).toLocaleTimeString('en-US', { 
                                hour: '2-digit', 
                                minute: '2-digit',
                                hour12: true 
                              }) : 'Not recorded'}</span>
                            </div>
                            <div className="flex items-center space-x-1">
                              <span className="font-medium">Time Out:</span>
                              <span>{record.time_out ? new Date(record.time_out).toLocaleTimeString('en-US', { 
                                hour: '2-digit', 
                                minute: '2-digit',
                                hour12: true 
                              }) : 'Not recorded'}</span>
                            </div>
                          </div>
                        </div>
                      ))}
                    </div>
                  </div>
                )}

                {showStudentSearch && studentAttendance.length === 0 && !studentSearchError && !searchingStudent && (
                  <div className="p-4 bg-blue-50 border border-blue-200 rounded-lg">
                    <p className="text-blue-700 text-sm text-center">No attendance records found for this Student ID.</p>
                  </div>
                )}
              </div>

                             {/* Right Column - Calendar */}
               <div>
                 <h3 className="text-lg font-semibold text-gray-900 mb-4 text-center">Calendar of Events</h3>
                                   <p className="text-sm text-gray-600 mb-6 text-center">
                    View all events and their scheduled dates. Event days are highlighted in orange.
                  </p>
                 
                 {eventsLoading && (
                   <div className="text-center py-4">
                     <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-orange-500 mx-auto mb-2"></div>
                     <p className="text-sm text-gray-600">Loading events...</p>
                   </div>
                 )}
                 
                 {!eventsLoading && events.length === 0 && (
                   <div className="text-center py-4">
                     <p className="text-sm text-gray-600">No events found for this month.</p>
                   </div>
                 )}
                 
                 {!eventsLoading && events.length > 0 && (
                   <div className="text-center mb-4">
                     <p className="text-sm text-gray-600">
                       {events.length} event{events.length !== 1 ? 's' : ''} found
                     </p>
                   </div>
                 )}
                
                <div className="bg-gray-50 rounded-lg p-4">
                  <div className="flex items-center justify-between mb-4">
                    <button
                      onClick={previousMonth}
                      className="p-2 hover:bg-gray-200 rounded-lg transition-colors"
                    >
                      <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
                      </svg>
                    </button>
                    <h4 className="text-lg font-semibold text-gray-900">
                      {currentDate.toLocaleDateString('en-US', { month: 'long', year: 'numeric' })}
                    </h4>
                    <button
                      onClick={nextMonth}
                      className="p-2 hover:bg-gray-200 rounded-lg transition-colors"
                    >
                      <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
                      </svg>
                    </button>
                  </div>

                  {/* Calendar Grid */}
                  <div className="grid grid-cols-7 gap-1 mb-2">
                    {['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'].map((day) => (
                      <div key={day} className="text-center text-sm font-medium text-gray-500 py-2">
                        {day}
                      </div>
                    ))}
                  </div>

                  <div className="grid grid-cols-7 gap-1">
                    {Array.from({ length: getFirstDayOfMonth(currentDate) }, (_, i) => (
                      <div key={`empty-${i}`} className="h-10"></div>
                    ))}
                    
                    {Array.from({ length: getDaysInMonth(currentDate) }, (_, i) => {
                      const day = i + 1
                      const date = new Date(currentDate.getFullYear(), currentDate.getMonth(), day)
                      const hasEvent = hasEventOnDate(date)
                      const event = hasEvent ? getEventOnDate(date) : null
                      
                      // Check if this is today's date
                      const today = new Date()
                      const isToday = date.getDate() === today.getDate() && 
                                    date.getMonth() === today.getMonth() && 
                                    date.getFullYear() === today.getFullYear()
                      
                      return (
                        <div
                          key={day}
                          className={`h-10 flex items-center justify-center text-sm rounded-lg cursor-pointer transition-colors relative ${
                            hasEvent 
                              ? isToday
                                ? 'bg-orange-600 text-white hover:bg-orange-700 border-2 border-orange-300'
                                : 'bg-orange-500 text-white hover:bg-orange-600'
                              : isToday
                                ? 'bg-orange-100 text-orange-800 hover:bg-orange-200 border-2 border-orange-300'
                                : 'hover:bg-gray-200'
                          }`}
                          title={event ? `Click to view ${event.name}` : isToday ? 'Today' : ''}
                          onClick={() => {
                            if (event) {
                              handleEventClick(event)
                            }
                          }}
                        >
                          <span className="relative">
                            {day}
                            {isToday && (
                              <span className="absolute -top-2 -right-2 text-xs font-bold text-orange-600 bg-white rounded-full px-1">
                                TODAY
                              </span>
                            )}
                          </span>
                          {hasEvent && !isToday && (
                            <div className="absolute -top-1 -right-1 w-2 h-2 bg-red-500 rounded-full"></div>
                          )}
                        </div>
                      )
                    })}
                  </div>

                  {/* Event Legend */}
                  <div className="mt-4 pt-4 border-t border-gray-200">
                    <div className="flex items-center space-x-2 text-sm text-gray-600">
                      <div className="w-3 h-3 bg-orange-500 rounded"></div>
                      <span>Event Day</span>
                    </div>
                  </div>
                </div>
              </div>
            </div>
          </div>

          {showLoginButton && (
            <div className="flex flex-col sm:flex-row gap-4 justify-center">
              <button
                onClick={() => router.push('/login')}
                className="bg-orange-500 hover:bg-orange-600 text-white px-8 py-3 rounded-lg font-medium text-lg transition-colors duration-200"
              >
                Get Started
              </button>
              <button
                onClick={() => router.push('/register')}
                className="border-2 border-orange-500 text-orange-500 hover:bg-orange-50 px-8 py-3 rounded-lg font-medium text-lg transition-colors duration-200"
              >
                Learn More
              </button>
            </div>
          )}
        </div>
      </section>

      {/* About ACES Section */}
      <section className="py-20 bg-white">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="text-center mb-16">
            <h2 className="text-3xl md:text-4xl font-bold text-gray-900 mb-4">
              About ACES
            </h2>
            <div className="w-24 h-1 bg-orange-500 mx-auto"></div>
          </div>
          <div className="grid md:grid-cols-2 gap-12 items-center">
            <div>
              <Image
                src="/images/aces-logo.png"
                alt="ACES Logo"
                width={400}
                height={400}

              />
            </div>
            <div>
              <h3 className="text-2xl font-bold text-gray-900 mb-6">
                Association of Computer Engineering Students
              </h3>
              <p className="text-lg text-gray-600 mb-6">
                ACES is a premier student organization within the Faculty of Computing Engineering and Technology (FaCET), 
                dedicated to fostering excellence in computer, solving problems and engineering education. We provide opportunities for students 
                to develop technical skills, leadership abilities, and professional networks within the computing and technology field.
              </p>
              <div className="grid grid-cols-2 gap-4">
                <div className="flex items-center space-x-3">
                  <Users className="w-6 h-6 text-orange-500" />
                  <span className="text-gray-700">Student Community</span>
                </div>
                <div className="flex items-center space-x-3">
                  <Shield className="w-6 h-6 text-orange-500" />
                  <span className="text-gray-700">Professional Development</span>
                </div>
                <div className="flex items-center space-x-3">
                  <BarChart3 className="w-6 h-6 text-orange-500" />
                  <span className="text-gray-700">Technical Excellence</span>
                </div>
                <div className="flex items-center space-x-3">
                  <Clock className="w-6 h-6 text-orange-500" />
                  <span className="text-gray-700">24/7 Support</span>
                </div>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* About ACETRACK Attendance System Section */}
      <section className="py-20 bg-gray-50">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="text-center mb-16">
            <h2 className="text-3xl md:text-4xl font-bold text-gray-900 mb-4">
              About ACETRACK Attendance System
            </h2>
            <div className="w-24 h-1 bg-orange-500 mx-auto"></div>
          </div>
          <div className="grid md:grid-cols-3 gap-8">
            <div className="bg-white p-8 rounded-lg shadow-lg text-center">
              <div className="w-16 h-16 bg-orange-100 rounded-full flex items-center justify-center mx-auto mb-6">
                <GraduationCap className="w-8 h-8 text-orange-500" />
              </div>
              <h3 className="text-xl font-bold text-gray-900 mb-4">QR Code Technology</h3>
              <p className="text-gray-600">
                Advanced QR code scanning for quick and accurate student identification and attendance tracking.
              </p>
            </div>
            <div className="bg-white p-8 rounded-lg shadow-lg text-center">
              <div className="w-16 h-16 bg-orange-100 rounded-full flex items-center justify-center mx-auto mb-6">
                <BarChart3 className="w-8 h-8 text-orange-500" />
              </div>
              <h3 className="text-xl font-bold text-gray-900 mb-4">Real-time Analytics</h3>
              <p className="text-gray-600">
                Comprehensive attendance reports and analytics to help educators make informed decisions.
              </p>
            </div>
            <div className="bg-white p-8 rounded-lg shadow-lg text-center">
              <div className="w-16 h-16 bg-orange-100 rounded-full flex items-center justify-center mx-auto mb-6">
                <Shield className="w-8 h-8 text-orange-500" />
              </div>
              <h3 className="text-xl font-bold text-gray-900 mb-4">Secure & Reliable</h3>
              <p className="text-gray-600">
                Built with modern security protocols to ensure data privacy and system reliability.
              </p>
            </div>
          </div>
          <div className="mt-12 text-center">
            <p className="text-lg text-gray-600 max-w-3xl mx-auto">
              Our attendance system is designed to streamline the process of tracking student attendance 
              while providing valuable insights for educational institutions. With features like real-time 
              monitoring, detailed reporting, and user-friendly interfaces, ACETRACK makes attendance 
              management efficient and effective.
            </p>
          </div>
        </div>
      </section>

      {/* Contact Section */}
      <section className="py-20 bg-white">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="text-center mb-16">
            <h2 className="text-3xl md:text-4xl font-bold text-gray-900 mb-4">
              Contact Us
            </h2>
            <div className="w-24 h-1 bg-orange-500 mx-auto"></div>
          </div>
          <div className="max-w-2xl mx-auto text-center">
            <h3 className="text-2xl font-bold text-gray-900 mb-6">Get in Touch</h3>
            <p className="text-lg text-gray-600 mb-12">
              Have questions about our attendance system or need support? 
              We're here to help you get the most out of ACETRACK.
            </p>
            <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
              <div className="flex flex-col items-center space-y-3">
                <div className="w-16 h-16 bg-orange-100 rounded-full flex items-center justify-center">
                  <Mail className="w-8 h-8 text-orange-500" />
                </div>
                <div className="text-center">
                  <h4 className="font-semibold text-gray-900 text-lg">Email</h4>
                  <p className="text-gray-600">acetrack2025@gmail.com</p>
                </div>
              </div>
              <div className="flex flex-col items-center space-y-3">
                <div className="w-16 h-16 bg-orange-100 rounded-full flex items-center justify-center">
                  <Phone className="w-8 h-8 text-orange-500" />
                </div>
                <div className="text-center">
                  <h4 className="font-semibold text-gray-900 text-lg">Phone</h4>
                  <p className="text-gray-600">09363288483 - PIO</p>
                </div>
              </div>
              <div className="flex flex-col items-center space-y-3">
                <div className="w-16 h-16 bg-orange-100 rounded-full flex items-center justify-center">
                  <MapPin className="w-8 h-8 text-orange-500" />
                </div>
                <div className="text-center">
                  <h4 className="font-semibold text-gray-900 text-lg">Address</h4>
                  <p className="text-gray-600">Engineering Extension Building<br />DOrSU Main Campus</p>
                </div>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* Footer */}
      <footer className="bg-gray-900 text-white py-12">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="grid md:grid-cols-4 gap-8">
            <div>
              <Image
                src="/images/acetrack-font.png"
                alt="Acetrack"
                width={150}
                height={50}
                className="h-10 w-auto mb-4"
              />
              <p className="text-gray-400">
                Modern student attendance tracking system for educational institutions.
              </p>
            </div>
            <div>
              <h4 className="font-semibold mb-4">Quick Links</h4>
              <ul className="space-y-2 text-gray-400">
                <li><a href="#" className="hover:text-white transition-colors">Home</a></li>
                <li><a href="#" className="hover:text-white transition-colors">About</a></li>
                <li><a href="#" className="hover:text-white transition-colors">Features</a></li>
                <li><a href="#" className="hover:text-white transition-colors">Contact</a></li>
              </ul>
            </div>
            <div>
              <h4 className="font-semibold mb-4">Support</h4>
              <ul className="space-y-2 text-gray-400">
                <li><a href="#" className="hover:text-white transition-colors">Help Center</a></li>
                <li><a href="#" className="hover:text-white transition-colors">Documentation</a></li>
                <li><a href="#" className="hover:text-white transition-colors">Privacy Policy</a></li>
                <li><a href="#" className="hover:text-white transition-colors">Terms of Service</a></li>
              </ul>
            </div>
            <div>
              <h4 className="font-semibold mb-4">Connect</h4>
              <div className="flex space-x-4">
                <a href="https://www.facebook.com/dorsu.aces" target="_blank" rel="noopener noreferrer" className="text-gray-400 hover:text-white transition-colors">
                  <span className="sr-only">Facebook</span>
                    
                  <svg className="h-6 w-6" fill="currentColor" viewBox="0 0 24 24">
                    <path d="M24 12.073c0-6.627-5.373-12-12-12s-12 5.373-12 12c0 5.99 4.388 10.954 10.125 11.854v-8.385H7.078v-3.47h3.047V9.43c0-3.007 1.792-4.669 4.533-4.669 1.312 0 2.686.235 2.686.235v2.953H15.83c-1.491 0-1.956.925-1.956 1.874v2.25h3.328l-.532 3.47h-2.796v8.385C19.612 23.027 24 18.062 24 12.073z"/>
                  </svg>
                </a>
                {/* <a href="#" className="text-gray-400 hover:text-white transition-colors">
                  <span className="sr-only">Twitter</span>
                  <svg className="h-6 w-6" fill="currentColor" viewBox="0 0 24 24">
                    <path d="M23.953 4.57a10 10 0 01-2.825.775 4.958 4.958 0 002.163-2.723c-.951.555-2.005.959-3.127 1.184a4.92 4.92 0 00-8.384 4.482C7.69 8.095 4.067 6.13 1.64 3.162a4.822 4.822 0 00-.666 2.475c0 1.71.87 3.213 2.188 4.096a4.904 4.904 0 01-2.228-.616v.06a4.923 4.923 0 003.946 4.827 4.996 4.996 0 01-2.212.085 4.936 4.936 0 004.604 3.417 9.867 9.867 0 01-6.102 2.105c-.39 0-.779-.023-1.17-.067a13.995 13.995 0 007.557 2.209c9.053 0 13.998-7.496 13.998-13.985 0-.21 0-.42-.015-.63A9.935 9.935 0 0024 4.59z"/>
                  </svg>
                </a> */}
                {/* <a href="#" className="text-gray-400 hover:text-white transition-colors">
                  <span className="sr-only">LinkedIn</span>
                  <svg className="h-6 w-6" fill="currentColor" viewBox="0 0 24 24">
                    <path d="M20.447 20.452h-3.554v-5.569c0-1.328-.027-3.037-1.852-3.037-1.853 0-2.136 1.445-2.136 2.939v5.667H9.351V9h3.414v1.561h.046c.477-.9 1.637-1.85 3.37-1.85 3.601 0 4.267 2.37 4.267 5.455v6.286zM5.337 7.433c-1.144 0-2.063-.926-2.063-2.065 0-1.138.92-2.063 2.063-2.063 1.14 0 2.064.925 2.064 2.063 0 1.139-.925 2.065-2.064 2.065zm1.782 13.019H3.555V9h3.564v11.452zM22.225 0H1.771C.792 0 0 .774 0 1.729v20.542C0 23.227.792 24 1.771 24h20.451C23.2 24 24 23.227 24 22.271V1.729C24 .774 23.2 0 22.222 0h.003z"/>
                  </svg>
                </a> */}
              </div>
            </div>
          </div>
          <div className="border-t border-gray-800 mt-8 pt-8 text-center text-gray-400">
            <p>&copy; 2025 ACETRACK. All rights reserved. | Developed by Roberto Prisoris</p>
          </div>
        </div>
      </footer>

      {/* Event Details Modal */}
      {showEventModal && selectedEvent && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-lg max-w-2xl w-full max-h-[90vh] overflow-y-auto">
            {/* Modal Header */}
            <div className="flex items-center justify-between p-6 border-b border-gray-200">
              <h3 className="text-xl font-semibold text-gray-900">Event Details</h3>
              <button
                onClick={closeEventModal}
                className="text-gray-400 hover:text-gray-600 transition-colors"
              >
                <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                </svg>
              </button>
            </div>

            {/* Modal Content */}
            <div className="p-6">
              {/* Event Banner */}
              {selectedEvent.banner && (
                <div className="mb-6">
                  <img
                    src={selectedEvent.banner}
                    alt={selectedEvent.name}
                    className="w-full h-48 object-cover rounded-lg"
                    onError={(e) => {
                      e.currentTarget.style.display = 'none'
                    }}
                  />
                </div>
              )}

              {/* Event Name */}
              <h2 className="text-2xl font-bold text-gray-900 mb-4">{selectedEvent.name}</h2>

              {/* Event Details Grid */}
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-6">
                <div className="flex items-center space-x-3">
                  <MapPin className="w-5 h-5 text-orange-500" />
                  <div>
                    <p className="text-sm font-medium text-gray-500">Location</p>
                    <p className="text-gray-900">{selectedEvent.location}</p>
                  </div>
                </div>

                <div className="flex items-center space-x-3">
                  <Clock className="w-5 h-5 text-orange-500" />
                  <div>
                    <p className="text-sm font-medium text-gray-500">Date & Time</p>
                    <p className="text-gray-900">
                      {new Date(selectedEvent.start_datetime).toLocaleDateString('en-US', {
                        weekday: 'long',
                        year: 'numeric',
                        month: 'long',
                        day: 'numeric'
                      })}
                    </p>
                    <p className="text-sm text-gray-600">
                      {new Date(selectedEvent.start_datetime).toLocaleTimeString('en-US', {
                        hour: '2-digit',
                        minute: '2-digit',
                        hour12: true
                      })} - {new Date(selectedEvent.end_datetime).toLocaleTimeString('en-US', {
                        hour: '2-digit',
                        minute: '2-digit',
                        hour12: true
                      })}
                    </p>
                  </div>
                </div>

                <div className="flex items-center space-x-3">
                  {/* <div className="w-5 h-5 flex items-center justify-center">
                    <div className={`w-3 h-3 rounded-full ${selectedEvent.status === 1 ? 'bg-green-500' : 'bg-gray-400'}`}></div>
                  </div>
                  <div>
                    <p className="text-sm font-medium text-gray-500">Status</p>
                    <p className={`font-medium ${selectedEvent.status === 1 ? 'text-green-600' : 'text-gray-600'}`}>
                      {selectedEvent.status === 1 ? 'Active' : 'Inactive'}
                    </p>
                  </div> */}
                </div>
              </div>

              {/* Event Description */}
              {selectedEvent.description && (
                <div className="mb-6">
                  <h4 className="text-lg font-semibold text-gray-900 mb-2">Description</h4>
                  <p className="text-gray-700 leading-relaxed">{selectedEvent.description}</p>
                </div>
              )}
            </div>

            {/* Modal Footer */}
            <div className="flex justify-end p-6 border-t border-gray-200">
              <button
                onClick={closeEventModal}
                className="px-4 py-2 bg-gray-300 text-gray-700 rounded-lg hover:bg-gray-400 transition-colors"
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
