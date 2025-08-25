'use client'

import { useState, useEffect, useRef } from 'react'
import { useRouter } from 'next/navigation'
import { useAuth } from '@/contexts/AuthContext'
import { supabase } from '@/lib/supabase'
import { User, LogOut, ChevronDown, Shield, Home, Calendar, QrCode, Users, Settings, Plus, MapPin, Clock, CheckCircle, XCircle, Upload, X, Play, Square } from 'lucide-react'
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

export default function AdminDashboardPage() {
  const { user, signOut, checkAndRefreshSession } = useAuth()
  const router = useRouter()
  const [profile, setProfile] = useState<UserProfile | null>(null)
  const [loading, setLoading] = useState(true)
  const [showDropdown, setShowDropdown] = useState(false)
  const [activeTab, setActiveTab] = useState('event')
  const [events, setEvents] = useState<Event[]>([])
  const [eventsLoading, setEventsLoading] = useState(false)
  const [showAddEventModal, setShowAddEventModal] = useState(false)
  const [showEditEventModal, setShowEditEventModal] = useState(false)
  const [showDeleteModal, setShowDeleteModal] = useState(false)
  const [editingEvent, setEditingEvent] = useState<Event | null>(null)
  const [deletingEvent, setDeletingEvent] = useState<Event | null>(null)
  const [addEventLoading, setAddEventLoading] = useState(false)
  const [deleteEventLoading, setDeleteEventLoading] = useState<number | null>(null)
  const [eventForm, setEventForm] = useState({
    name: '',
    description: '',
    location: '',
    banner: '',
    status: 1,
    start_datetime: '',
    end_datetime: ''
  })
  const [selectedImage, setSelectedImage] = useState<File | null>(null)
  const [imagePreview, setImagePreview] = useState<string | null>(null)
  const [imageUploadLoading, setImageUploadLoading] = useState(false)

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

  useEffect(() => {
    const checkSession = async () => {
      if (!user) {
        // Try to check and refresh session before redirecting
        const sessionValid = await checkAndRefreshSession()
        if (!sessionValid) {
          console.log('No user and session check failed, redirecting to login')
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
    if (activeTab === 'stats') {
      fetchEvents()
    }
  }, [activeTab])



  const fetchUserProfile = async () => {
    try {
      console.log('Fetching admin profile for user ID:', user?.id)
      
      const { data, error } = await supabase
        .from('user_profiles')
        .select('*')
        .eq('id', user?.id)
        .maybeSingle()

      console.log('Admin profile query result:', { data, error })

      if (error) {
        console.error('Error fetching admin profile:', error)
        router.push('/login')
        return
      }

      if (data) {
        console.log('Admin profile found:', data)
        
        // Check if user has admin role (role_id = 0)
        if (data.role_id !== 0) {
          console.log('User is not admin, redirecting to regular dashboard')
          router.push('/dashboard')
          return
        }
        
        setProfile(data)
      } else {
        console.log('No admin profile found, redirecting to login')
        router.push('/login')
      }
    } catch (error) {
      console.error('Error fetching admin profile:', error)
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

  const handleImageUpload = async (file: File): Promise<string> => {
    return new Promise((resolve, reject) => {
      // Debug environment variables
      console.log('Environment variables:', {
        cloudName: process.env.NEXT_PUBLIC_CLOUDINARY_CLOUD_NAME,
        apiKey: process.env.NEXT_PUBLIC_CLOUDINARY_API_KEY,
        uploadPreset: process.env.NEXT_PUBLIC_CLOUDINARY_UPLOAD_PRESET
      })
      
      // Also log all environment variables to see what's available
      console.log('All NEXT_PUBLIC_ environment variables:', Object.keys(process.env).filter(key => key.startsWith('NEXT_PUBLIC_')))

      const cloudName = process.env.NEXT_PUBLIC_CLOUDINARY_CLOUD_NAME
             const uploadPreset = process.env.NEXT_PUBLIC_CLOUDINARY_UPLOAD_PRESET || 'user_profile'

      if (!cloudName) {
        console.error('Cloudinary cloud name is missing. Available env vars:', process.env)
        reject(new Error('Cloudinary cloud name is not configured. Please check your .env.local file.'))
        return
      }

      const formData = new FormData()
      formData.append('file', file)
      formData.append('upload_preset', uploadPreset)
      formData.append('cloud_name', cloudName)

      fetch(`https://api.cloudinary.com/v1_1/${cloudName}/image/upload`, {
        method: 'POST',
        body: formData,
      })
        .then((response) => response.json())
        .then((data) => {
          if (data.secure_url) {
            resolve(data.secure_url)
          } else {
            reject(new Error('Upload failed'))
          }
        })
        .catch((error) => {
          reject(error)
        })
    })
  }

  const handleImageSelect = (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0]
    if (file) {
      // Validate file type
      if (!file.type.startsWith('image/')) {
        alert('Please select an image file')
        return
      }
      
      // Validate file size (5MB limit)
      if (file.size > 5 * 1024 * 1024) {
        alert('Image size should be less than 5MB')
        return
      }

      setSelectedImage(file)
      
      // Create preview
      const reader = new FileReader()
      reader.onload = (e) => {
        setImagePreview(e.target?.result as string)
      }
      reader.readAsDataURL(file)
    }
  }

  const handleRemoveImage = () => {
    setSelectedImage(null)
    setImagePreview(null)
    setEventForm({ ...eventForm, banner: '' })
  }

  const handleAddEvent = async () => {
    setAddEventLoading(true)
    try {
      let bannerUrl = eventForm.banner

      // Upload image if selected
      if (selectedImage) {
        setImageUploadLoading(true)
        try {
          bannerUrl = await handleImageUpload(selectedImage)
          console.log('Image uploaded successfully:', bannerUrl)
        } catch (error) {
          console.error('Error uploading image:', error)
          alert('Failed to upload image. Please try again.')
          setImageUploadLoading(false)
          setAddEventLoading(false)
          return
        } finally {
          setImageUploadLoading(false)
        }
      }

      const eventData = {
        ...eventForm,
        banner: bannerUrl
      }

      const { data, error } = await supabase
        .from('events')
        .insert([eventData])
        .select()

      if (error) {
        console.error('Error adding event:', error)
        alert('Failed to add event. Please try again.')
      } else {
        console.log('Event added successfully:', data)
        setShowAddEventModal(false)
        resetEventForm()
        // Refresh events list
        fetchEvents()
      }
    } catch (error) {
      console.error('Error adding event:', error)
      alert('Failed to add event. Please try again.')
    } finally {
      setAddEventLoading(false)
    }
  }

  const handleEditEvent = async () => {
    if (!editingEvent) return
    
    setAddEventLoading(true)
    try {
      let bannerUrl = eventForm.banner

      // Upload image if selected
      if (selectedImage) {
        setImageUploadLoading(true)
        try {
          bannerUrl = await handleImageUpload(selectedImage)
          console.log('Image uploaded successfully:', bannerUrl)
        } catch (error) {
          console.error('Error uploading image:', error)
          alert('Failed to upload image. Please try again.')
          setImageUploadLoading(false)
          setAddEventLoading(false)
          return
        } finally {
          setImageUploadLoading(false)
        }
      }

      const eventData = {
        ...eventForm,
        banner: bannerUrl
      }

      const { data, error } = await supabase
        .from('events')
        .update(eventData)
        .eq('id', editingEvent.id)
        .select()

      if (error) {
        console.error('Error updating event:', error)
        alert('Failed to update event. Please try again.')
      } else {
        console.log('Event updated successfully:', data)
        setShowEditEventModal(false)
        setEditingEvent(null)
        resetEventForm()
        // Refresh events list
        fetchEvents()
      }
    } catch (error) {
      console.error('Error updating event:', error)
      alert('Failed to update event. Please try again.')
    } finally {
      setAddEventLoading(false)
    }
  }

  const handleDeleteEvent = async (eventId: number) => {
    setDeleteEventLoading(eventId)
    try {
      const { error } = await supabase
        .from('events')
        .delete()
        .eq('id', eventId)

      if (error) {
        console.error('Error deleting event:', error)
        alert('Failed to delete event. Please try again.')
      } else {
        console.log('Event deleted successfully')
        // Refresh events list
        fetchEvents()
      }
    } catch (error) {
      console.error('Error deleting event:', error)
      alert('Failed to delete event. Please try again.')
    } finally {
      setDeleteEventLoading(null)
      setShowDeleteModal(false)
      setDeletingEvent(null)
    }
  }

  const openDeleteModal = (event: Event) => {
    setDeletingEvent(event)
    setShowDeleteModal(true)
  }

  const resetEventForm = () => {
    setEventForm({
      name: '',
      description: '',
      location: '',
      banner: '',
      status: 1,
      start_datetime: '',
      end_datetime: ''
    })
    setSelectedImage(null)
    setImagePreview(null)
  }

  const openEditModal = (event: Event) => {
    setEditingEvent(event)
    setEventForm({
      name: event.name,
      description: event.description || '',
      location: event.location,
      banner: event.banner || '',
      status: event.status,
      start_datetime: event.start_datetime.slice(0, 16), // Format for datetime-local input
      end_datetime: event.end_datetime.slice(0, 16)
    })
    setImagePreview(event.banner)
    setShowEditEventModal(true)
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

  const fetchAttendanceStats = async (eventId: number) => {
    setStatsLoading(true)
    try {
      // Fetch time in count
      const { count: timeInCount, error: timeInError } = await supabase
        .from('attendance')
        .select('*', { count: 'exact', head: true })
        .eq('event_id', eventId)
        .not('time_in', 'is', null)

      if (timeInError) throw timeInError

      // Fetch time out count
      const { count: timeOutCount, error: timeOutError } = await supabase
        .from('attendance')
        .select('*', { count: 'exact', head: true })
        .eq('event_id', eventId)
        .not('time_out', 'is', null)

      if (timeOutError) throw timeOutError

      setStatsData({
        timeInCount: timeInCount || 0,
        timeOutCount: timeOutCount || 0
      })
    } catch (error) {
      console.error('Error fetching attendance stats:', error)
      setStatsData(null)
    } finally {
      setStatsLoading(false)
    }
  }

  // Close dropdown when clicking outside
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      const target = event.target as Element
      if (!target.closest('.user-dropdown')) {
        setShowDropdown(false)
      }
    }

    document.addEventListener('mousedown', handleClickOutside)
    return () => document.removeEventListener('mousedown', handleClickOutside)
  }, [])

  if (loading) {
    return (
      <div className="min-h-screen bg-white flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-gray-400 mx-auto"></div>
          <p className="mt-4 text-gray-600">Loading Admin Dashboard...</p>
        </div>
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-white">
      {/* Audio Element for QR Detection Sound */}
      <audio ref={audioRef} preload="auto">
        <source src="/audio/qr-detected.mp3" type="audio/mpeg" />
        <source src="/audio/qr-detected.wav" type="audio/wav" />
      </audio>
      
      {/* Top Bar */}
      <header className="bg-white border-b border-gray-200 px-6 py-4">
        <div className="flex items-center justify-between">
          <div className="flex items-center space-x-3">
            <div className="flex items-center space-x-2">
              <Shield className="w-6 h-6 text-red-600" />
              <h1 className="text-xl font-semibold text-gray-900">Admin Dashboard</h1>
            </div>
          </div>

          {/* User Dropdown */}
          <div className="relative user-dropdown">
            <button
              onClick={() => setShowDropdown(!showDropdown)}
              className="flex items-center space-x-2 p-2 rounded-lg hover:bg-gray-100 transition-colors"
            >
              <div className="w-8 h-8 bg-red-100 rounded-full flex items-center justify-center">
                <User className="w-4 h-4 text-red-600" />
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
                    // Add admin profile functionality here
                  }}
                  className="w-full text-left px-4 py-2 text-sm text-gray-700 hover:bg-gray-100 transition-colors"
                >
                  Profile
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
      <main className="flex-1 p-6 pb-24">
        <div className="max-w-7xl mx-auto">
          {activeTab === 'dashboard' && (
            <div className="text-center py-12">
              <Home className="w-16 h-16 text-gray-300 mx-auto mb-4" />
              <h2 className="text-2xl font-semibold text-gray-900 mb-2">Dashboard</h2>
              <p className="text-gray-600">Admin dashboard content will be added here.</p>
            </div>
          )}

          {activeTab === 'event' && (
            <div className="space-y-6">
              {/* Header */}
              <div className="flex items-center justify-between">
                <h2 className="text-2xl font-semibold text-gray-900">Events</h2>
                                 <button 
                   onClick={() => setShowAddEventModal(true)}
                   className="flex items-center space-x-2 bg-orange-600 text-white px-4 py-2 rounded-lg hover:bg-orange-700 transition-colors"
                 >
                   <Plus className="w-4 h-4" />
                   <span>Add Event</span>
                 </button>
              </div>

              {/* Events Grid */}
              {eventsLoading ? (
                <div className="text-center py-12">
                  <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-orange-600 mx-auto"></div>
                  <p className="mt-4 text-gray-600">Loading events...</p>
                </div>
              ) : events.length === 0 ? (
                <div className="text-center py-12">
                  <Calendar className="w-16 h-16 text-gray-300 mx-auto mb-4" />
                  <h3 className="text-lg font-medium text-gray-900 mb-2">No Events Found</h3>
                  <p className="text-gray-600">Create your first event to get started.</p>
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
                          <div className="w-full h-full flex items-center justify-center bg-gradient-to-br from-orange-100 to-orange-200">
                            <Calendar className="w-12 h-12 text-orange-600" />
                          </div>
                        )}
                        {/* Status Badge */}
                        <div className="absolute top-3 right-3">
                          {event.status === 1 ? (
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

                                                 {/* Action Buttons */}
                         <div className="flex space-x-2 mt-4">
                           <button 
                             onClick={() => openEditModal(event)}
                             className="flex-1 bg-orange-600 text-white py-2 px-3 rounded-lg text-sm hover:bg-orange-700 transition-colors"
                           >
                             Edit
                           </button>
                                                       <button 
                              onClick={() => openDeleteModal(event)}
                              className="flex-1 bg-red-600 text-white py-2 px-3 rounded-lg text-sm hover:bg-red-700 transition-colors"
                            >
                              Delete
                            </button>
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
                           </div>
                         )}

                     {activeTab === 'stats' && (
             <div className="space-y-6">
               {/* Header */}
               <div className="flex items-center justify-between">
                 <h2 className="text-2xl font-semibold text-gray-900">Event Statistics</h2>
               </div>
               
               {/* Event Selection */}
               <div className="bg-white rounded-lg shadow-lg p-6">
                 <div className="mb-6">
                   <label className="block text-sm font-medium text-gray-700 mb-2">
                     <Calendar className="w-4 h-4 inline mr-1" />
                     Select Event
                   </label>
                   <select
                     value={selectedStatsEvent || ''}
                     onChange={(e) => {
                       const eventId = Number(e.target.value) || null
                       setSelectedStatsEvent(eventId)
                       if (eventId) {
                         fetchAttendanceStats(eventId)
                       } else {
                         setStatsData(null)
                       }
                     }}
                     className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-orange-500"
                   >
                     <option value="">Choose an event to view statistics...</option>
                     {events.map((event) => (
                       <option key={event.id} value={event.id}>
                         {event.name} - {new Date(event.start_datetime).toLocaleDateString()}
                       </option>
                     ))}
                   </select>
                       </div>

                 {/* Statistics Display */}
                 {selectedStatsEvent && (
                   <div className="space-y-4">
                     {statsLoading ? (
                       <div className="text-center py-8">
                         <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-orange-600 mx-auto"></div>
                         <p className="text-gray-600 mt-2 text-sm">Loading statistics...</p>
                       </div>
                     ) : statsData ? (
                       <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                         {/* Time In Count */}
                         <div className="bg-green-50 border border-green-200 rounded-lg p-6 text-center">
                           <div className="w-16 h-16 bg-green-100 rounded-full flex items-center justify-center mx-auto mb-4">
                             <svg className="w-8 h-8 text-green-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                               <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" />
                             </svg>
                   </div>
                           <h3 className="text-lg font-semibold text-green-900 mb-2">Time In</h3>
                           <p className="text-3xl font-bold text-green-600">{statsData.timeInCount}</p>
                           <p className="text-sm text-green-700 mt-1">students</p>
                </div>

                         {/* Time Out Count */}
                         <div className="bg-blue-50 border border-blue-200 rounded-lg p-6 text-center">
                           <div className="w-16 h-16 bg-blue-100 rounded-full flex items-center justify-center mx-auto mb-4">
                             <svg className="w-8 h-8 text-blue-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                               <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" />
                             </svg>
              </div>
                           <h3 className="text-lg font-semibold text-blue-900 mb-2">Time Out</h3>
                           <p className="text-3xl font-bold text-blue-600">{statsData.timeOutCount}</p>
                           <p className="text-sm text-blue-700 mt-1">students</p>
                         </div>
                       </div>
                     ) : (
                       <div className="text-center py-8">
                         <div className="w-16 h-16 bg-gray-100 rounded-full flex items-center justify-center mx-auto mb-4">
                           <svg className="w-8 h-8 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                             <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 19v-6a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2a2 2 0 002-2zm0 0V9a2 2 0 012-2h2a2 2 0 012 2v10m-6 0a2 2 0 002 2h2a2 2 0 002-2m0 0V5a2 2 0 012-2h2a2 2 0 012 2v14a2 2 0 01-2 2h-2a2 2 0 01-2-2z" />
                           </svg>
                         </div>
                         <h3 className="text-lg font-medium text-gray-900 mb-2">No Data Available</h3>
                         <p className="text-gray-600 text-sm">Select an event to view attendance statistics</p>
                       </div>
                     )}
            </div>
          )}

                 {/* Instructions */}
                 {!selectedStatsEvent && (
                   <div className="text-center py-8">
                     <div className="w-16 h-16 bg-gray-100 rounded-full flex items-center justify-center mx-auto mb-4">
                       <Users className="w-8 h-8 text-gray-400" />
                     </div>
                     <h3 className="text-lg font-medium text-gray-900 mb-2">Select an Event</h3>
                     <p className="text-gray-600 text-sm">Choose an event from the dropdown above to view attendance statistics</p>
                   </div>
                 )}
               </div>
            </div>
          )}

          {activeTab === 'profile' && (
            <div className="text-center py-12">
              <Settings className="w-16 h-16 text-gray-300 mx-auto mb-4" />
              <h2 className="text-2xl font-semibold text-gray-900 mb-2">Profile</h2>
              <p className="text-gray-600">Admin profile settings will be added here.</p>
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
               activeTab === 'event' ? 'text-orange-600' : 'text-gray-500'
             }`}
           >
             <Calendar className={`w-6 h-6 ${activeTab === 'event' ? 'text-orange-600' : 'text-gray-400'}`} />
             <span className="text-xs mt-1">Events</span>
           </button>

           {/* QR Scanner - Center Item */}
           <button
             onClick={() => setActiveTab('qr-scanner')}
             className="flex flex-col items-center py-2 px-3 -mt-6"
           >
             <div className="relative">
               <div className="w-14 h-14 bg-orange-600 rounded-full flex items-center justify-center shadow-lg">
                 <QrCode className="w-7 h-7 text-white" />
               </div>
               <div className="absolute inset-0 w-14 h-14 bg-orange-600 rounded-full opacity-20 animate-ping"></div>
             </div>
             <span className="text-xs mt-1 text-gray-500">QR Scanner</span>
           </button>

           {/* Statistics */}
           <button
             onClick={() => setActiveTab('stats')}
             className={`flex flex-col items-center py-2 px-3 rounded-lg transition-colors ${
               activeTab === 'stats' ? 'text-orange-600' : 'text-gray-500'
             }`}
           >
             <Users className={`w-6 h-6 ${activeTab === 'stats' ? 'text-orange-600' : 'text-gray-400'}`} />
             <span className="text-xs mt-1">Stats</span>
           </button>
                 </div>
       </nav>

       {/* Add Event Modal */}
       {showAddEventModal && (
         <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
           <div className="bg-white rounded-lg shadow-xl max-w-2xl w-full max-h-[90vh] overflow-y-auto">
             {/* Modal Header */}
             <div className="flex items-center justify-between p-6 border-b border-gray-200">
               <h3 className="text-lg font-semibold text-gray-900">Add New Event</h3>
               <button
                 onClick={() => setShowAddEventModal(false)}
                 className="text-gray-400 hover:text-gray-600 transition-colors"
               >
                 <XCircle className="w-6 h-6" />
               </button>
             </div>

             {/* Modal Body */}
             <div className="p-6 space-y-6">
               {/* Event Name */}
               <div>
                 <label className="block text-sm font-medium text-gray-700 mb-2">
                   Event Name *
                 </label>
                 <input
                   type="text"
                   value={eventForm.name}
                   onChange={(e) => setEventForm({ ...eventForm, name: e.target.value })}
                   className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-orange-500 focus:border-transparent"
                   placeholder="Enter event name"
                   required
                 />
               </div>

               {/* Description */}
               <div>
                 <label className="block text-sm font-medium text-gray-700 mb-2">
                   Description
                 </label>
                 <textarea
                   value={eventForm.description}
                   onChange={(e) => setEventForm({ ...eventForm, description: e.target.value })}
                   rows={3}
                   className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-orange-500 focus:border-transparent"
                   placeholder="Enter event description"
                 />
               </div>

               {/* Location */}
               <div>
                 <label className="block text-sm font-medium text-gray-700 mb-2">
                   Location *
                 </label>
                 <input
                   type="text"
                   value={eventForm.location}
                   onChange={(e) => setEventForm({ ...eventForm, location: e.target.value })}
                   className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-orange-500 focus:border-transparent"
                   placeholder="Enter event location"
                   required
                 />
               </div>

                               {/* Banner Image Upload */}
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Banner Image
                  </label>
                  
                  {/* Image Preview */}
                  {imagePreview && (
                    <div className="mb-4 relative">
                      <img
                        src={imagePreview}
                        alt="Preview"
                        className="w-full h-48 object-cover rounded-lg border border-gray-300"
                      />
                      <button
                        type="button"
                        onClick={handleRemoveImage}
                        className="absolute top-2 right-2 bg-red-500 text-white rounded-full p-1 hover:bg-red-600 transition-colors"
                      >
                        <X className="w-4 h-4" />
                      </button>
                    </div>
                  )}

                  {/* Upload Area */}
                  {!imagePreview && (
                    <div className="border-2 border-dashed border-gray-300 rounded-lg p-6 text-center hover:border-orange-400 transition-colors">
                      <input
                        type="file"
                        accept="image/*"
                        onChange={handleImageSelect}
                        className="hidden"
                        id="image-upload"
                      />
                      <label
                        htmlFor="image-upload"
                        className="cursor-pointer flex flex-col items-center space-y-2"
                      >
                        <Upload className="w-8 h-8 text-gray-400" />
                        <div>
                          <p className="text-sm text-gray-600">
                            Click to upload
                          </p>
                          <p className="text-xs text-gray-500">
                            PNG, JPG, GIF up to 5MB
                          </p>
                        </div>
                      </label>
                    </div>
                  )}

                  {/* Manual URL Input (fallback) */}
                  <div className="mt-4">
                    <label className="block text-sm font-medium text-gray-700 mb-2">
                      Or enter image URL manually
                    </label>
                    <input
                      type="url"
                      value={eventForm.banner}
                      onChange={(e) => setEventForm({ ...eventForm, banner: e.target.value })}
                      className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-orange-500 focus:border-transparent"
                      placeholder="https://example.com/image.jpg"
                    />
                  </div>
                </div>

               {/* Status */}
               <div>
                 <label className="block text-sm font-medium text-gray-700 mb-2">
                   Status *
                 </label>
                 <select
                   value={eventForm.status}
                   onChange={(e) => setEventForm({ ...eventForm, status: parseInt(e.target.value) })}
                   className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-orange-500 focus:border-transparent"
                 >
                   <option value={1}>Active</option>
                   <option value={0}>Inactive</option>
                 </select>
               </div>

               {/* Date and Time */}
               <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                 <div>
                   <label className="block text-sm font-medium text-gray-700 mb-2">
                     Start Date & Time *
                   </label>
                   <input
                     type="datetime-local"
                     value={eventForm.start_datetime}
                     onChange={(e) => setEventForm({ ...eventForm, start_datetime: e.target.value })}
                     className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-orange-500 focus:border-transparent"
                     required
                   />
                 </div>
                 <div>
                   <label className="block text-sm font-medium text-gray-700 mb-2">
                     End Date & Time *
                   </label>
                   <input
                     type="datetime-local"
                     value={eventForm.end_datetime}
                     onChange={(e) => setEventForm({ ...eventForm, end_datetime: e.target.value })}
                     className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-orange-500 focus:border-transparent"
                     required
                   />
                 </div>
               </div>
             </div>

             {/* Modal Footer */}
             <div className="flex items-center justify-end space-x-3 p-6 border-t border-gray-200">
               <button
                 onClick={() => setShowAddEventModal(false)}
                 className="px-4 py-2 text-gray-700 bg-gray-100 rounded-lg hover:bg-gray-200 transition-colors"
                 disabled={addEventLoading}
               >
                 Cancel
               </button>
                               <button
                  onClick={handleAddEvent}
                  disabled={addEventLoading || imageUploadLoading || !eventForm.name || !eventForm.location || !eventForm.start_datetime || !eventForm.end_datetime}
                  className="px-4 py-2 bg-orange-600 text-white rounded-lg hover:bg-orange-700 transition-colors disabled:opacity-50 disabled:cursor-not-allowed flex items-center space-x-2"
                >
                  {addEventLoading || imageUploadLoading ? (
                    <>
                      <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white"></div>
                      <span>{imageUploadLoading ? 'Uploading...' : 'Adding...'}</span>
                    </>
                  ) : (
                    <span>Add Event</span>
                  )}
                </button>
             </div>
           </div>
         </div>
                )}

         {/* Delete Confirmation Modal */}
         {showDeleteModal && deletingEvent && (
           <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
             <div className="bg-white rounded-lg shadow-xl max-w-md w-full">
               {/* Modal Header */}
               <div className="flex items-center justify-between p-6 border-b border-gray-200">
                 <h3 className="text-lg font-semibold text-gray-900">Delete Event</h3>
                 <button
                   onClick={() => {
                     setShowDeleteModal(false)
                     setDeletingEvent(null)
                   }}
                   className="text-gray-400 hover:text-gray-600 transition-colors"
                 >
                   <XCircle className="w-6 h-6" />
                 </button>
               </div>

               {/* Modal Body */}
               <div className="p-6">
                 <div className="flex items-center space-x-3 mb-4">
                   <div className="w-12 h-12 bg-red-100 rounded-full flex items-center justify-center">
                     <XCircle className="w-6 h-6 text-red-600" />
                   </div>
                   <div>
                     <h4 className="text-lg font-medium text-gray-900">Are you sure?</h4>
                     <p className="text-sm text-gray-600">This action cannot be undone.</p>
                   </div>
                 </div>
                 
                 <div className="bg-gray-50 rounded-lg p-4 mb-6">
                   <h5 className="font-medium text-gray-900 mb-2">{deletingEvent.name}</h5>
                   <div className="text-sm text-gray-600 space-y-1">
                     <p><span className="font-medium">Location:</span> {deletingEvent.location}</p>
                     <p><span className="font-medium">Date:</span> {new Date(deletingEvent.start_datetime).toLocaleDateString()}</p>
                     {deletingEvent.description && (
                       <p><span className="font-medium">Description:</span> {deletingEvent.description.substring(0, 100)}{deletingEvent.description.length > 100 ? '...' : ''}</p>
                     )}
                   </div>
                 </div>

                 <p className="text-sm text-gray-600 mb-6">
                   This will permanently delete the event and all associated data. This action cannot be undone.
                 </p>
               </div>

               {/* Modal Footer */}
               <div className="flex items-center justify-end space-x-3 p-6 border-t border-gray-200">
                 <button
                   onClick={() => {
                     setShowDeleteModal(false)
                     setDeletingEvent(null)
                   }}
                   className="px-4 py-2 text-gray-700 bg-gray-100 rounded-lg hover:bg-gray-200 transition-colors"
                   disabled={deleteEventLoading === deletingEvent.id}
                 >
                   Cancel
                 </button>
                 <button
                   onClick={() => handleDeleteEvent(deletingEvent.id)}
                   disabled={deleteEventLoading === deletingEvent.id}
                   className="px-4 py-2 bg-red-600 text-white rounded-lg hover:bg-red-700 transition-colors disabled:opacity-50 disabled:cursor-not-allowed flex items-center space-x-2"
                 >
                   {deleteEventLoading === deletingEvent.id ? (
                     <>
                       <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white"></div>
                       <span>Deleting...</span>
                     </>
                   ) : (
                     <>
                       <XCircle className="w-4 h-4" />
                       <span>Delete Event</span>
                     </>
                   )}
                 </button>
               </div>
             </div>
           </div>
         )}

         {/* Edit Event Modal */}
         {showEditEventModal && editingEvent && (
           <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
             <div className="bg-white rounded-lg shadow-xl max-w-2xl w-full max-h-[90vh] overflow-y-auto">
               {/* Modal Header */}
               <div className="flex items-center justify-between p-6 border-b border-gray-200">
                 <h3 className="text-lg font-semibold text-gray-900">Edit Event</h3>
                 <button
                   onClick={() => {
                     setShowEditEventModal(false)
                     setEditingEvent(null)
                     resetEventForm()
                   }}
                   className="text-gray-400 hover:text-gray-600 transition-colors"
                 >
                   <XCircle className="w-6 h-6" />
                 </button>
               </div>

               {/* Modal Body */}
               <div className="p-6 space-y-6">
                 {/* Event Name */}
                 <div>
                   <label className="block text-sm font-medium text-gray-700 mb-2">
                     Event Name *
                   </label>
                   <input
                     type="text"
                     value={eventForm.name}
                     onChange={(e) => setEventForm({ ...eventForm, name: e.target.value })}
                     className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-orange-500 focus:border-transparent"
                     placeholder="Enter event name"
                     required
                   />
                 </div>

                 {/* Description */}
                 <div>
                   <label className="block text-sm font-medium text-gray-700 mb-2">
                     Description
                   </label>
                   <textarea
                     value={eventForm.description}
                     onChange={(e) => setEventForm({ ...eventForm, description: e.target.value })}
                     rows={3}
                     className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-orange-500 focus:border-transparent"
                     placeholder="Enter event description"
                   />
                 </div>

                 {/* Location */}
                 <div>
                   <label className="block text-sm font-medium text-gray-700 mb-2">
                     Location *
                   </label>
                   <input
                     type="text"
                     value={eventForm.location}
                     onChange={(e) => setEventForm({ ...eventForm, location: e.target.value })}
                     className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-orange-500 focus:border-transparent"
                     placeholder="Enter event location"
                     required
                   />
                 </div>

                 {/* Banner Image Upload */}
                 <div>
                   <label className="block text-sm font-medium text-gray-700 mb-2">
                     Banner Image
                   </label>
                   
                   {/* Image Preview */}
                   {imagePreview && (
                     <div className="mb-4 relative">
                       <img
                         src={imagePreview}
                         alt="Preview"
                         className="w-full h-48 object-cover rounded-lg border border-gray-300"
                       />
                       <button
                         type="button"
                         onClick={handleRemoveImage}
                         className="absolute top-2 right-2 bg-red-500 text-white rounded-full p-1 hover:bg-red-600 transition-colors"
                       >
                         <X className="w-4 h-4" />
                       </button>
                     </div>
                   )}

                   {/* Upload Area */}
                   {!imagePreview && (
                     <div className="border-2 border-dashed border-gray-300 rounded-lg p-6 text-center hover:border-orange-400 transition-colors">
                       <input
                         type="file"
                         accept="image/*"
                         onChange={handleImageSelect}
                         className="hidden"
                         id="edit-image-upload"
                       />
                       <label
                         htmlFor="edit-image-upload"
                         className="cursor-pointer flex flex-col items-center space-y-2"
                       >
                         <Upload className="w-8 h-8 text-gray-400" />
                         <div>
                           <p className="text-sm text-gray-600">
                             Click to upload or drag and drop
                           </p>
                           <p className="text-xs text-gray-500">
                             PNG, JPG, GIF up to 5MB
                           </p>
                         </div>
                       </label>
                     </div>
                   )}

                   {/* Manual URL Input (fallback) */}
                   <div className="mt-4">
                     <label className="block text-sm font-medium text-gray-700 mb-2">
                       Or enter image URL manually
                     </label>
                     <input
                       type="url"
                       value={eventForm.banner}
                       onChange={(e) => setEventForm({ ...eventForm, banner: e.target.value })}
                       className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-orange-500 focus:border-transparent"
                       placeholder="https://example.com/image.jpg"
                     />
                   </div>
                 </div>

                 {/* Status */}
                 <div>
                   <label className="block text-sm font-medium text-gray-700 mb-2">
                     Status *
                   </label>
                   <select
                     value={eventForm.status}
                     onChange={(e) => setEventForm({ ...eventForm, status: parseInt(e.target.value) })}
                     className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-orange-500 focus:border-transparent"
                   >
                     <option value={1}>Active</option>
                     <option value={0}>Inactive</option>
                   </select>
                 </div>

                 {/* Date and Time */}
                 <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                   <div>
                     <label className="block text-sm font-medium text-gray-700 mb-2">
                       Start Date & Time *
                     </label>
                     <input
                       type="datetime-local"
                       value={eventForm.start_datetime}
                       onChange={(e) => setEventForm({ ...eventForm, start_datetime: e.target.value })}
                       className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-orange-500 focus:border-transparent"
                       required
                     />
                   </div>
                   <div>
                     <label className="block text-sm font-medium text-gray-700 mb-2">
                       End Date & Time *
                     </label>
                     <input
                       type="datetime-local"
                       value={eventForm.end_datetime}
                       onChange={(e) => setEventForm({ ...eventForm, end_datetime: e.target.value })}
                       className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-orange-500 focus:border-transparent"
                       required
                     />
                   </div>
                 </div>
               </div>

               {/* Modal Footer */}
               <div className="flex items-center justify-end space-x-3 p-6 border-t border-gray-200">
                 <button
                   onClick={() => {
                     setShowEditEventModal(false)
                     setEditingEvent(null)
                     resetEventForm()
                   }}
                   className="px-4 py-2 text-gray-700 bg-gray-100 rounded-lg hover:bg-gray-200 transition-colors"
                   disabled={addEventLoading}
                 >
                   Cancel
                 </button>
                 <button
                   onClick={handleEditEvent}
                   disabled={addEventLoading || imageUploadLoading || !eventForm.name || !eventForm.location || !eventForm.start_datetime || !eventForm.end_datetime}
                   className="px-4 py-2 bg-orange-600 text-white rounded-lg hover:bg-orange-700 transition-colors disabled:opacity-50 disabled:cursor-not-allowed flex items-center space-x-2"
                 >
                   {addEventLoading || imageUploadLoading ? (
                     <>
                       <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white"></div>
                       <span>{imageUploadLoading ? 'Uploading...' : 'Updating...'}</span>
                     </>
                   ) : (
                     <span>Update Event</span>
                   )}
                 </button>
               </div>
             </div>
           </div>
                   )}

          {/* QR Code Approval Modal */}
          {showApprovalModal && scannedData && (
            <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-2 sm:p-4">
              <div className="bg-white rounded-lg shadow-xl w-full max-w-sm sm:max-w-md mx-4 max-h-[90vh] overflow-y-auto">
                {/* Modal Header */}
                <div className="flex items-center justify-between p-4 sm:p-6 border-b border-gray-200">
                  <h3 className="text-lg font-semibold text-gray-900">Confirm Attendance</h3>
                  <button
                    onClick={() => setShowApprovalModal(false)}
                    className="text-gray-400 hover:text-gray-600 transition-colors p-1"
                  >
                    <XCircle className="w-5 h-5 sm:w-6 sm:h-6" />
                  </button>
                </div>

                {/* Modal Body */}
                <div className="p-4 sm:p-6">
                  <div className="text-center mb-4 sm:mb-6">
                    {/* Profile Picture */}
                    <div className="w-20 h-20 sm:w-24 sm:h-24 mx-auto mb-3 sm:mb-4 rounded-full overflow-hidden bg-gray-200 flex items-center justify-center">
                      {scannedData.avatar ? (
                        <img
                          src={scannedData.avatar}
                          alt="Profile"
                          className="w-full h-full object-cover"
                        />
                      ) : (
                        <User className="w-10 h-10 sm:w-12 sm:h-12 text-gray-400" />
                      )}
                    </div>
                    
                    {/* Student Name */}
                    <h4 className="text-lg sm:text-xl font-semibold text-gray-900 mb-2">
                      {scannedData.first_name} {scannedData.middle_initial} {scannedData.last_name}
                    </h4>
                    
                    {/* Student ID */}
                    <p className="text-sm text-gray-600 mb-3 sm:mb-4">
                      Student ID: {scannedData.student_id}
                    </p>

                    {/* Scan Type */}
                    <div className="bg-orange-50 border border-orange-200 rounded-lg p-3 mb-4">
                      <p className="text-orange-700 text-sm font-medium">
                        Recording: <span className="capitalize">{scanType.replace('_', ' ')}</span>
                      </p>
                    </div>
                  </div>
                </div>

                {/* Modal Footer */}
                <div className="flex flex-col sm:flex-row items-stretch sm:items-center justify-between p-4 sm:p-6 border-t border-gray-200 space-y-3 sm:space-y-0">
                  <button
                    onClick={restartScanning}
                    className="w-full sm:w-auto px-4 py-3 sm:py-2 text-blue-700 bg-blue-100 rounded-lg hover:bg-blue-200 transition-colors flex items-center justify-center space-x-2"
                    disabled={scannerLoading}
                  >
                    <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15" />
                    </svg>
                    <span>Scan Another</span>
                  </button>
                  
                  <div className="flex flex-col sm:flex-row space-y-2 sm:space-y-0 sm:space-x-3">
                  <button
                    onClick={() => setShowApprovalModal(false)}
                      className="w-full sm:w-auto px-4 py-3 sm:py-2 text-gray-700 bg-gray-100 rounded-lg hover:bg-gray-200 transition-colors"
                    disabled={scannerLoading}
                  >
                    Cancel
                  </button>
                  <button
                    onClick={handleApproveAttendance}
                    disabled={scannerLoading}
                      className="w-full sm:w-auto px-4 py-3 sm:py-2 bg-orange-600 text-white rounded-lg hover:bg-orange-700 transition-colors disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center space-x-2"
                  >
                    {scannerLoading ? (
                      <>
                        <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white"></div>
                        <span>Recording...</span>
                      </>
                    ) : (
                      <>
                        <CheckCircle className="w-4 h-4" />
                        <span>Approve</span>
                      </>
                    )}
                  </button>
                  </div>
                </div>
              </div>
            </div>
          )}

          {/* Duplicate Student Modal */}
          {showDuplicateModal && duplicateStudentData && (
            <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-2 sm:p-4">
              <div className="bg-white rounded-lg shadow-xl w-full max-w-sm sm:max-w-md mx-4 max-h-[90vh] overflow-y-auto">
                {/* Modal Header */}
                <div className="flex items-center justify-between p-4 sm:p-6 border-b border-gray-200">
                  <h3 className="text-lg font-semibold text-gray-900">Student Already Scanned</h3>
                  <button
                    onClick={() => setShowDuplicateModal(false)}
                    className="text-gray-400 hover:text-gray-600 transition-colors p-1"
                  >
                    <XCircle className="w-5 h-5 sm:w-6 sm:h-6" />
                  </button>
                </div>

                {/* Modal Body */}
                <div className="p-4 sm:p-6">
                  <div className="text-center mb-4 sm:mb-6">
                    {/* Warning Icon */}
                    <div className="w-14 h-14 sm:w-16 sm:h-16 mx-auto mb-3 sm:mb-4 bg-yellow-100 rounded-full flex items-center justify-center">
                      <svg className="w-7 h-7 sm:w-8 sm:h-8 text-yellow-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-2.5L13.732 4c-.77-.833-1.964-.833-2.732 0L3.732 16.5c-.77.833.192 2.5 1.732 2.5z" />
                      </svg>
                    </div>
                    
                    {/* Student Name */}
                    <h4 className="text-lg sm:text-xl font-semibold text-gray-900 mb-2">
                      {duplicateStudentData.first_name} {duplicateStudentData.middle_initial} {duplicateStudentData.last_name}
                    </h4>
                    
                    {/* Student ID */}
                    <p className="text-sm text-gray-600 mb-3 sm:mb-4">
                      Student ID: {duplicateStudentData.student_id}
                    </p>

                    {/* Warning Message */}
                    <div className="bg-yellow-50 border border-yellow-200 rounded-lg p-3 sm:p-4 mb-3 sm:mb-4">
                      <div className="flex items-center space-x-2 mb-2">
                        <svg className="w-4 h-4 sm:w-5 sm:h-5 text-yellow-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-2.5L13.732 4c-.77-.833-1.964-.833-2.732 0L3.732 16.5c-.77.833.192 2.5 1.732 2.5z" />
                        </svg>
                        <span className="text-yellow-700 font-medium text-sm sm:text-base">Already Recorded</span>
                      </div>
                      <p className="text-yellow-600 text-xs sm:text-sm">
                        This student already has <span className="font-medium">{duplicateStudentData.scanType.replace('_', ' ')}</span> recorded for this event.
                      </p>
                    </div>

                    {/* Existing Record Info */}
                    {duplicateStudentData.existingAttendance && (
                      <div className="bg-gray-50 border border-gray-200 rounded-lg p-3 mb-4">
                        <p className="text-gray-700 text-sm font-medium mb-1">Existing Record:</p>
                        <div className="text-xs text-gray-600 space-y-1">
                          {duplicateStudentData.existingAttendance.time_in && (
                            <p>Time In: {new Date(duplicateStudentData.existingAttendance.time_in).toLocaleString()}</p>
                          )}
                          {duplicateStudentData.existingAttendance.time_out && (
                            <p>Time Out: {new Date(duplicateStudentData.existingAttendance.time_out).toLocaleString()}</p>
                          )}
                        </div>
                      </div>
                    )}
                  </div>
                </div>

                {/* Modal Footer */}
                <div className="flex items-center justify-center p-4 sm:p-6 border-t border-gray-200">
                  <button
                    onClick={handleScanAnother}
                    className="w-full sm:w-auto px-6 py-3 sm:py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors flex items-center justify-center space-x-2"
                  >
                    <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15" />
                    </svg>
                    <span>Scan Another Student</span>
                  </button>
                </div>
              </div>
            </div>
          )}
        </div>
      )
    }
