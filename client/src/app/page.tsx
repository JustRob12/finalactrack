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

  useEffect(() => {
    if (!loading) {
      if (user) {
        router.push('/dashboard')
      } else {
        setShowLoginButton(true)
      }
    }
  }, [user, loading, router])

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
                src="/images/acetrack-font.png"
                alt="Acetrack Logo"
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
          
          {/* Student Search Section */}
          <div className="bg-white rounded-lg shadow-lg p-6 mb-8 max-w-2xl mx-auto">
            <h3 className="text-lg font-semibold text-gray-900 mb-4 text-center">Check Your Attendance</h3>
            <p className="text-sm text-gray-600 mb-4 text-center">
              <strong>Note:</strong> This search is only available for registered students who use QR code for attendance tracking.
            </p>
            <div className="flex space-x-3">
              <div className="flex-1">
                <input
                  type="text"
                  value={studentSearchQuery}
                  onChange={(e) => setStudentSearchQuery(e.target.value)}
                  onKeyPress={handleStudentKeyPress}
                  placeholder="Enter your Student"
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
              <div className="mt-4 p-4 bg-red-50 border border-red-200 rounded-lg">
                <p className="text-red-700 text-sm">{studentSearchError}</p>
              </div>
            )}

            {/* Student Attendance Results */}
            {showStudentSearch && studentAttendance.length > 0 && studentInfo && (
              <div className="mt-6">
                <div className="bg-orange-50 border border-orange-200 rounded-lg p-4 mb-4">
                  <h4 className="text-lg font-semibold text-gray-900 mb-1">
                    {studentInfo.first_name} {studentInfo.middle_initial} {studentInfo.last_name}
                  </h4>
                  <p className="text-sm text-gray-600">Student ID: {studentSearchQuery}</p>
                </div>
                <h4 className="text-md font-medium text-gray-900 mb-3">Attendance Records</h4>
                <div className="space-y-3">
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
              <div className="mt-6 p-4 bg-blue-50 border border-blue-200 rounded-lg">
                <p className="text-blue-700 text-sm text-center">No attendance records found for this Student ID.</p>
              </div>
            )}
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
            <div className="space-y-8">
              <div className="flex flex-col items-center space-y-3">
                <div className="w-16 h-16 bg-orange-100 rounded-full flex items-center justify-center">
                  <Mail className="w-8 h-8 text-orange-500" />
                </div>
                <div>
                  <h4 className="font-semibold text-gray-900 text-lg">Email</h4>
                  <p className="text-gray-600">acetrack2025@gmail.com</p>
                </div>
              </div>
              <div className="flex flex-col items-center space-y-3">
                <div className="w-16 h-16 bg-orange-100 rounded-full flex items-center justify-center">
                  <Phone className="w-8 h-8 text-orange-500" />
                </div>
                <div>
                  <h4 className="font-semibold text-gray-900 text-lg">Phone</h4>
                  <p className="text-gray-600">09363288483 - PIO</p>
                </div>
              </div>
              <div className="flex flex-col items-center space-y-3">
                <div className="w-16 h-16 bg-orange-100 rounded-full flex items-center justify-center">
                  <MapPin className="w-8 h-8 text-orange-500" />
                </div>
                <div>
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
                <a href="#" className="text-gray-400 hover:text-white transition-colors">
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
            <p>&copy; 2024 ACETRACK. All rights reserved. | Developed by ACES</p>
          </div>
        </div>
      </footer>
    </div>
  )
}
