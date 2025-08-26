'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import Link from 'next/link'
import { useAuth } from '@/contexts/AuthContext'
import { ArrowLeft, Mail } from 'lucide-react'
import Image from 'next/image'

export default function ForgotPasswordPage() {
  const [email, setEmail] = useState('')
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')
  const [success, setSuccess] = useState(false)
  const { forgotPassword } = useAuth()
  const router = useRouter()

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setLoading(true)
    setError('')
    setSuccess(false)

    const { error } = await forgotPassword(email)
    
    if (error) {
      setError(error.message)
      setLoading(false)
    } else {
      setSuccess(true)
      setLoading(false)
    }
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-orange-50 to-white flex items-center justify-center p-4">
      <div className="w-full max-w-md">
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
          <h1 className="text-3xl font-bold text-gray-900 mb-2">Forgot Password?</h1>
          <p className="text-gray-600">No worries! Enter your email and we'll send you reset instructions.</p>
        </div>

        {/* Forgot Password Form */}
        <div className="bg-white rounded-2xl shadow-lg border border-gray-100 p-8">
          {success ? (
            <div className="text-center space-y-6">
              <div className="w-20 h-20 bg-green-100 rounded-full flex items-center justify-center mx-auto">
                <Mail className="w-10 h-10 text-green-600" />
              </div>
                             <div>
                 <h2 className="text-2xl font-bold text-gray-900 mb-2">Check Your Email</h2>
                 <p className="text-gray-600 mb-4">
                   We've sent password reset instructions to:
                 </p>
                 <p className="text-orange-600 font-semibold">{email}</p>
               </div>
              <div className="space-y-4">
                                 <p className="text-sm text-gray-500">
                   Didn't receive the email? Check your spam folder or try again.
                 </p>
                <button
                  onClick={() => {
                    setSuccess(false)
                    setEmail('')
                  }}
                  className="w-full bg-orange-600 text-white py-3 px-4 rounded-xl hover:bg-orange-700 transition-colors font-semibold"
                >
                  Send Another Email
                </button>
              </div>
            </div>
          ) : (
            <form onSubmit={handleSubmit} className="space-y-6">
              {error && (
                <div className="bg-red-50 border border-red-200 text-red-700 px-4 py-3 rounded-lg">
                  {error}
                </div>
              )}

              <div>
                <label htmlFor="email" className="block text-sm font-medium text-gray-700 mb-2">
                  Email Address
                </label>
                <input
                  id="email"
                  type="email"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  className="w-full px-4 py-3 border border-gray-300 rounded-xl focus:ring-2 focus:ring-orange-500 focus:border-transparent transition-colors"
                  placeholder="Enter your email address"
                  required
                />
              </div>

              <button
                type="submit"
                disabled={loading}
                className="w-full bg-orange-600 text-white py-3 px-4 rounded-xl hover:bg-orange-700 transition-colors font-semibold disabled:opacity-50 disabled:cursor-not-allowed"
              >
                {loading ? 'Sending...' : 'Send Reset Instructions'}
              </button>
            </form>
          )}

          <div className="mt-6 text-center">
            <Link 
              href="/login" 
              className="inline-flex items-center text-orange-500 hover:text-orange-600 font-semibold"
            >
              <ArrowLeft className="w-4 h-4 mr-2" />
              Back to Sign In
            </Link>
          </div>
        </div>

        {/* Footer */}
        <div className="text-center mt-8">
          <p className="text-sm text-gray-500">
            © 2025 Acetrack. All rights reserved.
          </p>
        </div>
      </div>
    </div>
  )
}
