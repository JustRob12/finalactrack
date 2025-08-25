'use client'

import { useState, useEffect, useRef } from 'react'
import { useAuth } from '@/contexts/AuthContext'
import { QrCode, User, Download } from 'lucide-react'
import QRCode from 'qrcode'
import html2canvas from 'html2canvas'

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

interface QRCodeProps {
  profile: UserProfile | null
}

export default function QRCodeComponent({ profile }: QRCodeProps) {
  const { user } = useAuth()
  const [qrCodeUrl, setQrCodeUrl] = useState<string | null>(null)
  const [qrCodeLoading, setQrCodeLoading] = useState(false)
  const idCardRef = useRef<HTMLDivElement>(null)

  useEffect(() => {
    if (profile && user) {
      generateQRCode()
    }
  }, [profile, user])

  const generateQRCode = async () => {
    if (!profile || !user) return

    setQrCodeLoading(true)
    try {
      const userData = {
        id: user.id,
        student_id: profile.student_id,
        first_name: profile.first_name,
        middle_initial: profile.middle_initial,
        last_name: profile.last_name,
        email: user.email,
        year_level: profile.year_level,
        course: profile.course?.course_name,
        avatar: profile.avatar,
        timestamp: new Date().toISOString()
      }

      const qrData = JSON.stringify(userData)
      const qrCodeUrl = await QRCode.toDataURL(qrData, {
        width: 300,
        margin: 2,
        color: {
          dark: '#000000',
          light: '#FFFFFF'
        }
      })

      setQrCodeUrl(qrCodeUrl)
    } catch (error) {
      console.error('Error generating QR code:', error)
    } finally {
      setQrCodeLoading(false)
    }
  }

  const downloadQRCode = () => {
    if (!qrCodeUrl) return

    const link = document.createElement('a')
    link.href = qrCodeUrl
    link.download = `${profile?.student_id || 'student'}-qr-code.png`
    document.body.appendChild(link)
    link.click()
    document.body.removeChild(link)
  }

  const downloadIDCard = async () => {
    if (!idCardRef.current) return

    try {
      const canvas = await html2canvas(idCardRef.current, {
        backgroundColor: null,
        scale: 2,
        useCORS: true,
        allowTaint: true
      })
      
      const link = document.createElement('a')
      link.href = canvas.toDataURL('image/png')
      link.download = `${profile?.student_id || 'student'}-id-card.png`
      document.body.appendChild(link)
      link.click()
      document.body.removeChild(link)
    } catch (error) {
      console.error('Error downloading ID card:', error)
      alert('Failed to download ID card. Please try again.')
    }
  }

  return (
    <div className="py-6">
      {/* Check if user has profile picture */}
      {!profile?.avatar ? (
        <div className="text-center space-y-6">
          <div className="w-32 h-32 bg-gray-200 rounded-full mx-auto flex items-center justify-center">
            <User className="w-16 h-16 text-gray-400" />
          </div>
          <div className="max-w-md mx-auto">
            <h2 className="text-2xl font-semibold text-gray-900 mb-4">Profile Picture Required</h2>
            <p className="text-gray-600 mb-6">
              You need to add a profile picture before you can generate your QR code and ID card. 
              This helps ensure proper identification during attendance scanning.
            </p>
            <div className="bg-orange-50 border border-orange-200 rounded-lg p-4">
              <p className="text-sm text-orange-800">
                <strong>Please:</strong> Go to your Profile tab and upload a profile picture to continue.
              </p>
            </div>
          </div>
        </div>
      ) : qrCodeLoading ? (
        <div className="text-center space-y-4">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-orange-600 mx-auto"></div>
          <p className="text-gray-600">Generating ID Card...</p>
        </div>
      ) : qrCodeUrl ? (
        <div className="flex flex-col items-center space-y-4">
          {/* Download ID Card Button */}
          <button
            onClick={downloadIDCard}
            className="px-6 py-3 bg-orange-600 hover:bg-orange-700 text-white rounded-lg font-semibold transition-colors shadow-lg flex items-center space-x-2"
          >
            <Download className="w-5 h-5" />
            <span>Download ID Card</span>
          </button>

          {/* Standard ID Card Size: 3.5" x 5" (350px x 500px) */}
          <div 
            ref={idCardRef}
            className="w-[350px] h-[500px] rounded-xl shadow-2xl border-2 border-orange-300 overflow-hidden relative"
            style={{
              backgroundImage: 'url(/images/id-card-bg.png)',
              backgroundSize: 'cover',
              backgroundPosition: 'center'
            }}
          >
            {/* Bokeh Background Effect */}
            <div className="absolute inset-0 opacity-20">
              <div className="absolute top-10 left-10 w-8 h-8 bg-white/30 rounded-full"></div>
              <div className="absolute top-20 right-16 w-6 h-6 bg-white/20 rounded-full"></div>
              <div className="absolute top-32 left-20 w-4 h-4 bg-white/40 rounded-full"></div>
              <div className="absolute top-40 right-8 w-10 h-10 bg-white/25 rounded-full"></div>
              <div className="absolute top-60 left-12 w-6 h-6 bg-white/30 rounded-full"></div>
              <div className="absolute top-80 right-20 w-8 h-8 bg-white/20 rounded-full"></div>
              <div className="absolute top-96 left-8 w-5 h-5 bg-white/35 rounded-full"></div>
              <div className="absolute top-80 left-32 w-7 h-7 bg-white/25 rounded-full"></div>
            </div>

            {/* Header Section with Logos */}
            <div className="relative z-10 px-4 py-3">
              <div className="flex items-center justify-between">
                {/* Left Logo - Faculty of Computing */}
                <div className="w-16 h-16 rounded-full flex items-center justify-center border-2 border-white shadow-lg overflow-hidden">
                  <img 
                    src="/images/faculty-logo.png" 
                    alt="Faculty Logo" 
                    className="w-full h-full object-cover"
                  />
                </div>

                {/* Center Branding */}
                <div className="text-center">
                  <img 
                    src="/images/acetrack-font.png" 
                    alt="ACETRACK" 
                    className="h-8 w-auto mx-auto"
                  />
                </div>

                {/* Right Logo - ACES */}
                <div className="w-16 h-16 rounded-full flex items-center justify-center border-2 border-white shadow-lg overflow-hidden">
                  <img 
                    src="/images/aces-logo.png" 
                    alt="ACES Logo" 
                    className="w-full h-full object-cover"
                  />
                </div>
              </div>
            </div>

            {/* Card Content - Portrait Layout */}
            <div className="relative p- flex flex-col items-center h-full">
              {/* Profile Picture - Top Center with Sign */}
              <div className="text-center mb-4">
                <div className="relative inline-block">
                  {/* Profile Picture */}
                  <div className="w-32 h-32 rounded-full overflow-hidden bg-white shadow-lg border-4 border-white">
                    {profile?.avatar ? (
                      <img 
                        src={profile.avatar} 
                        alt="Profile" 
                        className="w-full h-full object-cover"
                      />
                    ) : (
                      <div className="w-full h-full bg-gradient-to-br from-orange-100 to-orange-200 flex items-center justify-center">
                        <User className="w-16 h-16 text-orange-600" />
                      </div>
                    )}
                  </div>
                  
                  {/* QR Code Sign */}
                  <div className="absolute -top-2 -right-2 bg-orange-600 text-white text-xs font-bold px-2 py-1 rounded-full shadow-lg border-2 border-white">
                    QR
                  </div>
                </div>
                
                {/* Profile Picture Label */}
                <div className="mt-2">
                  <p className="text-xs text-white font-semibold tracking-wide">
                    PROFILE PICTURE
                  </p>
                </div>
              </div>

              

                             {/* Name - Below Picture */}
               <div className="text-center mb-2">
                 <h4 className="text-lg font-bold text-orange-600 mb-1 tracking-wide">
                   {profile?.first_name?.toUpperCase()} {profile?.middle_initial?.toUpperCase()} {profile?.last_name?.toUpperCase()}
                 </h4>
               </div>

      

               {/* Course - Below Student ID */}
               <div className="text-center mb-2">
                 <p className="text-base font-bold text-orange-600 tracking-wider">
                   {profile?.course?.short || profile?.course?.course_name?.toUpperCase() || 'BSIT' }
                 </p>
               </div>

                             {/* QR Code - Bottom */}
               <div className="text-center">
                 {/* QR Code Label */}
                 <div className="mb-2">
                   <p className="text-xs text-white font-semibold tracking-wide">
                     SCAN QR CODE
                   </p>
                 </div>
                 
                 <div className="bg-white rounded-lg p-4 shadow-lg border-1 border-white">
                    <img 
                      src={qrCodeUrl} 
                      alt="QR Code" 
                      className="w-36 h-36 mx-auto"
                    />
                  </div>
                 
                 {/* Student ID - Below QR Code */}
                 <div className="text-center mt-2">
                   <p className="text-sm text-white tracking-wider">
                     {profile?.student_id}
                   </p>
                 </div>
               </div>
            </div>
          </div>
        </div>
      ) : (
        <div className="text-center space-y-4">
          <div className="w-64 h-64 bg-gray-200 rounded-lg mx-auto mb-6 flex items-center justify-center">
            <QrCode className="w-32 h-32 text-gray-400" />
          </div>
          <h2 className="text-2xl font-semibold text-gray-900 mb-2">QR Code</h2>
          <p className="text-gray-600">Unable to generate QR code. Please try again.</p>
        </div>
      )
    }
    </div>
  )
}
