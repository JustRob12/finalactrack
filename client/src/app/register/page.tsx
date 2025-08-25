'use client'

import { useState, useEffect } from 'react'
import { useRouter } from 'next/navigation'
import Link from 'next/link'
import { useAuth } from '@/contexts/AuthContext'
import { supabase } from '@/lib/supabase'
import { Eye, EyeOff, GraduationCap, User, Mail, Lock, BookOpen, CheckCircle, X } from 'lucide-react'

interface Course {
  id: number
  course_name: string
  short: string
}

export default function RegisterPage() {
  const [formData, setFormData] = useState({
    email: '',
    password: '',
    confirmPassword: '',
    studentId: '',
    firstName: '',
    middleInitial: '',
    lastName: '',
    courseId: '',
    yearLevel: '',
  })
  const [showPassword, setShowPassword] = useState(false)
  const [showConfirmPassword, setShowConfirmPassword] = useState(false)
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')
  const [showSuccessModal, setShowSuccessModal] = useState(false)
  const [courses, setCourses] = useState<Course[]>([])
  
  // Password validation states
  const [passwordStrength, setPasswordStrength] = useState({
    length: false,
    uppercase: false,
    lowercase: false,
    number: false,
    special: false
  })
  const { signUp } = useAuth()
  const router = useRouter()

  useEffect(() => {
    fetchCourses()
  }, [])

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

  const validatePassword = (password: string) => {
    const hasLength = password.length >= 8
    const hasUppercase = /[A-Z]/.test(password)
    const hasLowercase = /[a-z]/.test(password)
    const hasNumber = /\d/.test(password)
    const hasSpecial = /[!@#$%^&*()_+\-=\[\]{};':"\\|,.<>\/?]/.test(password)
    
    setPasswordStrength({
      length: hasLength,
      uppercase: hasUppercase,
      lowercase: hasLowercase,
      number: hasNumber,
      special: hasSpecial
    })
    
    return hasLength && hasUppercase && hasLowercase && hasNumber && hasSpecial
  }

  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement>) => {
    const { name, value } = e.target
    setFormData(prev => ({
      ...prev,
      [name]: value
    }))
    
    // Validate password when password field changes
    if (name === 'password') {
      validatePassword(value)
    }
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setLoading(true)
    setError('')

    // Validation
    if (formData.password !== formData.confirmPassword) {
      setError('Passwords do not match')
      setLoading(false)
      return
    }

    // Enhanced password validation
    if (!validatePassword(formData.password)) {
      setError('Password must be at least 8 characters long and contain uppercase, lowercase, number, and special character')
      setLoading(false)
      return
    }

    // Check if student ID already exists
    try {
      const { data: existingStudent, error: checkError } = await supabase
        .from('user_profiles')
        .select('student_id')
        .eq('student_id', formData.studentId)
        .single()

      if (checkError && checkError.code !== 'PGRST116') { // PGRST116 is "not found" error
        console.error('Error checking student ID:', checkError)
        setError('Error checking student ID. Please try again.')
        setLoading(false)
        return
      }

      if (existingStudent) {
        setError('Student ID already exists. Please use a different student ID or contact support if this is an error.')
        setLoading(false)
        return
      }

      // Check if email already exists
      const { data: existingEmail, error: emailCheckError } = await supabase
        .from('user_profiles')
        .select('username')
        .eq('username', formData.email)
        .single()

      if (emailCheckError && emailCheckError.code !== 'PGRST116') {
        console.error('Error checking email:', emailCheckError)
        setError('Error checking email. Please try again.')
        setLoading(false)
        return
      }

      if (existingEmail) {
        setError('Email address already exists. Please use a different email or try signing in instead.')
        setLoading(false)
        return
      }
    } catch (error) {
      console.error('Error checking student ID:', error)
      setError('Error checking student ID. Please try again.')
      setLoading(false)
      return
    }

    try {
      const { error, data } = await signUp(formData.email, formData.password, {
        student_id: formData.studentId,
        username: formData.email,
        first_name: formData.firstName,
        middle_initial: formData.middleInitial,
        last_name: formData.lastName,
        course_id: parseInt(formData.courseId),
        year_level: formData.yearLevel,
      })
      
      if (error) {
        setError(error.message)
        setLoading(false)
      } else {
        // Check if we have a valid user ID
        if (!data?.user?.id) {
          console.error('No user ID available after signup')
          setError('Registration successful but profile creation failed. Please contact support.')
          setLoading(false)
          return
        }

        // Create user profile in database with the correct user ID
        const userData = {
          id: data.user.id,
          student_id: formData.studentId,
          username: formData.email,
          first_name: formData.firstName,
          middle_initial: formData.middleInitial,
          last_name: formData.lastName,
          course_id: parseInt(formData.courseId),
          year_level: formData.yearLevel,
          role_id: 1, // Automatically set role_id to 1 for new registrations (regular users)
        }

        console.log('Creating user profile with data:', userData)
        console.log('User ID from auth:', data.user.id)

        try {
          const { error: profileError, data: profileData } = await supabase
            .from('user_profiles')
            .insert([userData])
            .select()

          if (profileError) {
            console.error('Error creating profile:', profileError)
            console.error('Error details:', {
              message: profileError.message,
              details: profileError.details,
              hint: profileError.hint,
              code: profileError.code
            })
            
            // Try to get more information about the error
            if (profileError.code === '42501') {
              console.error('Permission denied - check RLS policies')
            } else if (profileError.code === '42P01') {
              console.error('Table does not exist')
            } else if (profileError.code === '42703') {
              console.error('Column does not exist')
            }
            
            // Don't fail the registration if profile creation fails
            // The user can still sign in and we'll create a basic profile
          } else {
            console.log('Profile created successfully:', profileData)
          }
        } catch (profileError) {
          console.error('Exception during profile creation:', profileError)
        }

        setLoading(false)
        setShowSuccessModal(true)
      }
    } catch (error: unknown) {
      const errorMessage = error instanceof Error ? error.message : 'An unknown error occurred'
      setError(errorMessage)
      setLoading(false)
    }
  }

  const handleCloseModal = () => {
    setShowSuccessModal(false)
    router.push('/login')
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-orange-50 to-white flex items-center justify-center p-4">
      <div className="w-full max-w-2xl">
        {/* Logo and Welcome */}
        <div className="text-center mb-8">
          <div className="inline-flex items-center justify-center w-16 h-16 bg-orange-500 rounded-full mb-4">
            <GraduationCap className="w-8 h-8 text-white" />
          </div>
          <h1 className="text-3xl font-bold text-gray-900 mb-2">Join ACETRACK</h1>
          <p className="text-gray-600">Create your account to start tracking attendance</p>
        </div>

        {/* Registration Form */}
        <div className="card">
          <form onSubmit={handleSubmit} className="space-y-6">
            {error && (
              <div className="bg-red-50 border border-red-200 text-red-700 px-4 py-3 rounded-lg">
                {error}
              </div>
            )}

            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              {/* Student ID */}
              <div>
                <label htmlFor="studentId" className="block text-sm font-medium text-gray-700 mb-2">
                  Student ID
                </label>
                <div className="relative">
                  <User className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 w-5 h-5" />
                  <input
                    id="studentId"
                    name="studentId"
                    type="text"
                    value={formData.studentId}
                    onChange={handleInputChange}
                    className="input-field-with-icon"
                    placeholder="Enter your student ID"
                    required
                  />
                </div>
              </div>

              {/* Email */}
              <div>
                <label htmlFor="email" className="block text-sm font-medium text-gray-700 mb-2">
                  Email Address
                </label>
                <div className="relative">
                  <Mail className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 w-5 h-5" />
                  <input
                    id="email"
                    name="email"
                    type="email"
                    value={formData.email}
                    onChange={handleInputChange}
                    className="input-field-with-icon"
                    placeholder="Enter your email"
                    required
                  />
                </div>
              </div>

              {/* First Name */}
              <div>
                <label htmlFor="firstName" className="block text-sm font-medium text-gray-700 mb-2">
                  First Name
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
                  Last Name
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
                  Course
                </label>
                <div className="relative">
                  <BookOpen className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 w-5 h-5" />
                  <select
                    id="courseId"
                    name="courseId"
                    value={formData.courseId}
                    onChange={handleInputChange}
                    className="input-field-with-icon"
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
                  Year Level
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

              {/* Password */}
              <div>
                <label htmlFor="password" className="block text-sm font-medium text-gray-700 mb-2">
                  Password
                </label>
                <div className="relative">
                  <Lock className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 w-5 h-5" />
                  <input
                    id="password"
                    name="password"
                    type={showPassword ? 'text' : 'password'}
                    value={formData.password}
                    onChange={handleInputChange}
                    className="input-field-with-icon pr-12"
                    placeholder="Create a password"
                    required
                  />
                  <button
                    type="button"
                    onClick={() => setShowPassword(!showPassword)}
                    className="absolute right-3 top-1/2 transform -translate-y-1/2 text-gray-400 hover:text-gray-600"
                  >
                    {showPassword ? <EyeOff className="w-5 h-5" /> : <Eye className="w-5 h-5" />}
                  </button>
                </div>
                
                {/* Password Strength Indicator */}
                {formData.password && (
                  <div className="mt-3 p-3 bg-gray-50 rounded-lg">
                    <p className="text-xs font-medium text-gray-700 mb-2">Password Requirements:</p>
                    <div className="space-y-1">
                      <div className={`flex items-center text-xs ${passwordStrength.length ? 'text-green-600' : 'text-gray-500'}`}>
                        {passwordStrength.length ? <CheckCircle className="w-3 h-3 mr-2" /> : <X className="w-3 h-3 mr-2" />}
                        At least 8 characters
                      </div>
                      <div className={`flex items-center text-xs ${passwordStrength.uppercase ? 'text-green-600' : 'text-gray-500'}`}>
                        {passwordStrength.uppercase ? <CheckCircle className="w-3 h-3 mr-2" /> : <X className="w-3 h-3 mr-2" />}
                        One uppercase letter (A-Z)
                      </div>
                      <div className={`flex items-center text-xs ${passwordStrength.lowercase ? 'text-green-600' : 'text-gray-500'}`}>
                        {passwordStrength.lowercase ? <CheckCircle className="w-3 h-3 mr-2" /> : <X className="w-3 h-3 mr-2" />}
                        One lowercase letter (a-z)
                      </div>
                      <div className={`flex items-center text-xs ${passwordStrength.number ? 'text-green-600' : 'text-gray-500'}`}>
                        {passwordStrength.number ? <CheckCircle className="w-3 h-3 mr-2" /> : <X className="w-3 h-3 mr-2" />}
                        One number (0-9)
                      </div>
                      <div className={`flex items-center text-xs ${passwordStrength.special ? 'text-green-600' : 'text-gray-500'}`}>
                        {passwordStrength.special ? <CheckCircle className="w-3 h-3 mr-2" /> : <X className="w-3 h-3 mr-2" />}
                        One special character (!@#$%^&*)
                      </div>
                    </div>
                  </div>
                )}
              </div>

              {/* Confirm Password */}
              <div>
                <label htmlFor="confirmPassword" className="block text-sm font-medium text-gray-700 mb-2">
                  Confirm Password
                </label>
                <div className="relative">
                  <Lock className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 w-5 h-5" />
                  <input
                    id="confirmPassword"
                    name="confirmPassword"
                    type={showConfirmPassword ? 'text' : 'password'}
                    value={formData.confirmPassword}
                    onChange={handleInputChange}
                    className="input-field-with-icon pr-12"
                    placeholder="Confirm your password"
                    required
                  />
                  <button
                    type="button"
                    onClick={() => setShowConfirmPassword(!showConfirmPassword)}
                    className="absolute right-3 top-1/2 transform -translate-y-1/2 text-gray-400 hover:text-gray-600"
                  >
                    {showConfirmPassword ? <EyeOff className="w-5 h-5" /> : <Eye className="w-5 h-5" />}
                  </button>
                </div>
              </div>
            </div>

            <button
              type="submit"
              disabled={loading}
              className="btn-primary w-full disabled:opacity-50 disabled:cursor-not-allowed"
            >
              {loading ? 'Creating Account...' : 'Create Account'}
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
            © 2024 FinalActrack. All rights reserved.
          </p>
        </div>
      </div>

      {/* Success Modal */}
      {showSuccessModal && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-xl shadow-2xl max-w-md w-full p-6 relative">
            {/* Close Button */}
            <button
              onClick={handleCloseModal}
              className="absolute top-4 right-4 text-gray-400 hover:text-gray-600 transition-colors"
            >
              <X className="w-6 h-6" />
            </button>

            {/* Success Content */}
            <div className="text-center">
              <div className="w-16 h-16 bg-green-100 rounded-full flex items-center justify-center mx-auto mb-4">
                <CheckCircle className="w-8 h-8 text-green-600" />
              </div>
              
              <h2 className="text-2xl font-bold text-gray-900 mb-2">
                Registration Successful!
              </h2>
              
              <p className="text-gray-600 mb-6">
                Your account has been created successfully. Please check your email and click the confirmation link to verify your account.
              </p>

              <div className="bg-orange-50 border border-orange-200 rounded-lg p-4 mb-6">
                <p className="text-sm text-orange-800">
                  <strong>Important:</strong> You must confirm your email address before you can sign in to your account.
                </p>
              </div>

              <button
                onClick={handleCloseModal}
                className="btn-primary w-full"
              >
                Go to Login
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
