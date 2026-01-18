'use client'

import { Wrench, Clock } from 'lucide-react'

export default function MaintenancePage() {
  return (
    <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-orange-50 via-white to-orange-50">
      <div className="max-w-2xl mx-auto px-6 py-12 text-center">
        {/* Icon */}
        <div className="mb-8 flex justify-center">
          <div className="relative">
            <div className="absolute inset-0 bg-orange-200 rounded-full blur-2xl opacity-50 animate-pulse"></div>
            <div className="relative bg-gradient-to-br from-orange-500 to-orange-600 p-6 rounded-full shadow-2xl">
              <Wrench className="w-16 h-16 text-white" />
            </div>
          </div>
        </div>

        {/* Main Message */}
        <h1 className="text-5xl md:text-6xl font-bold text-gray-900 mb-4">
          ACETRACK
        </h1>
        <h2 className="text-3xl md:text-4xl font-semibold text-orange-600 mb-6">
          Under Maintenance
        </h2>

        {/* Description */}
        <p className="text-lg md:text-xl text-gray-600 mb-8 leading-relaxed">
          We're currently performing scheduled maintenance to improve your experience.
          <br />
          Please check back soon.
        </p>

        {/* Status Indicator */}
        <div className="flex items-center justify-center gap-2 text-gray-500 mb-12">
          <Clock className="w-5 h-5 animate-spin" />
          <span className="text-sm">We'll be back shortly</span>
        </div>

        {/* Decorative Elements */}
        <div className="flex justify-center gap-2">
          <div className="w-2 h-2 bg-orange-400 rounded-full animate-bounce" style={{ animationDelay: '0s' }}></div>
          <div className="w-2 h-2 bg-orange-500 rounded-full animate-bounce" style={{ animationDelay: '0.2s' }}></div>
          <div className="w-2 h-2 bg-orange-600 rounded-full animate-bounce" style={{ animationDelay: '0.4s' }}></div>
        </div>
      </div>
    </div>
  )
}

