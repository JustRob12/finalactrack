'use client'

import { useSearchParams } from 'next/navigation'
import { Suspense } from 'react'

function ErrorContent() {
  const searchParams = useSearchParams()
  const error = searchParams.get('error')

  return (
    <div className="min-h-screen bg-linear-to-br from-orange-50 to-white flex items-center justify-center p-4">
      <div className="max-w-md w-full bg-white rounded-xl shadow-lg p-8 text-center">
        <div className="w-16 h-16 bg-red-100 rounded-full flex items-center justify-center mx-auto mb-4">
          <svg className="w-8 h-8 text-red-600" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
          </svg>
        </div>
        
        <h1 className="text-2xl font-bold text-gray-900 mb-2">
          Authentication Error
        </h1>
        
        <p className="text-gray-600 mb-4">
          There was an error during the authentication process.
        </p>

        {error && (
          <div className="bg-gray-50 rounded-lg p-4 mb-4 text-left">
            <p className="text-sm font-medium text-gray-700 mb-1">Error Details:</p>
            <p className="text-sm text-gray-600 font-mono break-all">{decodeURIComponent(error)}</p>
          </div>
        )}

        <div className="space-y-2 text-sm text-gray-600 mb-6">
          <p>Possible causes:</p>
          <ul className="list-disc list-inside text-left">
            <li>Redirect URL not configured in Supabase</li>
            <li>Google OAuth not enabled in Supabase</li>
            <li>Invalid OAuth credentials</li>
          </ul>
        </div>

        <a
          href="/login"
          className="inline-block bg-orange-500 hover:bg-orange-600 text-white font-semibold py-2 px-6 rounded-lg transition-colors"
        >
          Back to Login
        </a>
      </div>
    </div>
  )
}

export default function AuthCodeErrorPage() {
  return (
    <Suspense fallback={
      <div className="min-h-screen bg-gradient-to-br from-orange-50 to-white flex items-center justify-center">
        <div className="text-center">
          <div className="inline-block animate-spin rounded-full h-12 w-12 border-4 border-orange-500 border-t-transparent"></div>
        </div>
      </div>
    }>
      <ErrorContent />
    </Suspense>
  )
}
