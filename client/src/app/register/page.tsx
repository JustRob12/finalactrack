'use client'

import { useState, useEffect, Suspense } from 'react'
import { useRouter, useSearchParams } from 'next/navigation'
import Link from 'next/link'
import { useAuth } from '@/contexts/AuthContext'
import { supabase } from '@/lib/supabase'
import { User, BookOpen, ArrowLeft, X, CheckCircle } from 'lucide-react'
import Image from 'next/image'

interface Course {
  id: number
  course_name: string
  short: string
}

function RegisterPageContent() {
  const [formData, setFormData] = useState({
    studentId: '',
    firstName: '',
    middleInitial: '',
    lastName: '',
    courseId: '',
    yearLevel: '',
  })
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')
  const [showSuccessModal, setShowSuccessModal] = useState(false)
  const [showConfirmationModal, setShowConfirmationModal] = useState(false)
  const [courses, setCourses] = useState<Course[]>([])
  const [studentIdError, setStudentIdError] = useState('')
  const { signInWithGoogle, user } = useAuth()
  const router = useRouter()
  const searchParams = useSearchParams()

  useEffect(() => {
    fetchCourses()
  }, [])

  // Handle Google OAuth callback
  useEffect(() => {
    const handleGoogleCallback = async () => {
      // Check for OAuth callback indicators (query params or hash fragments)
      const code = searchParams.get('code')
      const accessToken = searchParams.get('access_token')
      const hashParams = typeof window !== 'undefined' ? new URLSearchParams(window.location.hash.substring(1)) : null
      const hashAccessToken = hashParams?.get('access_token')
      const hashCode = hashParams?.get('code')
      
      // Check if we have an OAuth callback (either query param or hash fragment)
      const isOAuthCallback = code || accessToken || hashAccessToken || hashCode
      
      if (isOAuthCallback) {
        console.log('🔐 Registration OAuth callback detected')
        
        // Wait for user to be available (Supabase processes the callback)
        let attempts = 0
        const maxAttempts = 10
        let currentUser = user
        
        while (!currentUser && attempts < maxAttempts) {
          await new Promise(resolve => setTimeout(resolve, 500))
          attempts++
          
          // Check session directly
          const { data: { session } } = await supabase.auth.getSession()
          if (session?.user) {
            console.log('✅ Session found for registration, user:', session.user.id)
            currentUser = session.user
            break
          }
        }
        
        // Get current user (might be set by AuthContext now)
        if (!currentUser) {
          const { data: { user: fetchedUser } } = await supabase.auth.getUser()
          currentUser = fetchedUser
        }
        
        if (currentUser) {
          // Load saved form data
          const savedFormData = sessionStorage.getItem('registrationFormData')
          if (savedFormData) {
            try {
              const parsed = JSON.parse(savedFormData)
              console.log('📝 Loading saved registration data:', parsed)
              setFormData(parsed)
              
              // Wait a bit for state to update, then create profile
              setTimeout(async () => {
                await createProfileAfterGoogleAuth(parsed)
              }, 200)
            } catch (error) {
              console.error('Error parsing saved form data:', error)
              setError('Error loading registration data. Please try again.')
            }
          } else {
            // Check if profile already exists
            const { data: existingProfile } = await supabase
              .from('user_profiles')
              .select('id')
              .eq('id', currentUser.id)
              .single()

            if (existingProfile) {
              console.log('✅ Profile already exists, redirecting to dashboard')
              // Clear URL hash/query params
              if (typeof window !== 'undefined') {
                window.history.replaceState({}, document.title, '/register')
              }
              // Profile already exists, redirect to dashboard
              router.push('/dashboard')
            } else {
              setError('Registration data not found. Please fill out the form again.')
            }
          }
        } else {
          console.error('❌ User not found after OAuth callback')
          setError('Authentication failed. Please try again.')
        }
      }
    }
    
    // Run callback handler
    handleGoogleCallback()
  }, [user, searchParams, router])

  const fetchCourses = async () => {
    try {
      const { data, error } = await supabase
        .from('courses')
        .select('id, course_name, short')
        .order('course_name')
      
      if (error) throw error
      setCourses(data || [])
    } catch (error) {
      console.error('Error fetching courses:', error)
    }
  }

  // Strict Student ID validation: format must be 0000-0000 (numbers only with dash)
  const validateStudentId = (value: string): boolean => {
    const pattern = /^\d{4}-\d{4}$/
    return pattern.test(value)
  }

  const handleStudentIdChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    let value = e.target.value
    
    // Remove any non-numeric characters except dash
    value = value.replace(/[^\d-]/g, '')
    
    // Auto-format: add dash after 4 digits
    if (value.length > 4 && value.charAt(4) !== '-') {
      value = value.slice(0, 4) + '-' + value.slice(4)
    }
    
    // Limit to 9 characters (4 digits + dash + 4 digits)
    if (value.length > 9) {
      value = value.slice(0, 9)
    }
    
    setFormData(prev => ({
      ...prev,
      studentId: value
    }))
    
    // Validate format
    if (value.length === 9 && !validateStudentId(value)) {
      setStudentIdError('Student ID must be in format: 0000-0000')
    } else if (value.length > 0 && value.length < 9) {
      setStudentIdError('Student ID must be 8 digits (format: 0000-0000)')
    } else {
      setStudentIdError('')
    }
  }

  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement>) => {
    const { name, value } = e.target
    setFormData(prev => ({
      ...prev,
      [name]: value
    }))
  }

  const validateForm = (): boolean => {
    if (!validateStudentId(formData.studentId)) {
      setError('Please enter a valid Student ID in format: 0000-0000')
      return false
    }

    if (!formData.firstName.trim()) {
      setError('First Name is required')
      return false
    }

    if (!formData.lastName.trim()) {
      setError('Last Name is required')
      return false
    }

    if (!formData.courseId) {
      setError('Please select a course')
      return false
    }

    if (!formData.yearLevel) {
      setError('Please select a year level')
      return false
    }

    return true
  }

  const createProfileAfterGoogleAuth = async (formDataToUse?: typeof formData) => {
    // Get current user (might not be in state yet)
    let currentUser = user
    if (!currentUser) {
      const { data: { user: fetchedUser } } = await supabase.auth.getUser()
      currentUser = fetchedUser
    }

    if (!currentUser) {
      console.error('❌ No user found for profile creation')
      setError('User not authenticated. Please try again.')
      return
    }

    const dataToUse = formDataToUse || formData

    console.log('💾 Creating user profile with data:', {
      userId: currentUser.id,
      studentId: dataToUse.studentId,
      firstName: dataToUse.firstName,
      lastName: dataToUse.lastName,
      courseId: dataToUse.courseId,
      yearLevel: dataToUse.yearLevel,
    })

    try {
      // Check if profile already exists
      const { data: existingProfile } = await supabase
        .from('user_profiles')
        .select('id')
        .eq('id', currentUser.id)
        .maybeSingle()

      if (existingProfile) {
        console.log('✅ Profile already exists, redirecting to dashboard')
        // Clear URL hash/query params
        if (typeof window !== 'undefined') {
          window.history.replaceState({}, document.title, '/register')
        }
        // Profile already exists, redirect to dashboard
        router.push('/dashboard')
        return
      }

      // Check if student ID already exists
      const { data: existingStudent } = await supabase
        .from('user_profiles')
        .select('student_id')
        .eq('student_id', dataToUse.studentId)
        .maybeSingle()

      if (existingStudent) {
        console.error('❌ Student ID already exists:', dataToUse.studentId)
        setError('Student ID already exists. Please use a different student ID or contact support.')
        sessionStorage.removeItem('registrationFormData')
        return
      }

      // Get user email from auth
      const email = currentUser.email || currentUser.user_metadata?.email || ''
      
      if (!email) {
        console.error('❌ No email found for user')
        setError('Email not found. Please try again.')
        return
      }

      // Validate all required fields are present
      if (!dataToUse.studentId || !dataToUse.firstName || !dataToUse.lastName || !dataToUse.courseId || !dataToUse.yearLevel) {
        console.error('❌ Missing required fields:', {
          studentId: !!dataToUse.studentId,
          firstName: !!dataToUse.firstName,
          lastName: !!dataToUse.lastName,
          courseId: !!dataToUse.courseId,
          yearLevel: !!dataToUse.yearLevel,
        })
        setError('Missing required registration information. Please fill out all required fields.')
        return
      }

      // Create user profile - matching the database schema exactly
      const userData = {
        id: currentUser.id, // uuid (from Google auth)
        student_id: dataToUse.studentId.trim(), // text (required) - from form
        username: email, // text (required) - from Google email
        first_name: dataToUse.firstName.trim(), // text (required) - from form
        middle_initial: dataToUse.middleInitial?.trim() || null, // text (nullable) - from form
        last_name: dataToUse.lastName.trim(), // text (required) - from form
        course_id: parseInt(dataToUse.courseId), // integer (required) - from form dropdown
        year_level: dataToUse.yearLevel, // text (required) - from form dropdown
        role_id: 1, // integer (nullable) - set to 1 for regular users/students
        // avatar: null, // text (nullable) - will be null by default
        // created_at: auto-generated by database
      }

      console.log('📤 Inserting user profile to database:', {
        id: userData.id,
        student_id: userData.student_id,
        username: userData.username,
        first_name: userData.first_name,
        middle_initial: userData.middle_initial,
        last_name: userData.last_name,
        course_id: userData.course_id,
        year_level: userData.year_level,
        role_id: userData.role_id,
      })

      const { data: insertedData, error: profileError } = await supabase
        .from('user_profiles')
        .insert([userData])
        .select()

      if (profileError) {
        console.error('❌ Error creating profile:', profileError)
        console.error('Error details:', {
          message: profileError.message,
          details: profileError.details,
          hint: profileError.hint,
          code: profileError.code
        })
        setError(`Error creating profile: ${profileError.message}. Please try again or contact support.`)
        sessionStorage.removeItem('registrationFormData')
        return
      }

      console.log('✅ User profile created successfully:', insertedData)

      // Clear saved form data
      sessionStorage.removeItem('registrationFormData')

      // Clear URL hash/query params
      if (typeof window !== 'undefined') {
        window.history.replaceState({}, document.title, '/register')
      }

      // Success - show modal
      setShowSuccessModal(true)
    } catch (error) {
      console.error('❌ Exception in createProfileAfterGoogleAuth:', error)
      setError('An error occurred. Please try again.')
      sessionStorage.removeItem('registrationFormData')
    }
  }

  const handleGoogleSignIn = async () => {
    setError('')
    setStudentIdError('')

    // Validate form before showing confirmation modal
    if (!validateForm()) {
      return
    }

    // Show confirmation modal instead of directly proceeding
    setShowConfirmationModal(true)
  }

  const proceedWithGoogleSignIn = async () => {
    // Close confirmation modal
    setShowConfirmationModal(false)

    // Log form data before saving
    console.log('📝 Saving registration form data:', {
      studentId: formData.studentId,
      firstName: formData.firstName,
      middleInitial: formData.middleInitial,
      lastName: formData.lastName,
      courseId: formData.courseId,
      yearLevel: formData.yearLevel,
    })

    // Store form data in sessionStorage to retrieve after Google redirect
    sessionStorage.setItem('registrationFormData', JSON.stringify(formData))
    
    // Verify it was saved
    const saved = sessionStorage.getItem('registrationFormData')
    if (saved) {
      console.log('✅ Form data saved to sessionStorage successfully')
    } else {
      console.error('❌ Failed to save form data to sessionStorage')
      setError('Failed to save registration data. Please try again.')
      return
    }

    setLoading(true)
    const { error } = await signInWithGoogle('/register')
    
    if (error) {
      setError(error.message || 'Failed to sign in with Google. Please try again.')
      setLoading(false)
      // Remove saved data on error
      sessionStorage.removeItem('registrationFormData')
    }
    // If successful, user will be redirected to Google, then back here
    // The useEffect will handle creating the profile with all the saved form data
  }

  const cancelConfirmation = () => {
    setShowConfirmationModal(false)
    // User can now edit the form again
  }

  // Get course name for display
  const getCourseName = () => {
    const course = courses.find(c => c.id === parseInt(formData.courseId))
    return course ? `${course.short} - ${course.course_name}` : 'Not selected'
  }


  const handleCloseModal = () => {
    setShowSuccessModal(false)
    router.push('/dashboard')
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-orange-50 to-white flex items-center justify-center p-4">
      {/* Back to Home Button */}
      <button
        onClick={() => router.push('/')}
        className="absolute top-6 left-6 flex items-center space-x-2 text-gray-600 hover:text-gray-900 transition-colors"
      >
        <ArrowLeft className="w-5 h-5" />
        <span className="text-sm font-medium">Back to Home</span>
      </button>

      <div className="w-full max-w-2xl">
        {/* Logo and Welcome */}
        <div className="text-center mb-8">
          <div className="inline-flex items-center justify-center w-16 h-16 mb-4">
            <Image
              src="/images/aces-logo.png"
              alt="ACES Logo"
              width={64}
              height={64}
              className="rounded-full"
            />
          </div>
          <h1 className="text-3xl font-bold text-gray-900 mb-2">Join ACETRACK</h1>
          <p className="text-gray-600">Create your account with Google</p>
        </div>

        {/* Registration Form */}
        <div className="card">
          <form onSubmit={(e) => { e.preventDefault(); handleGoogleSignIn(); }} className="space-y-6">
            {error && (
              <div className="bg-red-50 border border-red-200 text-red-700 px-4 py-3 rounded-lg">
                {error}
              </div>
            )}

            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              {/* Student ID */}
              <div>
                <label htmlFor="studentId" className="block text-sm font-medium text-gray-700 mb-2">
                  Student ID <span className="text-red-500">*</span>
                </label>
                <div className="relative">
                  <User className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 w-5 h-5" />
                  <input
                    id="studentId"
                    name="studentId"
                    type="text"
                    value={formData.studentId}
                    onChange={handleStudentIdChange}
                    className={`input-field-with-icon ${studentIdError ? 'border-red-500' : ''}`}
                    placeholder="0000-0000"
                    required
                    maxLength={9}
                  />
                </div>
                {studentIdError && (
                  <p className="mt-1 text-sm text-red-600">{studentIdError}</p>
                )}
                <p className="mt-1 text-xs text-gray-500">Format: 0000-0000 (numbers only)</p>
              </div>

              {/* First Name */}
              <div>
                <label htmlFor="firstName" className="block text-sm font-medium text-gray-700 mb-2">
                  First Name <span className="text-red-500">*</span>
                </label>
                <input
                  id="firstName"
                  name="firstName"
                  type="text"
                  value={formData.firstName}
                  onChange={handleInputChange}
                  className="input-field"
                  placeholder="Enter your first name"
                  required
                />
              </div>

              {/* Middle Initial */}
              <div>
                <label htmlFor="middleInitial" className="block text-sm font-medium text-gray-700 mb-2">
                  Middle Initial
                </label>
                <input
                  id="middleInitial"
                  name="middleInitial"
                  type="text"
                  value={formData.middleInitial}
                  onChange={handleInputChange}
                  className="input-field"
                  placeholder="M.I."
                  maxLength={1}
                />
              </div>

              {/* Last Name */}
              <div>
                <label htmlFor="lastName" className="block text-sm font-medium text-gray-700 mb-2">
                  Last Name <span className="text-red-500">*</span>
                </label>
                <input
                  id="lastName"
                  name="lastName"
                  type="text"
                  value={formData.lastName}
                  onChange={handleInputChange}
                  className="input-field"
                  placeholder="Enter your last name"
                  required
                />
              </div>

              {/* Course */}
              <div>
                <label htmlFor="courseId" className="block text-sm font-medium text-gray-700 mb-2">
                  Course <span className="text-red-500">*</span>
                </label>
                <div className="relative">
                  <BookOpen className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 w-5 h-5 z-10" />
                  <select
                    id="courseId"
                    name="courseId"
                    value={formData.courseId}
                    onChange={handleInputChange}
                    className="input-field-with-icon appearance-none"
                    required
                  >
                    <option value="">Select your course</option>
                    {courses.map((course) => (
                      <option key={course.id} value={course.id}>
                        {course.course_name} ({course.short})
                      </option>
                    ))}
                  </select>
                </div>
              </div>

              {/* Year Level */}
              <div>
                <label htmlFor="yearLevel" className="block text-sm font-medium text-gray-700 mb-2">
                  Year Level <span className="text-red-500">*</span>
                </label>
                <select
                  id="yearLevel"
                  name="yearLevel"
                  value={formData.yearLevel}
                  onChange={handleInputChange}
                  className="input-field"
                  required
                >
                  <option value="">Select year level</option>
                  <option value="1st Year">1st Year</option>
                  <option value="2nd Year">2nd Year</option>
                  <option value="3rd Year">3rd Year</option>
                  <option value="4th Year">4th Year</option>
                  <option value="5th Year">5th Year</option>
                  <option value="6th Year">6th Year</option>
                </select>
              </div>
            </div>

            {/* Google Sign In Button */}
            <button
              type="submit"
              disabled={loading}
              className="w-full flex items-center justify-center gap-3 bg-white border-2 border-gray-300 hover:border-gray-400 text-gray-700 font-semibold py-3 px-6 rounded-lg transition-all duration-200 shadow-sm hover:shadow-md disabled:opacity-50 disabled:cursor-not-allowed"
            >
              {loading ? (
                <>
                  <div className="w-5 h-5 border-2 border-gray-400 border-t-transparent rounded-full animate-spin"></div>
                  <span>Connecting to Google...</span>
                </>
              ) : (
                <>
                  <svg className="w-5 h-5" viewBox="0 0 24 24">
                    <path
                      fill="#4285F4"
                      d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z"
                    />
                    <path
                      fill="#34A853"
                      d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z"
                    />
                    <path
                      fill="#FBBC05"
                      d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z"
                    />
                    <path
                      fill="#EA4335"
                      d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z"
                    />
                  </svg>
                  <span>Sign in with Google</span>
                </>
              )}
            </button>
          </form>

          <div className="mt-6 text-center">
            <p className="text-gray-600">
              Already have an account?{' '}
              <Link href="/login" className="text-orange-500 hover:text-orange-600 font-semibold">
                Sign in here
              </Link>
            </p>
          </div>
        </div>

        {/* Footer */}
        <div className="text-center mt-8">
          <p className="text-sm text-gray-500">
            © 2025 Acetrack. All rights reserved.
          </p>
        </div>
      </div>

      {/* Confirmation Modal */}
      {showConfirmationModal && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-xl shadow-2xl max-w-lg w-full p-6 relative">
            {/* Close Button */}
            <button
              onClick={cancelConfirmation}
              className="absolute top-4 right-4 text-gray-400 hover:text-gray-600 transition-colors"
            >
              <X className="w-6 h-6" />
            </button>

            {/* Modal Content */}
            <div>
              <div className="text-center mb-6">
                <div className="w-16 h-16 bg-orange-100 rounded-full flex items-center justify-center mx-auto mb-4">
                  <CheckCircle className="w-8 h-8 text-orange-600" />
                </div>
                <h2 className="text-2xl font-bold text-gray-900 mb-2">
                  Are You Sure This Is Your Information?
                </h2>
                <p className="text-gray-600">
                  Please review your information before proceeding
                </p>
              </div>

              {/* Information Display */}
              <div className="bg-gray-50 rounded-lg p-4 mb-6 space-y-3">
                <div className="flex justify-between items-start">
                  <span className="text-sm font-medium text-gray-600">Student ID:</span>
                  <span className="text-sm font-semibold text-gray-900">{formData.studentId || 'Not provided'}</span>
                </div>
                
                <div className="flex justify-between items-start">
                  <span className="text-sm font-medium text-gray-600">First Name:</span>
                  <span className="text-sm font-semibold text-gray-900">{formData.firstName || 'Not provided'}</span>
                </div>
                
                {formData.middleInitial && (
                  <div className="flex justify-between items-start">
                    <span className="text-sm font-medium text-gray-600">Middle Initial:</span>
                    <span className="text-sm font-semibold text-gray-900">{formData.middleInitial}</span>
                  </div>
                )}
                
                <div className="flex justify-between items-start">
                  <span className="text-sm font-medium text-gray-600">Last Name:</span>
                  <span className="text-sm font-semibold text-gray-900">{formData.lastName || 'Not provided'}</span>
                </div>
                
                <div className="flex justify-between items-start">
                  <span className="text-sm font-medium text-gray-600">Course:</span>
                  <span className="text-sm font-semibold text-gray-900 text-right">{getCourseName()}</span>
                </div>
                
                <div className="flex justify-between items-start">
                  <span className="text-sm font-medium text-gray-600">Year Level:</span>
                  <span className="text-sm font-semibold text-gray-900">{formData.yearLevel || 'Not provided'}</span>
                </div>
              </div>

              {/* Action Buttons */}
              <div className="flex gap-3">
                <button
                  onClick={cancelConfirmation}
                  className="flex-1 px-4 py-3 border-2 border-gray-300 text-gray-700 font-semibold rounded-lg hover:bg-gray-50 transition-colors"
                >
                  Cancel
                </button>
                <button
                  onClick={proceedWithGoogleSignIn}
                  className="flex-1 btn-primary"
                >
                  Proceed
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Success Modal */}
      {showSuccessModal && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-xl shadow-2xl max-w-md w-full p-6 relative">
            {/* Close Button */}
            <button
              onClick={handleCloseModal}
              className="absolute top-4 right-4 text-gray-400 hover:text-gray-600 transition-colors"
            >
              <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
              </svg>
            </button>

            {/* Success Content */}
            <div className="text-center">
              <div className="w-16 h-16 bg-green-100 rounded-full flex items-center justify-center mx-auto mb-4">
                <svg className="w-8 h-8 text-green-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                </svg>
              </div>
              
              <h2 className="text-2xl font-bold text-gray-900 mb-2">
                Registration Successful!
              </h2>
              
              <p className="text-gray-600 mb-6">
                Your account has been created successfully! You can now access your dashboard.
              </p>

              <button
                onClick={handleCloseModal}
                className="btn-primary w-full"
              >
                Go to Dashboard
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}

export default function RegisterPage() {
  return (
    <Suspense fallback={
      <div className="min-h-screen bg-gradient-to-br from-orange-50 to-white flex items-center justify-center">
        <div className="text-center">
          <div className="inline-block animate-spin rounded-full h-12 w-12 border-4 border-orange-500 border-t-transparent"></div>
          <p className="mt-4 text-gray-600">Loading...</p>
        </div>
      </div>
    }>
      <RegisterPageContent />
    </Suspense>
  )
}
