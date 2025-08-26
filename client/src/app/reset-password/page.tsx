'use client'

import { useState, useEffect } from 'react'
import { useRouter } from 'next/navigation'
import { useAuth } from '@/contexts/AuthContext'
import { supabase } from '@/lib/supabase'
import { GraduationCap, Eye, EyeOff, CheckCircle } from 'lucide-react'

export default function ResetPasswordPage() {
  const [password, setPassword] = useState('')
  const [confirmPassword, setConfirmPassword] = useState('')
  const [showPassword, setShowPassword] = useState(false)
  const [showConfirmPassword, setShowConfirmPassword] = useState(false)
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')
  const [success, setSuccess] = useState(false)
  const [user, setUser] = useState<any>(null)
  const [passwordValidation, setPasswordValidation] = useState({
    length: false,
    uppercase: false,
    lowercase: false,
    number: false,
    special: false
  })
  const router = useRouter()

  useEffect(() => {
    // Check if user is authenticated (they should be after clicking reset link)
    const checkUser = async () => {
      try {
        // Check if there's a recovery token in the URL
        const urlParams = new URLSearchParams(window.location.search)
        const token = urlParams.get('token')
        const type = urlParams.get('type')
        const access_token = urlParams.get('access_token')
        const refresh_token = urlParams.get('refresh_token')
        
        // URL parameters detected
        
        // Supabase password reset links can have different parameter structures
        if (token || access_token || refresh_token) {
          // This is a password reset link with token
          // Password reset token detected
          // Clear any existing errors since we have a valid token
          setError('')
          // Allow the user to proceed - the token will be handled during password update
          setUser({ id: 'temp', email: 'reset@temp.com' } as any)
          return
        }
        
        // If no recovery token, check for regular session
        const { data: { session }, error: sessionError } = await supabase.auth.getSession()
        
        if (sessionError) {
          console.error('Session error:', sessionError)
        }
        
        if (session?.user) {
          // User is already authenticated
          setUser(session.user)
          return
        }
        
        // No valid session or token found
        setError('Invalid or expired reset link. Please request a new password reset.')
      } catch (error) {
        console.error('Error checking user:', error)
        setError('An error occurred while validating the reset link.')
      }
    }
    checkUser()

    // Listen for auth state changes (in case the token gets processed)
    const { data: { subscription } } = supabase.auth.onAuthStateChange((event, session) => {
      // Reset password page auth state change
      if (event === 'PASSWORD_RECOVERY' || event === 'TOKEN_REFRESHED') {
        if (session?.user) {
          setUser(session.user)
          setError('') // Clear any error
        }
      }
    })

    return () => subscription.unsubscribe()
  }, [])

  // Password validation function
  const validatePassword = (password: string): { isValid: boolean; errors: string[] } => {
    const errors: string[] = []
    
    if (password.length < 8) {
      errors.push('Password must be at least 8 characters long')
    }
    
    if (!/[A-Z]/.test(password)) {
      errors.push('Password must contain at least one uppercase letter')
    }
    
    if (!/[a-z]/.test(password)) {
      errors.push('Password must contain at least one lowercase letter')
    }
    
    if (!/[0-9]/.test(password)) {
      errors.push('Password must contain at least one number')
    }
    
    if (!/[!@#$%^&*(),.?":{}|<>]/.test(password)) {
      errors.push('Password must contain at least one special character (!@#$%^&*(),.?":{}|<>)')
    }
    
    return {
      isValid: errors.length === 0,
      errors
    }
  }

  // Update password validation in real-time
  const updatePasswordValidation = (password: string) => {
    setPasswordValidation({
      length: password.length >= 8,
      uppercase: /[A-Z]/.test(password),
      lowercase: /[a-z]/.test(password),
      number: /[0-9]/.test(password),
      special: /[!@#$%^&*(),.?":{}|<>]/.test(password)
    })
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setLoading(true)
    setError('')

    // Validate passwords
    const passwordValidation = validatePassword(password)
    if (!passwordValidation.isValid) {
      setError(passwordValidation.errors.join('\n'))
      setLoading(false)
      return
    }

    if (password !== confirmPassword) {
      setError('Passwords do not match')
      setLoading(false)
      return
    }

    try {
      // Check if this is a password reset with tokens in URL
      const urlParams = new URLSearchParams(window.location.search)
      const token = urlParams.get('token')
      const access_token = urlParams.get('access_token')
      const refresh_token = urlParams.get('refresh_token')
      
      let error = null
      
      if (access_token && refresh_token) {
        // This is a password reset with tokens - we need to set the session first
        // Setting session with tokens from URL
        const { error: sessionError } = await supabase.auth.setSession({
          access_token,
          refresh_token
        })
        
        if (sessionError) {
          console.error('Session error:', sessionError)
          setError('Invalid or expired reset link. Please request a new password reset.')
          setLoading(false)
          return
        }
      } else if (token) {
        // This is a password reset with a single token - we need to use it to update the password
        // Using token for password reset
        
        try {
          // Try to verify the recovery token first
                      // Verifying recovery token
          const { data, error: recoveryError } = await supabase.auth.verifyOtp({
            token_hash: token,
            type: 'recovery'
          })
          
          if (recoveryError) {
            console.error('Recovery error:', recoveryError)
            error = recoveryError
          } else if (data.session) {
            // Now we have a session, we can update the password
            // Recovery successful, updating password
            const { error: updateError } = await supabase.auth.updateUser({
              password: password
            })
            error = updateError
          } else {
            console.error('No session returned from recovery')
            error = new Error('Failed to verify recovery token')
          }
        } catch (catchError) {
          console.error('Catch error:', catchError)
          error = catchError as Error
        }
      } else {
        // Regular password update
        const { error: updateError } = await supabase.auth.updateUser({
          password: password
        })
        error = updateError
      }

      if (error) {
        setError(error.message)
      } else {
        setSuccess(true)
        // Redirect to login after 3 seconds
        setTimeout(() => {
          router.push('/login')
        }, 3000)
      }
    } catch (error) {
      console.error('Password update error:', error)
      setError('An unexpected error occurred. Please try again.')
    } finally {
      setLoading(false)
    }
  }

  if (success) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-orange-50 to-white flex items-center justify-center p-4">
        <div className="w-full max-w-md">
          <div className="text-center mb-8">
            <div className="inline-flex items-center justify-center w-16 h-16 bg-orange-500 rounded-full mb-4">
              <GraduationCap className="w-8 h-8 text-white" />
            </div>
            <h1 className="text-3xl font-bold text-gray-900 mb-2">Password Reset Successfully!</h1>
            <p className="text-gray-600">Your password has been updated.</p>
          </div>

          <div className="bg-white rounded-2xl shadow-lg border border-gray-100 p-8 text-center">
            <div className="w-20 h-20 bg-green-100 rounded-full flex items-center justify-center mx-auto mb-6">
              <CheckCircle className="w-10 h-10 text-green-600" />
            </div>
            <h2 className="text-2xl font-bold text-gray-900 mb-4">All Set!</h2>
            <p className="text-gray-600 mb-6">
              Your password has been successfully reset. You can now sign in with your new password.
            </p>
            <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
              <p className="text-sm text-blue-700">
                Redirecting to login page in 3 seconds...
              </p>
            </div>
          </div>
        </div>
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-orange-50 to-white flex items-center justify-center p-4">
      <div className="w-full max-w-md">
        {/* Logo and Welcome */}
        <div className="text-center mb-8">
          <div className="inline-flex items-center justify-center w-16 h-16 bg-orange-500 rounded-full mb-4">
            <GraduationCap className="w-8 h-8 text-white" />
          </div>
          <h1 className="text-3xl font-bold text-gray-900 mb-2">Reset Your Password</h1>
          <p className="text-gray-600">Enter your new password below</p>
        </div>

        {/* Reset Password Form */}
        <div className="bg-white rounded-2xl shadow-lg border border-gray-100 p-8">
          {error && error !== 'Auth session missing!' && (
            <div className="bg-red-50 border border-red-200 text-red-700 px-4 py-3 rounded-lg mb-6">
              {error}
            </div>
          )}

          <form onSubmit={handleSubmit} className="space-y-6">
            <div>
              <label htmlFor="password" className="block text-sm font-medium text-gray-700 mb-2">
                New Password
              </label>
              <div className="relative">
                <input
                  id="password"
                  type={showPassword ? 'text' : 'password'}
                  value={password}
                  onChange={(e) => {
                    setPassword(e.target.value)
                    updatePasswordValidation(e.target.value)
                  }}
                  className="w-full px-4 py-3 border border-gray-300 rounded-xl focus:ring-2 focus:ring-orange-500 focus:border-transparent transition-colors pr-12"
                  placeholder="Enter your new password"
                  required
                  minLength={8}
                />
                <button
                  type="button"
                  onClick={() => setShowPassword(!showPassword)}
                  className="absolute right-3 top-1/2 transform -translate-y-1/2 text-gray-400 hover:text-gray-600"
                >
                  {showPassword ? <EyeOff className="w-5 h-5" /> : <Eye className="w-5 h-5" />}
                </button>
              </div>
              
              {/* Password Requirements */}
              <div className="mt-3 space-y-2">
                <p className="text-xs font-medium text-gray-700 mb-2">Password Requirements:</p>
                <div className="space-y-1">
                  <div className={`flex items-center text-xs ${passwordValidation.length ? 'text-green-600' : 'text-gray-500'}`}>
                    <div className={`w-2 h-2 rounded-full mr-2 ${passwordValidation.length ? 'bg-green-500' : 'bg-gray-300'}`}></div>
                    At least 8 characters long
                  </div>
                  <div className={`flex items-center text-xs ${passwordValidation.uppercase ? 'text-green-600' : 'text-gray-500'}`}>
                    <div className={`w-2 h-2 rounded-full mr-2 ${passwordValidation.uppercase ? 'bg-green-500' : 'bg-gray-300'}`}></div>
                    One uppercase letter (A-Z)
                  </div>
                  <div className={`flex items-center text-xs ${passwordValidation.lowercase ? 'text-green-600' : 'text-gray-500'}`}>
                    <div className={`w-2 h-2 rounded-full mr-2 ${passwordValidation.lowercase ? 'bg-green-500' : 'bg-gray-300'}`}></div>
                    One lowercase letter (a-z)
                  </div>
                  <div className={`flex items-center text-xs ${passwordValidation.number ? 'text-green-600' : 'text-gray-500'}`}>
                    <div className={`w-2 h-2 rounded-full mr-2 ${passwordValidation.number ? 'bg-green-500' : 'bg-gray-300'}`}></div>
                    One number (0-9)
                  </div>
                  <div className={`flex items-center text-xs ${passwordValidation.special ? 'text-green-600' : 'text-gray-500'}`}>
                    <div className={`w-2 h-2 rounded-full mr-2 ${passwordValidation.special ? 'bg-green-500' : 'bg-gray-300'}`}></div>
                    One special character (!@#$%^&*)
                  </div>
                </div>
              </div>
            </div>

            <div>
              <label htmlFor="confirmPassword" className="block text-sm font-medium text-gray-700 mb-2">
                Confirm New Password
              </label>
              <div className="relative">
                <input
                  id="confirmPassword"
                  type={showConfirmPassword ? 'text' : 'password'}
                  value={confirmPassword}
                  onChange={(e) => setConfirmPassword(e.target.value)}
                  className="w-full px-4 py-3 border border-gray-300 rounded-xl focus:ring-2 focus:ring-orange-500 focus:border-transparent transition-colors pr-12"
                  placeholder="Confirm your new password"
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

            <button
              type="submit"
              disabled={loading || !user || !validatePassword(password).isValid || password !== confirmPassword}
              className="w-full bg-orange-600 text-white py-3 px-4 rounded-xl hover:bg-orange-700 transition-colors font-semibold disabled:opacity-50 disabled:cursor-not-allowed"
            >
              {loading ? 'Updating Password...' : 'Update Password'}
            </button>
          </form>
        </div>

        {/* Footer */}
        <div className="text-center mt-8">
          <p className="text-sm text-gray-500">
            © 2024 FinalActrack. All rights reserved.
          </p>
        </div>
      </div>
    </div>
  )
}
