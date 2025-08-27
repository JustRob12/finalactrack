'use client'

import { useState, useEffect, useRef } from 'react'
import { useRouter } from 'next/navigation'
import { useAuth } from '@/contexts/AuthContext'
import { supabase } from '@/lib/supabase'
import { User, LogOut, ChevronDown, Shield, Home, Calendar, QrCode, Users, Settings, Plus, MapPin, Clock, CheckCircle, XCircle, Upload, X, Play, Square, Clock3, BookOpen } from 'lucide-react'
import jsQR from 'jsqr'

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

export default function ScannerDashboardPage() {
  const { user, signOut, checkAndRefreshSession } = useAuth()
  const router = useRouter()

  // Helper function to check if event is coming soon
  const isEventComingSoon = (eventDate: string) => {
    const eventStartDate = new Date(eventDate)
    const currentDate = new Date()
    return eventStartDate > currentDate
  }
  
  const [profile, setProfile] = useState<UserProfile | null>(null)
  const [loading, setLoading] = useState(true)
  const [showDropdown, setShowDropdown] = useState(false)
  const [activeTab, setActiveTab] = useState('event')
  const [events, setEvents] = useState<Event[]>([])
  const [eventsLoading, setEventsLoading] = useState(false)

  // QR Scanner states
  const [selectedEvent, setSelectedEvent] = useState<number | null>(null)
  const [scanType, setScanType] = useState<'time_in' | 'time_out'>('time_in')
  const [isScanning, setIsScanning] = useState(false)
  const [scannedData, setScannedData] = useState<{
    id: string
    student_id: string
    first_name: string
    middle_initial?: string
    last_name: string
    email: string
    year_level: string
    course: string
    avatar?: string
    timestamp: string
  } | null>(null)
  const [showApprovalModal, setShowApprovalModal] = useState(false)
  const [showDuplicateModal, setShowDuplicateModal] = useState(false)
  const [duplicateStudentData, setDuplicateStudentData] = useState<{
    id: string
    student_id: string
    first_name: string
    middle_initial?: string
    last_name: string
    email: string
    year_level: string
    course: string
    avatar?: string
    timestamp: string
    existingAttendance: {
      id: number
      event_id: number
      student_id: string
      time_in: string | null
      time_out: string | null
      created_at: string
    }
    scanType: string
  } | null>(null)
  const [attendanceRecorded, setAttendanceRecorded] = useState(false)
  const [scannerLoading, setScannerLoading] = useState(false)
  const [scannerError, setScannerError] = useState<string | null>(null)
  const [scannerSuccess, setScannerSuccess] = useState<string | null>(null)
  const [isDetecting, setIsDetecting] = useState(false)
  const [qrDetected, setQrDetected] = useState(false)
  const videoRef = useRef<HTMLVideoElement>(null)
  const streamRef = useRef<MediaStream | null>(null)
  const audioRef = useRef<HTMLAudioElement>(null)

  // Stats states
  const [selectedStatsEvent, setSelectedStatsEvent] = useState<number | null>(null)
  const [statsLoading, setStatsLoading] = useState(false)
  const [statsData, setStatsData] = useState<{
    timeInCount: number
    timeOutCount: number
  } | null>(null)
  const [studentCount, setStudentCount] = useState<number | null>(null)
  const [studentCountLoading, setStudentCountLoading] = useState(false)
  const [courseStats, setCourseStats] = useState<Array<{
    course_name: string
    short: string
    student_count: number
  }> | null>(null)
  const [courseStatsLoading, setCourseStatsLoading] = useState(false)
  
  // Enhanced filtering states
  const [selectedCourseFilter, setSelectedCourseFilter] = useState<string>('all')
  const [selectedYearFilter, setSelectedYearFilter] = useState<string>('all')
  const [courses, setCourses] = useState<Array<{
    id: number
    course_name: string
    short: string
  }>>([])
  const [yearLevels] = useState([
    '1st Year', '2nd Year', '3rd Year', '4th Year', '5th Year', '6th Year'
  ])
  
  // Enhanced statistics states
  const [filteredStats, setFilteredStats] = useState<{
    totalStudents: number
    byCourse: Array<{
      course_name: string
      short: string
      student_count: number
      yearLevels: Array<{
        year_level: string
        count: number
      }>
    }>
    byYearLevel: Array<{
      year_level: string
      count: number
      courses: Array<{
        course_name: string
        short: string
        count: number
      }>
    }>
  } | null>(null)
  const [filteredStatsLoading, setFilteredStatsLoading] = useState(false)

  // Search states
  const [searchQuery, setSearchQuery] = useState('')
  const [searchLoading, setSearchLoading] = useState(false)
  const [searchError, setSearchError] = useState<string | null>(null)
  const [searchedStudent, setSearchedStudent] = useState<{
    id: string
    student_id: string
    first_name: string
    middle_initial?: string
    last_name: string
    year_level: string
    avatar?: string
    course?: {
      course_name: string
      short: string
    }
  } | null>(null)
  const [attendanceStatus, setAttendanceStatus] = useState<Array<{
    event_id: number
    event_name: string
    event_date: string
    time_in: string | null
    time_out: string | null
  }>>([])

  useEffect(() => {
    const checkSession = async () => {
      if (!user) {
        // Try to check and refresh session before redirecting
        const sessionValid = await checkAndRefreshSession()
        if (!sessionValid) {
          // No user and session check failed, redirecting to login
          router.push('/login')
          return
        }
      }

      if (user) {
        fetchUserProfile()
      }
    }

    checkSession()
  }, [user, router, checkAndRefreshSession])

  useEffect(() => {
    if (activeTab === 'event') {
      fetchEvents()
    }
    if (activeTab === 'search') {
      fetchEvents()
      fetchStudentCount()
      fetchCourseStats()
      fetchCourses()
      fetchFilteredStats()
    }
  }, [activeTab])
  
  useEffect(() => {
    if (activeTab === 'search') {
      fetchFilteredStats()
    }
  }, [selectedCourseFilter, selectedYearFilter])

  const fetchUserProfile = async () => {
    try {
      // Fetching scanner profile for user
      const { data, error } = await supabase
        .from('user_profiles')
        .select('*')
        .eq('id', user?.id)
        .maybeSingle()

      if (error) {
        console.error('Error fetching scanner profile:', error)
        router.push('/login')
        return
      }

      if (data) {
        // Check if user has scanner role (role_id = 2)
        if (data.role_id !== 2) {
          // User is not scanner, redirecting to appropriate dashboard
          if (data.role_id === 0) {
            router.push('/admin')
          } else {
            router.push('/dashboard')
          }
          return
        }
        
        setProfile(data)
      } else {
        // No scanner profile found, redirecting to login
        router.push('/login')
      }
    } catch (error) {
      console.error('Error fetching scanner profile:', error)
      router.push('/login')
    } finally {
      setLoading(false)
    }
  }

  const fetchEvents = async () => {
    setEventsLoading(true)
    try {
      const { data, error } = await supabase
        .from('events')
        .select('*')
        .order('start_datetime', { ascending: true })

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

  const fetchStudentCount = async () => {
    setStudentCountLoading(true)
    try {
      const { count, error } = await supabase
        .from('user_profiles')
        .select('*', { count: 'exact', head: true })
        .eq('role_id', 1) // Count users with role_id = 1 (students)

      if (error) {
        console.error('Error fetching student count:', error)
        setStudentCount(null)
      } else {
        setStudentCount(count || 0)
      }
    } catch (error) {
      console.error('Error fetching student count:', error)
      setStudentCount(null)
    } finally {
      setStudentCountLoading(false)
    }
  }

  const fetchCourseStats = async () => {
    setCourseStatsLoading(true)
    try {
      // Fetch all students with role_id = 1 using pagination
      let allData: any[] = []
      let from = 0
      const pageSize = 1000
      
      while (true) {
        const { data, error } = await supabase
          .from('user_profiles')
          .select(`
            course_id,
            courses!inner(
              course_name,
              short
            )
          `)
          .eq('role_id', 1) // Only students
          .range(from, from + pageSize - 1)
        
        if (error) {
          console.error('Error fetching course statistics:', error)
          setCourseStats(null)
          return
        }
        
        if (!data || data.length === 0) {
          break // No more data
        }
        
        allData = allData.concat(data)
        from += pageSize
        
        // If we got less than pageSize, we've reached the end
        if (data.length < pageSize) {
          break
        }
      }

      // Group by course and count students
      const courseCounts = new Map<string, { course_name: string; short: string; student_count: number }>()
      
      allData.forEach((profile: any) => {
        const courseKey = profile.course_id.toString()
        const course = profile.courses as any
        
        if (course && course.course_name && course.short) {
          if (courseCounts.has(courseKey)) {
            courseCounts.get(courseKey)!.student_count++
          } else {
            courseCounts.set(courseKey, {
              course_name: course.course_name,
              short: course.short,
              student_count: 1
            })
          }
        }
      })

      // Convert to array and sort by student count (descending)
      const courseStatsArray = Array.from(courseCounts.values())
        .sort((a, b) => b.student_count - a.student_count)

      setCourseStats(courseStatsArray)
    } catch (error) {
      console.error('Error fetching course statistics:', error)
      setCourseStats(null)
    } finally {
      setCourseStatsLoading(false)
    }
  }

  const fetchCourses = async () => {
    try {
      const { data, error } = await supabase
        .from('courses')
        .select('id, course_name, short')
        .order('course_name')

      if (error) {
        console.error('Error fetching courses:', error)
        setCourses([])
      } else {
        setCourses(data || [])
      }
    } catch (error) {
      console.error('Error fetching courses:', error)
      setCourses([])
    }
  }

  const fetchFilteredStats = async () => {
    setFilteredStatsLoading(true)
    try {
      // Fetch all students with role_id = 1 using pagination
      let allData: any[] = []
      let from = 0
      const pageSize = 1000
      
      while (true) {
        // Build query based on filters
        let query = supabase
          .from('user_profiles')
          .select(`
            id,
            course_id,
            year_level,
            courses!inner(
              course_name,
              short
            )
          `)
          .eq('role_id', 1) // Only students
          .range(from, from + pageSize - 1)

        // Apply course filter
        if (selectedCourseFilter !== 'all') {
          query = query.eq('course_id', selectedCourseFilter)
        }

        // Apply year level filter
        if (selectedYearFilter !== 'all') {
          query = query.eq('year_level', selectedYearFilter)
        }

        const { data, error } = await query

        if (error) {
          console.error('Error fetching filtered statistics:', error)
          setFilteredStats(null)
          return
        }
        
        if (!data || data.length === 0) {
          break // No more data
        }
        
        allData = allData.concat(data)
        from += pageSize
        
        // If we got less than pageSize, we've reached the end
        if (data.length < pageSize) {
          break
        }
      }

      // Process data to create comprehensive statistics
      const totalStudents = allData.length || 0

      // Group by course
      const courseMap = new Map<string, {
        course_name: string
        short: string
        student_count: number
        yearLevels: Map<string, number>
      }>()

      // Group by year level
      const yearMap = new Map<string, {
        year_level: string
        count: number
        courses: Map<string, number>
      }>()

      allData.forEach((profile: any) => {
        const course = profile.courses as any
        const courseKey = profile.course_id.toString()
        const yearKey = profile.year_level

        // Process course grouping
        if (course && course.course_name && course.short) {
          if (!courseMap.has(courseKey)) {
            courseMap.set(courseKey, {
              course_name: course.course_name,
              short: course.short,
              student_count: 0,
              yearLevels: new Map()
            })
          }
          const courseData = courseMap.get(courseKey)!
          courseData.student_count++
          
          // Count by year level within course
          courseData.yearLevels.set(yearKey, (courseData.yearLevels.get(yearKey) || 0) + 1)
        }

        // Process year level grouping
        if (!yearMap.has(yearKey)) {
          yearMap.set(yearKey, {
            year_level: yearKey,
            count: 0,
            courses: new Map()
          })
        }
        const yearData = yearMap.get(yearKey)!
        yearData.count++
        
        // Count by course within year level
        if (course && course.course_name) {
          yearData.courses.set(course.course_name, (yearData.courses.get(course.course_name) || 0) + 1)
        }
      })

      // Convert maps to arrays
      const byCourse = Array.from(courseMap.values()).map(course => ({
        course_name: course.course_name,
        short: course.short,
        student_count: course.student_count,
        yearLevels: Array.from(course.yearLevels.entries()).map(([year_level, count]) => ({
          year_level,
          count
        })).sort((a, b) => a.year_level.localeCompare(b.year_level))
      })).sort((a, b) => b.student_count - a.student_count)

      const byYearLevel = Array.from(yearMap.values()).map(year => ({
        year_level: year.year_level,
        count: year.count,
        courses: Array.from(year.courses.entries()).map(([course_name, count]) => ({
          course_name,
          short: courses.find(c => c.course_name === course_name)?.short || course_name,
          count
        })).sort((a, b) => b.count - a.count)
      })).sort((a, b) => a.year_level.localeCompare(b.year_level))

      setFilteredStats({
        totalStudents,
        byCourse,
        byYearLevel
      })
    } catch (error) {
      console.error('Error fetching filtered statistics:', error)
      setFilteredStats(null)
    } finally {
      setFilteredStatsLoading(false)
    }
  }

  const handleSignOut = async () => {
    try {
      await signOut()
      router.push('/login')
    } catch (error) {
      console.error('Error signing out:', error)
      router.push('/login')
    }
  }

  const handleSearch = async () => {
    if (!searchQuery.trim()) {
      setSearchError('Please enter a student ID')
      return
    }

    setSearchLoading(true)
    setSearchError(null)
    setSearchedStudent(null)
    setAttendanceStatus([])

    try {
      // Search for student by student_id
      const { data: student, error: studentError } = await supabase
        .from('user_profiles')
        .select(`
          id,
          student_id,
          first_name,
          middle_initial,
          last_name,
          year_level,
          avatar,
          course:courses!inner(
            course_name,
            short
          )
        `)
        .eq('student_id', searchQuery.trim())
        .eq('role_id', 1)
        .maybeSingle()

      if (studentError) {
        console.error('Error searching for student:', studentError)
        setSearchError('Error searching for student')
        return
      }

      if (!student) {
        setSearchError('Student not found')
        return
      }

      // Transform the course data from array to single object
      const transformedStudent = {
        ...student,
        course: Array.isArray(student.course) ? student.course[0] : student.course
      }

      setSearchedStudent(transformedStudent)

      // Fetch attendance status for this student
      const { data: attendance, error: attendanceError } = await supabase
        .from('attendance')
        .select(`
          id,
          event_id,
          time_in,
          time_out,
          events!inner(
            id,
            name,
            start_datetime
          )
        `)
        .eq('student_id', student.id)

      if (attendanceError) {
        console.error('Error fetching attendance:', attendanceError)
        // Don't set error here as we still have the student data
      } else {
        const statusData = attendance?.map(record => ({
          event_id: record.event_id,
          event_name: (record.events as any).name,
          event_date: (record.events as any).start_datetime,
          time_in: record.time_in,
          time_out: record.time_out
        })) || []
        setAttendanceStatus(statusData)
      }
    } catch (error) {
      console.error('Error searching for student:', error)
      setSearchError('Error searching for student')
    } finally {
      setSearchLoading(false)
    }
  }

  // QR Scanner functions
  const startScanning = async () => {
    if (!selectedEvent) {
      setScannerError('Please select an event first')
      return
    }

    try {
      setScannerError(null)
      setScannerSuccess(null)
      setQrDetected(false)
      
      // Stop any existing stream first
      if (streamRef.current) {
        streamRef.current.getTracks().forEach(track => track.stop())
        streamRef.current = null
      }
      
      // Try to get camera with optimized constraints for better performance
      const constraints = {
        video: {
          facingMode: 'environment', // Prefer back camera
          width: { ideal: 640, max: 1280 },
          height: { ideal: 480, max: 720 },
          frameRate: { ideal: 15, max: 30 }
        }
      }
      
      let stream
      try {
        stream = await navigator.mediaDevices.getUserMedia(constraints)
      } catch (error) {
        // Fallback to front camera
        stream = await navigator.mediaDevices.getUserMedia({ 
          video: { facingMode: 'user' } 
        })
      }
      
      if (videoRef.current) {
        videoRef.current.srcObject = stream
        streamRef.current = stream
        
        // Set scanning state immediately
        setIsScanning(true)
        setQrDetected(false)
        
        // Wait for video to be ready
        videoRef.current.onloadedmetadata = () => {
          videoRef.current?.play().catch(e => {
            setScannerError('Failed to start video playback')
          })
        }
        
        videoRef.current.onplay = () => {
          // Start QR detection after video is playing
          setTimeout(() => {
            setIsDetecting(true)
            detectQRCode()
          }, 500)
        }
        
        videoRef.current.onerror = (e) => {
          setScannerError('Video playback error')
        }
        
        // Also set the stream on the visible video element when it appears
        setTimeout(() => {
          const visibleVideo = document.querySelector('video:not(.hidden)') as HTMLVideoElement
          if (visibleVideo) {
            visibleVideo.srcObject = stream
          }
        }, 100)
      } else {
        setScannerError('Video element not found')
      }
    } catch (error) {
      if (error instanceof Error) {
        if (error.name === 'NotAllowedError') {
          setScannerError('Camera access denied. Please allow camera permissions and try again.')
        } else if (error.name === 'NotFoundError') {
          setScannerError('No camera found. Please check your device has a camera.')
        } else {
          setScannerError(`Failed to access camera: ${error.message}`)
        }
      } else {
      setScannerError('Failed to access camera. Please check permissions.')
      }
    }
  }

  const stopScanning = () => {
    if (streamRef.current) {
      streamRef.current.getTracks().forEach(track => track.stop())
      streamRef.current = null
    }
    if (videoRef.current) {
      videoRef.current.srcObject = null
    }
    setIsScanning(false)
    setIsDetecting(false)
    setQrDetected(false)
  }

  const detectQRCode = () => {
    if (!videoRef.current) {
      return
    }
    
    // If we have a video reference and it's playing, we can detect
    if (videoRef.current.readyState >= 2) { // HAVE_CURRENT_DATA
      // Video is ready
    } else {
      setTimeout(() => detectQRCode(), 100)
      return
    }

    // Create canvas once and reuse it
    const canvas = document.createElement('canvas')
    const context = canvas.getContext('2d')
    
    if (!context) {
      return
    }

    // Set canvas size once - use smaller size for better performance
    const scale = 0.5 // Reduce resolution by half for better performance
    canvas.width = videoRef.current.videoWidth * scale
    canvas.height = videoRef.current.videoHeight * scale

    let frameCount = 0
    const detect = () => {
        // Check if we should continue scanning
        const shouldContinue = videoRef.current && videoRef.current.videoWidth && videoRef.current.readyState >= 2
        
        if (!shouldContinue) {
          return
        }
        
        // Process every 3rd frame to reduce CPU usage
        frameCount++
        if (frameCount % 3 !== 0) {
          requestAnimationFrame(detect)
          return
        }

        try {
          if (!videoRef.current) {
            return
          }

          // Draw video frame to canvas with scaling
          context.drawImage(videoRef.current, 0, 0, videoRef.current.videoWidth, videoRef.current.videoHeight, 0, 0, canvas.width, canvas.height)

          // Get image data with reduced resolution for better performance
      const imageData = context.getImageData(0, 0, canvas.width, canvas.height)
          
          // Use faster QR detection settings
      const code = jsQR(imageData.data, imageData.width, imageData.height, {
        inversionAttempts: 'dontInvert',
      })

      if (code) {
        try {
          const scannedData = JSON.parse(code.data)
              
              // Check for required fields - support both student_id and id
              const studentId = scannedData.student_id || scannedData.id
              
              if (scannedData && studentId) {
                // Normalize the data structure
                const normalizedData = {
                  id: scannedData.id,
                  student_id: studentId,
                  first_name: scannedData.first_name,
                  middle_initial: scannedData.middle_initial,
                  last_name: scannedData.last_name,
                  email: scannedData.email,
                  year_level: scannedData.year_level,
                  course: scannedData.course,
                  avatar: scannedData.avatar,
                  timestamp: scannedData.timestamp
                }
                
                // Immediately set QR detected state and stop scanning
                setQrDetected(true)
                setIsScanning(false)
                setIsDetecting(false)
                
                // Small delay to show the success animation before showing modal
                setTimeout(() => {
                  handleScannedData(normalizedData)
                }, 500)
                
                return
          } else {
            setScannerError('Invalid QR code format - missing student ID')
            stopScanning()
                return
          }
        } catch (error) {
          setScannerError('Invalid QR code format - not valid JSON')
          stopScanning()
              return
        }
      } else {
        // Continue scanning
          requestAnimationFrame(detect)
        }
        } catch (error) {
          // Continue scanning even if there's an error
          requestAnimationFrame(detect)
      }
    }

    detect()
  }

  const handleScannedData = async (data: {
    id: string
    student_id: string
    first_name: string
    middle_initial?: string
    last_name: string
    email: string
    year_level: string
    course: string
    avatar?: string
    timestamp: string
  }) => {
    // Play notification sound
    if (audioRef.current) {
      try {
        audioRef.current.currentTime = 0
        await audioRef.current.play()
      } catch (error) {
        // Silent error handling
      }
    }
    
    // Show success message
    const successMessage = `QR Code detected! Student: ${data.first_name} ${data.last_name}`
    setScannerSuccess(successMessage)
    
    setScannedData(data)
    stopScanning()
    setShowApprovalModal(true)
  }

  // Function to get current Philippine time in ISO string format
  const getPhilippineTime = (): string => {
    const now = new Date()
    // Get Philippine time by adding 8 hours to UTC (PHT is UTC+8)
    const philippineTime = new Date(now.getTime() + (8 * 60 * 60 * 1000))
    return philippineTime.toISOString()
  }

  const handleApproveAttendance = async () => {
    if (!scannedData || !selectedEvent) return
    
    try {
      setScannerLoading(true)
      
      // Check if attendance already exists
      const { data: existingAttendance, error: checkError } = await supabase
        .from('attendance')
        .select('*')
        .eq('event_id', selectedEvent)
        .eq('student_id', scannedData.student_id)
        .maybeSingle()

      if (checkError) throw checkError

      if (existingAttendance) {
        // Update existing attendance
        const updateData: {
          time_in?: string
          time_out?: string
        } = {}
        
        if (scanType === 'time_in' && !existingAttendance.time_in) {
          updateData.time_in = getPhilippineTime()
        } else if (scanType === 'time_out' && !existingAttendance.time_out) {
          updateData.time_out = getPhilippineTime()
        } else {
          // Student already has this scan type recorded - show duplicate modal
          setDuplicateStudentData({
            ...scannedData,
            existingAttendance,
            scanType
          })
          setShowDuplicateModal(true)
          setScannerLoading(false)
          return
        }

        const { error: updateError } = await supabase
          .from('attendance')
          .update(updateData)
          .eq('id', existingAttendance.id)

        if (updateError) throw updateError
      } else {
        // Create new attendance record
        const { error: insertError } = await supabase
          .from('attendance')
          .insert([{
            event_id: selectedEvent,
            student_id: scannedData.student_id,
            firstname: scannedData.first_name,
            middlename: scannedData.middle_initial,
            lastname: scannedData.last_name,
            course_id: 1, // You might want to get this from the user profile
            avatar: scannedData.avatar,
            time_in: scanType === 'time_in' ? getPhilippineTime() : null,
            time_out: scanType === 'time_out' ? getPhilippineTime() : null,
            year_level: scannedData.year_level
          }])

        if (insertError) throw insertError
      }

      const successMessage = `${scanType.replace('_', ' ')} recorded successfully for ${scannedData.first_name} ${scannedData.last_name}. Scanning will restart in 1 second...`
      setScannerSuccess(successMessage)
      setAttendanceRecorded(true)
      setShowApprovalModal(false)
      
      // Automatically restart scanning after successful approval
      setTimeout(() => {
        restartScanning()
      }, 1000) // 1 second delay to show success message
    } catch (error) {
      console.error('Error recording attendance:', error)
      setScannerError('Failed to record attendance')
    } finally {
      setScannerLoading(false)
    }
  }

  const resetScanner = () => {
    setScannedData(null)
    setAttendanceRecorded(false)
    setScannerError(null)
    setScannerSuccess(null)
    setShowApprovalModal(false)
    setShowDuplicateModal(false)
    setDuplicateStudentData(null)
    setQrDetected(false)
  }

  const handleScanAnother = () => {
    setShowDuplicateModal(false)
    setDuplicateStudentData(null)
    restartScanning()
  }

  const restartScanning = () => {
    resetScanner()
    startScanning()
  }

  const processQRCode = async (qrData: string) => {
    try {
      setScannerLoading(true)
      
      // Parse QR data (assuming it contains student ID)
      const studentId = qrData.trim()
      
      // Find student by student_id
      const { data: student, error: studentError } = await supabase
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
        .eq('student_id', studentId)
        .eq('role_id', 1)
        .maybeSingle()

      if (studentError || !student) {
        setScannerError('Student not found')
        return
      }

      // Check if attendance already exists for this event and student
      const { data: existingAttendance, error: attendanceError } = await supabase
        .from('attendance')
        .select('*')
        .eq('event_id', selectedEvent)
        .eq('student_id', student.id)
        .maybeSingle()

      if (attendanceError) {
        console.error('Error checking existing attendance:', attendanceError)
        setScannerError('Error checking attendance')
        return
      }

      if (existingAttendance) {
        // Update existing attendance
        const updateData: any = {}
        if (scanType === 'time_in' && !existingAttendance.time_in) {
          updateData.time_in = new Date().toISOString()
        } else if (scanType === 'time_out' && !existingAttendance.time_out) {
          updateData.time_out = new Date().toISOString()
        } else {
          setScannerError(`${scanType === 'time_in' ? 'Time in' : 'Time out'} already recorded`)
          return
        }

        const { error: updateError } = await supabase
          .from('attendance')
          .update(updateData)
          .eq('id', existingAttendance.id)

        if (updateError) {
          console.error('Error updating attendance:', updateError)
          setScannerError('Error recording attendance')
          return
        }
      } else {
        // Create new attendance record
        const newAttendance = {
          event_id: selectedEvent,
          student_id: student.id,
          time_in: scanType === 'time_in' ? new Date().toISOString() : null,
          time_out: scanType === 'time_out' ? new Date().toISOString() : null
        }

        const { error: insertError } = await supabase
          .from('attendance')
          .insert([newAttendance])

        if (insertError) {
          console.error('Error creating attendance:', insertError)
          setScannerError('Error recording attendance')
          return
        }
      }

      // Transform the course data from array to single object
      const transformedStudent = {
        ...student,
        course: Array.isArray(student.course) ? student.course[0] : student.course
      }

      setScannedData({
        id: student.id,
        student_id: student.student_id,
        first_name: student.first_name,
        middle_initial: student.middle_initial,
        last_name: student.last_name,
        email: '', // Not needed for scanner
        year_level: student.year_level,
        course: transformedStudent.course?.course_name || 'N/A',
        avatar: undefined, // Avatar not included in the query
        timestamp: new Date().toISOString()
      })

      setScannerSuccess(`${scanType === 'time_in' ? 'Time in' : 'Time out'} recorded successfully for ${student.first_name} ${student.last_name}`)
      
      // Reset QR detection after a delay
      setTimeout(() => {
        setQrDetected(false)
      }, 2000)

    } catch (error) {
      console.error('Error processing QR code:', error)
      setScannerError('Error processing QR code')
    } finally {
      setScannerLoading(false)
    }
  }

  if (loading) {
    return (
      <div className="min-h-screen bg-white flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-gray-400 mx-auto"></div>
          <p className="mt-4 text-gray-600">Loading Scanner Dashboard...</p>
        </div>
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-white">
      {/* Top Bar */}
      <header className="bg-white border-b border-gray-200 px-6 py-4">
        <div className="flex items-center justify-between">
          <div className="flex items-center space-x-3">
            <div className="flex items-center space-x-2">
              <Shield className="w-6 h-6 text-blue-600" />
              <h1 className="text-xl font-semibold text-gray-900">Scanner Dashboard</h1>
            </div>
          </div>

          {/* User Dropdown */}
          <div className="relative user-dropdown">
            <button
              onClick={() => setShowDropdown(!showDropdown)}
              className="flex items-center space-x-2 p-2 rounded-lg hover:bg-gray-100 transition-colors"
            >
              <div className="w-8 h-8 bg-blue-100 rounded-full flex items-center justify-center">
                <User className="w-4 h-4 text-blue-600" />
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
                  Scanner
                </div>

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
      <main className="flex-1 p-6 pb-24">
        <div className="max-w-7xl mx-auto">
          {activeTab === 'event' && (
            <div className="space-y-6">
              {/* Header */}
              <div className="flex items-center justify-between">
                <h2 className="text-2xl font-semibold text-gray-900">Events</h2>
              </div>

              {/* Events Grid */}
              {eventsLoading ? (
                <div className="text-center py-12">
                  <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600 mx-auto"></div>
                  <p className="mt-4 text-gray-600">Loading events...</p>
                </div>
              ) : events.length === 0 ? (
                <div className="text-center py-12">
                  <Calendar className="w-16 h-16 text-gray-300 mx-auto mb-4" />
                  <h3 className="text-lg font-medium text-gray-900 mb-2">No Events Found</h3>
                  <p className="text-gray-600">No events are currently available.</p>
                </div>
              ) : (
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                  {events.map((event) => (
                    <div key={event.id} className="bg-white rounded-lg shadow-md overflow-hidden border border-gray-200 hover:shadow-lg transition-shadow">
                      {/* Event Banner */}
                      <div className="h-48 bg-gray-200 relative">
                        {event.banner ? (
                          <img 
                            src={event.banner} 
                            alt={event.name}
                            className="w-full h-full object-cover"
                          />
                        ) : (
                          <div className="w-full h-full flex items-center justify-center bg-gradient-to-br from-blue-100 to-blue-200">
                            <Calendar className="w-12 h-12 text-blue-600" />
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
                            <div className="flex items-center space-x-1 bg-gray-100 text-gray-800 px-2 py-1 rounded-full text-xs">
                              <XCircle className="w-3 h-3" />
                              <span>Inactive</span>
                            </div>
                          )}
                        </div>
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
                            <MapPin className="w-4 h-4 text-blue-600" />
                            <span className="line-clamp-1">{event.location}</span>
                          </div>

                          {/* Date & Time */}
                          <div className="flex items-center space-x-2 text-sm text-gray-600">
                            <Clock className="w-4 h-4 text-blue-600" />
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
          )}

          {activeTab === 'qr-scanner' && (
            <div className="space-y-6">
              {/* Header */}
              <div className="flex items-center justify-between">
                <h2 className="text-2xl font-semibold text-gray-900">QR Scanner</h2>
              </div>
              
              {/* QR Scanner Component */}
              <div className="bg-white rounded-lg p-6">
                <div className="flex items-center justify-between mb-6">
                  <div>
                    <h3 className="text-xl font-semibold text-gray-900 flex items-center">
                      <QrCode className="w-6 h-6 mr-2 text-orange-600" />
                      QR Code Scanner
                    </h3>
                    <p className="text-gray-600 mt-1">Scan student QR codes to record attendance</p>
                  </div>
                </div>

                {/* Configuration Section */}
                <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-6">
                  {/* Event Selection */}
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">
                      <Calendar className="w-4 h-4 inline mr-1" />
                      Select Event
                    </label>
                    <select
                      value={selectedEvent || ''}
                      onChange={(e) => setSelectedEvent(Number(e.target.value) || null)}
                      className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-orange-500"
                    >
                      <option value="">Choose an event...</option>
                      {events.map((event) => (
                        <option key={event.id} value={event.id}>
                          {event.name} - {new Date(event.start_datetime).toLocaleDateString()}
                        </option>
                      ))}
                    </select>
                  </div>

                  {/* Scan Type Selection */}
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">
                      <Clock className="w-4 h-4 inline mr-1" />
                      Scan Type
                    </label>
                    <div className="flex space-x-2">
                      <button
                        onClick={() => {
                          if (isScanning) {
                            stopScanning()
                          }
                          setScanType('time_in')
                        }}
                        className={`flex-1 px-3 py-2 rounded-md text-sm font-medium transition-colors ${
                          scanType === 'time_in'
                            ? 'bg-orange-600 text-white'
                            : 'bg-gray-200 text-gray-700 hover:bg-gray-300'
                        }`}
                      >
                        Time In
                      </button>
                      <button
                        onClick={() => {
                          if (isScanning) {
                            stopScanning()
                          }
                          setScanType('time_out')
                        }}
                        className={`flex-1 px-3 py-2 rounded-md text-sm font-medium transition-colors ${
                          scanType === 'time_out'
                            ? 'bg-orange-600 text-white'
                            : 'bg-gray-200 text-gray-700 hover:bg-gray-300'
                        }`}
                      >
                        Time Out
                      </button>
                    </div>
                  </div>

                                     {/* Start/Stop Scanning */}
                   <div>
                     <label className="block text-sm font-medium text-gray-700 mb-2">
                       <Play className="w-4 h-4 inline mr-1" />
                       Scanner Control
                     </label>
                     {!isScanning ? (
                       <button
                         onClick={startScanning}
                         disabled={!selectedEvent}
                         className="w-full px-4 py-2 bg-green-600 hover:bg-green-700 disabled:bg-gray-400 text-white rounded-md font-medium transition-colors flex items-center justify-center"
                       >
                         <Play className="w-4 h-4 mr-2" />
                         Start Scanning
                       </button>
                     ) : (
                       <button
                         onClick={stopScanning}
                         className="w-full px-4 py-2 bg-red-600 hover:bg-red-700 text-white rounded-md font-medium transition-colors flex items-center justify-center"
                       >
                         <Square className="w-4 h-4 mr-2" />
                         Stop Scanning
                       </button>
                     )}
                   </div>
                </div>

                {/* Error and Success Messages */}
                {scannerError && (
                  <div className="mb-4 p-4 bg-red-50 border border-red-200 rounded-md">
                    <p className="text-red-700">{scannerError}</p>
                  </div>
                )}

                {scannerSuccess && (
                  <div className="mb-4 p-4 bg-green-50 border border-green-200 rounded-md">
                    <p className="text-green-700">{scannerSuccess}</p>
                  </div>
                )}

                                                                   {/* Hidden Video Element - Always present for ref */}
                                           <video
                        ref={videoRef}
                        autoPlay
                        playsInline
                        muted
                    className="hidden"
                  />

                                   {/* Scanner View - Only show when scanning is active */}
                  {isScanning && (
                    <div className="max-w-2xl mx-auto">
                      {/* Simple Camera Container */}
                      <div className="relative bg-black rounded-xl overflow-hidden">
                        {/* Video Element */}
                        <video
                          autoPlay
                          playsInline
                          muted
                          className="w-full h-96 object-cover"
                        />
                        
                        {/* Simple Scanning Overlay */}
                        <div className="absolute inset-0 flex items-center justify-center">
                          <div className={`w-64 h-64 border-2 rounded-lg transition-all duration-300 ${
                            qrDetected 
                              ? 'border-green-400 bg-green-400/10' 
                              : 'border-white/60'
                          }`}>
                            {/* Simple Corner Indicators */}
                            <div className={`absolute -top-1 -left-1 w-6 h-6 border-l-2 border-t-2 rounded-tl-lg ${
                              qrDetected ? 'border-green-400' : 'border-white'
                            }`}></div>
                            <div className={`absolute -top-1 -right-1 w-6 h-6 border-r-2 border-t-2 rounded-tr-lg ${
                              qrDetected ? 'border-green-400' : 'border-white'
                            }`}></div>
                            <div className={`absolute -bottom-1 -left-1 w-6 h-6 border-l-2 border-b-2 rounded-bl-lg ${
                              qrDetected ? 'border-green-400' : 'border-white'
                            }`}></div>
                            <div className={`absolute -bottom-1 -right-1 w-6 h-6 border-r-2 border-b-2 rounded-br-lg ${
                              qrDetected ? 'border-green-400' : 'border-white'
                            }`}></div>
                            
                            {/* Success Checkmark */}
                            {qrDetected && (
                              <div className="absolute inset-0 flex items-center justify-center">
                                <div className="w-16 h-16 bg-green-500 rounded-full flex items-center justify-center">
                                  <svg className="w-8 h-8 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={3} d="M5 13l4 4L19 7" />
                                  </svg>
                                </div>
                              </div>
                            )}
                          </div>
                         </div>
                         
                        {/* Simple Status Bar */}
                        <div className="absolute top-4 left-4">
                          <div className={`px-3 py-1 rounded-full text-sm font-medium ${
                            qrDetected 
                              ? 'bg-green-500 text-white' 
                              : 'bg-orange-500 text-white'
                          }`}>
                            {qrDetected ? 'QR Detected!' : 'Scanning...'}
                         </div>
                        </div>
                        
                        {/* Simple Instructions */}
                        <div className="absolute bottom-4 left-4 right-4">
                          <div className="bg-black/70 text-white px-3 py-2 rounded-lg text-sm text-center">
                            {qrDetected ? 'QR Code Found!' : 'Point camera at student QR code'}
                       </div>
                     </div>
                   </div>

                      {/* Simple Controls */}
                      <div className="mt-6 flex justify-center">
                        <button
                          onClick={stopScanning}
                          className="px-6 py-3 bg-red-500 hover:bg-red-600 text-white rounded-lg font-medium transition-colors"
                        >
                          Stop Scanning
                        </button>
                      </div>
                      
                      {/* Simple Status Display */}
                      {scannerLoading && (
                        <div className="mt-4 text-center">
                          <div className="animate-spin rounded-full h-6 w-6 border-b-2 border-orange-600 mx-auto"></div>
                          <p className="text-gray-600 mt-2 text-sm">Recording attendance...</p>
                       </div>
                      )}
                      
                      {scannedData && !scannerLoading && (
                        <div className="mt-4 text-center">
                          <div className="bg-green-50 border border-green-200 rounded-lg p-3">
                            <p className="text-green-700 text-sm">
                              ✓ QR Code detected! Check the approval modal.
                           </p>
                         </div>
                        </div>
                      )}
                    </div>
                  )}

                 {/* Scanner Not Active Message */}
                 {!isScanning && (
                   <div className="text-center py-12">
                     <div className="w-24 h-24 bg-gray-100 rounded-full flex items-center justify-center mx-auto mb-4">
                       <QrCode className="w-12 h-12 text-gray-400" />
                     </div>
                     <h3 className="text-lg font-medium text-gray-900 mb-2">QR Scanner Ready</h3>
                     <p className="text-gray-600 mb-6">Select an event and click "Start Scanning" to begin</p>
                     <div className="bg-blue-50 border border-blue-200 rounded-lg p-4 max-w-md mx-auto">
                       <div className="flex items-center space-x-2 text-blue-700">
                         <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                           <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                         </svg>
                         <span className="text-sm font-medium">Scanner is inactive</span>
                       </div>
                       <p className="text-blue-600 text-sm mt-1">The camera will only activate when you start scanning</p>
                     </div>
                   </div>
                 )}
              </div>

              {/* Audio Element for QR Detection Sound */}
              <audio ref={audioRef} src="/audio/qr-detected.mp3" preload="auto" />
            </div>
          )}

          {/* Approval Modal */}
          {showApprovalModal && scannedData && (
            <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
              <div className="bg-white rounded-lg p-6 max-w-md w-full mx-4">
                <div className="text-center">
                  <div className="w-16 h-16 bg-green-100 rounded-full flex items-center justify-center mx-auto mb-4">
                    <CheckCircle className="w-8 h-8 text-green-600" />
                  </div>
                  <h3 className="text-lg font-semibold text-gray-900 mb-2">QR Code Detected!</h3>
                  <p className="text-gray-600 mb-4">
                    Student: <strong>{scannedData.first_name} {scannedData.last_name}</strong>
                  </p>
                  <p className="text-sm text-gray-500 mb-6">
                    Student ID: {scannedData.student_id}
                  </p>
                  
                  <div className="flex space-x-3">
                    <button
                      onClick={handleApproveAttendance}
                      disabled={scannerLoading}
                      className="flex-1 px-4 py-2 bg-green-600 text-white rounded-md hover:bg-green-700 disabled:opacity-50"
                    >
                      {scannerLoading ? 'Recording...' : 'Record Attendance'}
                    </button>
                    <button
                      onClick={() => {
                        setShowApprovalModal(false)
                        setScannedData(null)
                        restartScanning()
                      }}
                      className="flex-1 px-4 py-2 bg-gray-300 text-gray-700 rounded-md hover:bg-gray-400"
                    >
                      Cancel
                    </button>
                  </div>
                </div>
              </div>
            </div>
          )}

          {/* Duplicate Modal */}
          {showDuplicateModal && duplicateStudentData && (
            <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
              <div className="bg-white rounded-lg p-6 max-w-md w-full mx-4">
                <div className="text-center">
                  <div className="w-16 h-16 bg-yellow-100 rounded-full flex items-center justify-center mx-auto mb-4">
                    <svg className="w-8 h-8 text-yellow-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-2.5L13.732 4c-.77-.833-1.964-.833-2.732 0L3.732 16.5c-.77.833.192 2.5 1.732 2.5z" />
                    </svg>
                  </div>
                  <h3 className="text-lg font-semibold text-gray-900 mb-2">Attendance Already Recorded</h3>
                  <p className="text-gray-600 mb-4">
                    {duplicateStudentData.first_name} {duplicateStudentData.last_name} already has a {duplicateStudentData.scanType.replace('_', ' ')} record for this event.
                  </p>
                  
                  <div className="flex space-x-3">
                    <button
                      onClick={handleScanAnother}
                      className="flex-1 px-4 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700"
                    >
                      Scan Another
                    </button>
                    <button
                      onClick={() => {
                        setShowDuplicateModal(false)
                        setDuplicateStudentData(null)
                      }}
                      className="flex-1 px-4 py-2 bg-gray-300 text-gray-700 rounded-md hover:bg-gray-400"
                    >
                      Close
                    </button>
                  </div>
                </div>
              </div>
            </div>
          )}

          {activeTab === 'search' && (
            <div className="space-y-6">
              {/* Header */}
              <div className="flex items-center justify-between">
                <h2 className="text-2xl font-semibold text-gray-900">Search Student</h2>
              </div>

              {/* Search Form */}
              <div className="bg-white rounded-lg shadow-md p-6 border border-gray-200">
                <div className="max-w-md">
                  <label htmlFor="studentId" className="block text-sm font-medium text-gray-700 mb-2">
                    Student ID
                  </label>
                  <div className="flex space-x-2">
                    <input
                      type="text"
                      id="studentId"
                      placeholder="Enter student ID (e.g., 2021-0001)"
                      className="flex-1 px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                      value={searchQuery}
                      onChange={(e) => setSearchQuery(e.target.value)}
                      onKeyPress={(e) => e.key === 'Enter' && handleSearch()}
                    />
                    <button
                      onClick={handleSearch}
                      disabled={searchLoading}
                      className="px-4 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-offset-2 disabled:opacity-50 disabled:cursor-not-allowed"
                    >
                      {searchLoading ? (
                        <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white"></div>
                      ) : (
                        <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
                        </svg>
                      )}
                    </button>
                  </div>
                </div>
              </div>

              {/* Search Results */}
              {searchError && (
                <div className="bg-red-50 border border-red-200 rounded-md p-4">
                  <div className="flex">
                    <XCircle className="w-5 h-5 text-red-400" />
                    <div className="ml-3">
                      <h3 className="text-sm font-medium text-red-800">Error</h3>
                      <p className="text-sm text-red-700 mt-1">{searchError}</p>
                    </div>
                  </div>
                </div>
              )}

              {searchedStudent && (
                <div className="bg-white rounded-lg shadow-md border border-gray-200 overflow-hidden">
                                     {/* Student Header */}
                   <div className="bg-gradient-to-r from-blue-600 to-blue-700 px-6 py-4">
                     <div className="flex items-center justify-between">
                       <div className="flex items-center space-x-4">
                         {searchedStudent.avatar ? (
                           <div className="w-12 h-12 rounded-full overflow-hidden border-2 border-white border-opacity-30">
                             <img 
                               src={searchedStudent.avatar} 
                               alt={`${searchedStudent.first_name} ${searchedStudent.last_name}`}
                               className="w-full h-full object-cover"
                               onError={(e) => {
                                 // Fallback to default avatar if image fails to load
                                 const target = e.target as HTMLImageElement
                                 target.style.display = 'none'
                                 target.parentElement!.innerHTML = '<div class="w-full h-full bg-white bg-opacity-20 rounded-full flex items-center justify-center"><svg class="w-6 h-6 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z"></path></svg></div>'
                               }}
                             />
                           </div>
                         ) : (
                           <div className="w-12 h-12 bg-white bg-opacity-20 rounded-full flex items-center justify-center">
                             <User className="w-6 h-6 text-white" />
                           </div>
                         )}
                         <div>
                           <h3 className="text-lg font-semibold text-white">
                             {searchedStudent.first_name} {searchedStudent.middle_initial} {searchedStudent.last_name}
                           </h3>
                           <p className="text-blue-100 text-sm">Student ID: {searchedStudent.student_id}</p>
                         </div>
                       </div>
                     </div>
                   </div>

                                     {/* Student Details */}
                   <div className="p-6">
                     <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                       <div>
                         <h4 className="text-sm font-medium text-gray-500 uppercase tracking-wide mb-3">Personal Information</h4>
                         
                         {/* Profile Picture */}
                         <div className="mb-4 flex justify-center">
                           {searchedStudent.avatar ? (
                             <div className="w-24 h-24 rounded-full overflow-hidden border-4 border-gray-200 shadow-lg">
                               <img 
                                 src={searchedStudent.avatar} 
                                 alt={`${searchedStudent.first_name} ${searchedStudent.last_name}`}
                                 className="w-full h-full object-cover"
                                 onError={(e) => {
                                   // Fallback to default avatar if image fails to load
                                   const target = e.target as HTMLImageElement
                                   target.style.display = 'none'
                                   target.parentElement!.innerHTML = '<div class="w-full h-full bg-gray-200 rounded-full flex items-center justify-center"><svg class="w-12 h-12 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z"></path></svg></div>'
                                 }}
                               />
                             </div>
                           ) : (
                             <div className="w-24 h-24 bg-gray-200 rounded-full flex items-center justify-center border-4 border-gray-200 shadow-lg">
                               <User className="w-12 h-12 text-gray-400" />
                             </div>
                           )}
                         </div>
                         
                         <div className="space-y-3">
                           <div>
                             <span className="text-sm text-gray-600">Full Name:</span>
                             <p className="text-gray-900 font-medium">
                               {searchedStudent.first_name} {searchedStudent.middle_initial} {searchedStudent.last_name}
                             </p>
                           </div>
                           <div>
                             <span className="text-sm text-gray-600">Student ID:</span>
                             <p className="text-gray-900 font-medium">{searchedStudent.student_id}</p>
                           </div>
                           <div>
                             <span className="text-sm text-gray-600">Year Level:</span>
                             <p className="text-gray-900 font-medium">{searchedStudent.year_level}</p>
                           </div>
                           <div>
                             <span className="text-sm text-gray-600">Course:</span>
                             <p className="text-gray-900 font-medium">{searchedStudent.course?.course_name || 'N/A'}</p>
                           </div>
                         </div>
                       </div>

                      <div>
                        <h4 className="text-sm font-medium text-gray-500 uppercase tracking-wide mb-3">Attendance Status</h4>
                        <div className="space-y-3">
                          {attendanceStatus.length > 0 ? (
                            attendanceStatus.map((status) => (
                              <div key={status.event_id} className="flex items-center justify-between p-3 bg-gray-50 rounded-lg">
                                <div>
                                  <p className="text-sm font-medium text-gray-900">{status.event_name}</p>
                                  <p className="text-xs text-gray-500">
                                    {new Date(status.event_date).toLocaleDateString()}
                                  </p>
                                </div>
                                <div className="flex items-center space-x-2">
                                  {status.time_in ? (
                                    <div className="flex items-center space-x-1 text-green-600">
                                      <CheckCircle className="w-4 h-4" />
                                      <span className="text-xs">Time In</span>
                                    </div>
                                  ) : (
                                    <div className="flex items-center space-x-1 text-gray-400">
                                      <XCircle className="w-4 h-4" />
                                      <span className="text-xs">No Time In</span>
                                    </div>
                                  )}
                                  {status.time_out ? (
                                    <div className="flex items-center space-x-1 text-green-600">
                                      <CheckCircle className="w-4 h-4" />
                                      <span className="text-xs">Time Out</span>
                                    </div>
                                  ) : (
                                    <div className="flex items-center space-x-1 text-gray-400">
                                      <XCircle className="w-4 h-4" />
                                      <span className="text-xs">No Time Out</span>
                                    </div>
                                  )}
                                </div>
                              </div>
                            ))
                          ) : (
                            <p className="text-gray-500 text-sm">No attendance records found.</p>
                          )}
                        </div>
                      </div>
                    </div>
                  </div>
                </div>
              )}
            </div>
          )}
        </div>
      </main>

      {/* Bottom Navigation Bar */}
      <nav className="fixed bottom-0 left-0 right-0 bg-white border-t border-gray-200 px-4 py-2 z-50">
        <div className="flex items-center justify-around max-w-md mx-auto">
          {/* Events */}
          <button
            onClick={() => setActiveTab('event')}
            className={`flex flex-col items-center py-2 px-3 rounded-lg transition-colors ${
              activeTab === 'event' ? 'text-blue-600' : 'text-gray-500'
            }`}
          >
            <Calendar className={`w-6 h-6 ${activeTab === 'event' ? 'text-blue-600' : 'text-gray-400'}`} />
            <span className="text-xs mt-1">Events</span>
          </button>

          {/* QR Scanner - Center Item */}
          <button
            onClick={() => setActiveTab('qr-scanner')}
            className="flex flex-col items-center py-2 px-3 -mt-6"
          >
            <div className="relative">
              <div className="w-14 h-14 bg-blue-600 rounded-full flex items-center justify-center shadow-lg">
                <QrCode className="w-7 h-7 text-white" />
              </div>
              <div className="absolute inset-0 w-14 h-14 bg-blue-600 rounded-full opacity-20 animate-ping"></div>
            </div>
            <span className="text-xs mt-1 text-gray-500">QR Scanner</span>
          </button>

          {/* Search */}
          <button
            onClick={() => setActiveTab('search')}
            className={`flex flex-col items-center py-2 px-3 rounded-lg transition-colors ${
              activeTab === 'search' ? 'text-blue-600' : 'text-gray-500'
            }`}
          >
            <svg className={`w-6 h-6 ${activeTab === 'search' ? 'text-blue-600' : 'text-gray-400'}`} fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
            </svg>
            <span className="text-xs mt-1">Search</span>
          </button>
        </div>
      </nav>
    </div>
  )
}
