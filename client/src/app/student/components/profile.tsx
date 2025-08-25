'use client'

import { useState, useRef } from 'react'
import { useAuth } from '@/contexts/AuthContext'
import { supabase } from '@/lib/supabase'
import { User, Camera, Upload, X, Crop, RotateCcw } from 'lucide-react'
import ReactCrop, { Crop as CropType, PixelCrop } from 'react-image-crop'
import 'react-image-crop/dist/ReactCrop.css'

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

interface ProfileProps {
  profile: UserProfile | null
  onProfileUpdate?: (updatedProfile: UserProfile) => void
}

export default function Profile({ profile, onProfileUpdate }: ProfileProps) {
  const { user } = useAuth()
  const [showProfileModal, setShowProfileModal] = useState(false)
  const [selectedImage, setSelectedImage] = useState<File | null>(null)
  const [imagePreview, setImagePreview] = useState<string | null>(null)
  const [uploadingImage, setUploadingImage] = useState(false)
  const [showSuccessModal, setShowSuccessModal] = useState(false)
  
  // Cropping states
  const [crop, setCrop] = useState<CropType>({
    unit: '%',
    width: 100,
    height: 100,
    x: 0,
    y: 0
  })
  const [completedCrop, setCompletedCrop] = useState<PixelCrop>()
  const [showCropModal, setShowCropModal] = useState(false)
  const [originalImage, setOriginalImage] = useState<string | null>(null)
  const imgRef = useRef<HTMLImageElement>(null)

  const handleImageUpload = async (file: File): Promise<string> => {
    return new Promise((resolve, reject) => {
      const cloudName = process.env.NEXT_PUBLIC_CLOUDINARY_CLOUD_NAME
      const uploadPreset = process.env.NEXT_PUBLIC_CLOUDINARY_UPLOAD_PRESET || 'user_profile'

      if (!cloudName) {
        reject(new Error('Cloudinary cloud name is not configured.'))
        return
      }

      console.log('Starting Cloudinary upload for file:', file.name, 'Size:', file.size)

      const formData = new FormData()
      formData.append('file', file)
      formData.append('upload_preset', uploadPreset)
      formData.append('cloud_name', cloudName)

      // Add timeout for mobile devices
      const controller = new AbortController()
      const timeoutId = setTimeout(() => controller.abort(), 30000) // 30 second timeout

      fetch(`https://api.cloudinary.com/v1_1/${cloudName}/image/upload`, {
        method: 'POST',
        body: formData,
        signal: controller.signal,
      })
        .then((response) => {
          console.log('Cloudinary response status:', response.status)
          if (!response.ok) {
            throw new Error(`Upload failed with status: ${response.status}`)
          }
          return response.json()
        })
        .then((data) => {
          clearTimeout(timeoutId)
          console.log('Cloudinary upload response:', data)
          if (data.secure_url) {
            resolve(data.secure_url)
          } else {
            reject(new Error('Upload failed: No secure URL returned'))
          }
        })
        .catch((error) => {
          clearTimeout(timeoutId)
          console.error('Cloudinary upload error:', error)
          if (error.name === 'AbortError') {
            reject(new Error('Upload timed out. Please check your internet connection and try again.'))
          } else {
            reject(error)
          }
        })
    })
  }

  const handleImageSelect = (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0]
    if (file) {
      console.log('File selected:', file.name, 'Type:', file.type, 'Size:', file.size)
      
      if (!file.type.startsWith('image/')) {
        alert('Please select an image file')
        return
      }
      
      if (file.size > 5 * 1024 * 1024) {
        alert('Image size should be less than 5MB')
        return
      }

      // For mobile devices, ensure the file is properly loaded
      if (file.size === 0) {
        alert('Selected file appears to be empty. Please try selecting the image again.')
        return
      }

      setSelectedImage(file)
      
      const reader = new FileReader()
      reader.onload = (e) => {
        const imageUrl = e.target?.result as string
        setOriginalImage(imageUrl)
        setImagePreview(imageUrl)
        setShowCropModal(true)
        console.log('Image preview loaded successfully')
      }
      reader.onerror = (e) => {
        console.error('Error reading file:', e)
        alert('Error reading the selected image. Please try again.')
      }
      reader.readAsDataURL(file)
    }
  }

  const handleSaveProfilePicture = async () => {
    if (!selectedImage || !user?.id) return

    // Check if user is still authenticated before starting upload
    const { data: { session } } = await supabase.auth.getSession()
    if (!session) {
      console.error('User not authenticated before upload')
      alert('Please sign in again to upload your profile picture.')
      return
    }

    setUploadingImage(true)
    try {
      console.log('Starting profile picture upload for user:', user.id)
      
      // Upload to Cloudinary
      const imageUrl = await handleImageUpload(selectedImage)
      console.log('Image uploaded to Cloudinary:', imageUrl)

      // Update profile in database
      const { error } = await supabase
        .from('user_profiles')
        .update({ avatar: imageUrl })
        .eq('id', user.id)

      if (error) {
        console.error('Error updating profile:', error)
        alert('Failed to update profile picture. Please try again.')
      } else {
        console.log('Profile picture updated successfully in database')
        
        // Verify user is still authenticated
        const { data: { session } } = await supabase.auth.getSession()
        if (!session) {
          console.error('User session lost after profile update')
          alert('Authentication error. Please sign in again.')
          return
        }
        
        // Update the profile state instead of reloading the page
        if (profile && onProfileUpdate) {
          const updatedProfile = { ...profile, avatar: imageUrl }
          onProfileUpdate(updatedProfile)
          console.log('Profile state updated locally')
        }
                 // Close the modal and reset states
         setShowProfileModal(false)
         resetImageStates()
         // Show success modal
         setShowSuccessModal(true)
      }
    } catch (error) {
      console.error('Error saving profile picture:', error)
      alert('Failed to save profile picture. Please try again.')
    } finally {
      setUploadingImage(false)
    }
  }

  const resetImageStates = () => {
    setSelectedImage(null)
    setImagePreview(null)
    setCrop({
      unit: '%',
      width: 100,
      height: 100,
      x: 0,
      y: 0
    })
    setCompletedCrop(undefined)
    setOriginalImage(null)
  }

  const getCroppedImg = (image: HTMLImageElement, crop: PixelCrop): Promise<Blob> => {
    const canvas = document.createElement('canvas')
    const ctx = canvas.getContext('2d')

    if (!ctx) {
      throw new Error('No 2d context')
    }

    const scaleX = image.naturalWidth / image.width
    const scaleY = image.naturalHeight / image.height

    canvas.width = crop.width
    canvas.height = crop.height

    ctx.drawImage(
      image,
      crop.x * scaleX,
      crop.y * scaleY,
      crop.width * scaleX,
      crop.height * scaleY,
      0,
      0,
      crop.width,
      crop.height
    )

    return new Promise((resolve) => {
      canvas.toBlob((blob) => {
        if (blob) {
          resolve(blob)
        }
      }, 'image/jpeg', 0.9)
    })
  }

  const handleCropComplete = (crop: PixelCrop) => {
    setCompletedCrop(crop)
  }

  const handleCropSave = async () => {
    if (!imgRef.current || !completedCrop) return

    try {
      const croppedBlob = await getCroppedImg(imgRef.current, completedCrop)
      const croppedFile = new File([croppedBlob], 'cropped-profile.jpg', { type: 'image/jpeg' })
      
      setSelectedImage(croppedFile)
      setImagePreview(URL.createObjectURL(croppedBlob))
      setShowCropModal(false)
    } catch (error) {
      console.error('Error cropping image:', error)
      alert('Error cropping image. Please try again.')
    }
  }

  const handleCropCancel = () => {
    setShowCropModal(false)
    setImagePreview(originalImage)
    setCrop({
      unit: '%',
      width: 100,
      height: 100,
      x: 0,
      y: 0
    })
    setCompletedCrop(undefined)
  }

  return (
    <div className="space-y-6 px-4 sm:px-0">
      {/* Header */}
      <div className="flex items-center justify-between">
        <h2 className="text-xl sm:text-2xl font-bold text-gray-900">My Profile</h2>
      </div>

      {/* Professional Profile Card - Mobile First Design */}
      <div className="bg-white rounded-2xl shadow-lg border border-gray-100 overflow-hidden">
        {/* Header Section */}
        <div className="bg-gradient-to-r from-orange-600 to-orange-700 px-4 sm:px-6 py-6">
          <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between space-y-4 sm:space-y-0">
            <div className="flex items-center space-x-4">
              <div className="w-16 h-16 sm:w-20 sm:h-20 bg-white/20 rounded-full flex items-center justify-center">
                <User className="w-8 h-8 sm:w-10 sm:h-10 text-white" />
              </div>
              <div>
                <h3 className="text-white font-bold text-lg sm:text-xl">Student Profile</h3>
                <p className="text-orange-100 text-sm sm:text-base">Acetrack ID</p>
              </div>
            </div>
            {/* <div className="text-center sm:text-right">
              <p className="text-orange-100 text-xs sm:text-sm">Valid for</p>
              <p className="text-white font-bold text-sm sm:text-base">2025-2026</p>
            </div> */}
          </div>
        </div>

        {/* Profile Content */}
        <div className="p-4 sm:p-6">
          <div className="flex flex-col sm:flex-row sm:items-start space-y-6 sm:space-y-0 sm:space-x-6">
            {/* Profile Picture Section */}
            <div className="flex flex-col items-center sm:items-start">
              <div className="relative">
                <div className="w-32 h-32 sm:w-28 sm:h-28 rounded-2xl overflow-hidden bg-gray-100 shadow-lg border-4 border-white">
                  {profile?.avatar ? (
                    <img 
                      src={profile.avatar} 
                      alt="Profile" 
                      className="w-full h-full object-cover"
                    />
                  ) : (
                    <div className="w-full h-full bg-gradient-to-br from-orange-100 to-orange-200 flex items-center justify-center">
                      <User className="w-16 h-16 sm:w-14 sm:h-14 text-orange-600" />
                    </div>
                  )}
                </div>
                <button
                  onClick={() => setShowProfileModal(true)}
                  className="absolute -bottom-2 -right-2 w-10 h-10 sm:w-9 sm:h-9 bg-orange-600 rounded-full flex items-center justify-center hover:bg-orange-700 transition-colors shadow-lg"
                >
                  <Camera className="w-5 h-5 sm:w-4 sm:h-4 text-white" />
                </button>
              </div>
              
              {/* Mobile: Profile Picture Label */}
              <div className="mt-3 sm:hidden text-center">
                <p className="text-xs text-gray-500">Tap camera icon to update</p>
              </div>
            </div>

            {/* Profile Details */}
            <div className="flex-1 space-y-4 sm:space-y-6">
              <div className="text-center sm:text-left">
                <h4 className="text-xl sm:text-2xl font-bold text-gray-900 mb-1">
                  {profile?.first_name} {profile?.middle_initial} {profile?.last_name}
                </h4>
                <p className="text-orange-600 font-semibold text-sm sm:text-base">Student</p>
              </div>

              {/* Professional Info Cards */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 sm:gap-4">
                <div className="bg-gray-50 rounded-xl p-4 border border-gray-100">
                  <label className="block text-xs font-bold text-gray-500 uppercase tracking-wider mb-2">Student ID</label>
                  <p className="text-gray-900 font-mono text-sm sm:text-base font-semibold">{profile?.student_id}</p>
                </div>
                <div className="bg-gray-50 rounded-xl p-4 border border-gray-100">
                  <label className="block text-xs font-bold text-gray-500 uppercase tracking-wider mb-2">Email</label>
                  <p className="text-gray-900 text-sm sm:text-base font-medium truncate">{user?.email}</p>
                </div>
                <div className="bg-gray-50 rounded-xl p-4 border border-gray-100">
                  <label className="block text-xs font-bold text-gray-500 uppercase tracking-wider mb-2">Year Level</label>
                  <p className="text-gray-900 font-semibold text-sm sm:text-base">{profile?.year_level}</p>
                </div>
                <div className="bg-gray-50 rounded-xl p-4 border border-gray-100">
                  <label className="block text-xs font-bold text-gray-500 uppercase tracking-wider mb-2">Course</label>
                  <p className="text-gray-900 font-semibold text-sm sm:text-base">{profile?.course?.course_name || 'Not specified'}</p>
                </div>
              </div>

              {/* Additional Professional Details */}
              <div className="bg-gradient-to-r from-orange-50 to-orange-100 rounded-xl p-4 border border-orange-200">
                <h5 className="text-sm font-bold text-orange-800 uppercase tracking-wider mb-2">Academic Status</h5>
                <div className="flex items-center justify-between">
                  <span className="text-orange-700 font-medium text-sm">Active Student</span>
                  <div className="w-3 h-3 bg-green-500 rounded-full"></div>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Profile Picture Edit Modal */}
      {showProfileModal && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-2 sm:p-4">
          <div className="bg-white rounded-xl shadow-xl max-w-2xl w-full max-h-[95vh] overflow-y-auto">
            {/* Modal Header */}
            <div className="flex items-center justify-between p-4 sm:p-6 border-b border-gray-200">
              <h3 className="text-lg sm:text-xl font-bold text-gray-900">Edit Profile Picture</h3>
              <button
                onClick={() => {
                  setShowProfileModal(false)
                  resetImageStates()
                }}
                className="text-gray-400 hover:text-gray-600 transition-colors p-1"
              >
                <X className="w-6 h-6" />
              </button>
            </div>

            {/* Modal Body */}
            <div className="p-4 sm:p-6 space-y-6">
              {!imagePreview ? (
                <div className="text-center">
                  <div className="border-2 border-dashed border-gray-300 rounded-lg p-8 hover:border-orange-400 transition-colors">
                    <input
                      type="file"
                      accept="image/*"
                      onChange={handleImageSelect}
                      className="hidden"
                      id="profile-image-upload"
                    />
                    <label
                      htmlFor="profile-image-upload"
                      className="cursor-pointer flex flex-col items-center space-y-4"
                    >
                      <Upload className="w-12 h-12 text-gray-400" />
                      <div>
                        <p className="text-lg text-gray-600">
                          Click to upload or drag and drop
                        </p>
                        <p className="text-sm text-gray-500">
                          PNG, JPG, GIF up to 5MB
                        </p>
                      </div>
                    </label>
                  </div>
                </div>
              ) : (
                <div className="space-y-4">
                  <div className="text-center">
                    <h4 className="text-sm font-medium text-gray-700 mb-2">Preview</h4>
                    <p className="text-xs text-gray-500 mb-4">Your image will be automatically cropped to fit a circle</p>
                  </div>
                  
                  <div className="flex justify-center">
                    <div className="w-32 h-32 rounded-full overflow-hidden border-2 border-gray-200">
                      <img
                        src={imagePreview}
                        alt="Profile preview"
                        className="w-full h-full object-cover"
                      />
                    </div>
                  </div>
                </div>
              )}
            </div>

            {/* Modal Footer */}
            <div className="flex flex-col sm:flex-row items-center justify-end space-y-3 sm:space-y-0 sm:space-x-3 p-4 sm:p-6 border-t border-gray-200">
              <button
                onClick={() => {
                  setShowProfileModal(false)
                  resetImageStates()
                }}
                className="w-full sm:w-auto px-4 py-3 sm:py-2 text-gray-700 bg-gray-100 rounded-lg hover:bg-gray-200 transition-colors"
                disabled={uploadingImage}
              >
                Cancel
              </button>
              <button
                onClick={handleSaveProfilePicture}
                disabled={!selectedImage || uploadingImage}
                className="w-full sm:w-auto px-4 py-3 sm:py-2 bg-orange-600 text-white rounded-lg hover:bg-orange-700 transition-colors disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center space-x-2"
              >
                {uploadingImage ? (
                  <>
                    <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white"></div>
                    <span>Uploading...</span>
                  </>
                ) : (
                  <span>Save Picture</span>
                )}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Crop Modal */}
      {showCropModal && originalImage && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-2 sm:p-4">
          <div className="bg-white rounded-lg shadow-xl w-full max-w-4xl mx-4 max-h-[95vh] flex flex-col">
            {/* Modal Header with Action Buttons */}
            <div className="flex items-center justify-between p-4 sm:p-6 border-b border-gray-200 flex-shrink-0">
              <h3 className="text-lg font-semibold text-gray-900">Crop Profile Picture</h3>
              <div className="flex items-center space-x-2">
                <button
                  onClick={() => {
                    setCrop({
                      unit: '%',
                      width: 100,
                      height: 100,
                      x: 0,
                      y: 0
                    })
                    setCompletedCrop(undefined)
                  }}
                  className="p-2 text-blue-600 hover:bg-blue-50 rounded-lg transition-colors"
                  title="Reset crop"
                >
                  <RotateCcw className="w-5 h-5" />
                </button>
                <button
                  onClick={handleCropSave}
                  disabled={!completedCrop}
                  className="p-2 text-green-600 hover:bg-green-50 rounded-lg transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
                  title="Apply crop"
                >
                  <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                  </svg>
                </button>
                <button
                  onClick={handleCropCancel}
                  className="p-2 text-gray-400 hover:text-gray-600 hover:bg-gray-50 rounded-lg transition-colors"
                  title="Cancel"
                >
                  <X className="w-5 h-5" />
                </button>
              </div>
            </div>

            {/* Modal Body */}
            <div className="p-4 sm:p-6 flex-1 overflow-y-auto">
              <div className="text-center mb-4">
                <p className="text-sm text-gray-600 mb-4">
                  Drag to adjust the crop area. The image will be cropped to a square for your profile picture.
                </p>
              </div>
              
              <div className="flex justify-center mb-4">
                <div className="max-w-full overflow-hidden rounded-lg border border-gray-200">
                  <ReactCrop
                    crop={crop}
                    onChange={(c) => setCrop(c)}
                    onComplete={handleCropComplete}
                    aspect={1}
                    circularCrop
                  >
                    <img
                      ref={imgRef}
                      src={originalImage}
                      alt="Crop preview"
                      className="max-w-full h-auto"
                      style={{ maxHeight: '50vh' }}
                    />
                  </ReactCrop>
                </div>
              </div>

              <div className="text-center">
                <p className="text-xs text-gray-500 mb-4">
                  Tip: Position your face in the center of the circle for the best result
                </p>
              </div>
            </div>
                     </div>
         </div>
       )}

       {/* Success Modal */}
       {showSuccessModal && (
         <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
           <div className="bg-white rounded-2xl shadow-xl max-w-md w-full mx-4">
             {/* Success Icon */}
             <div className="flex justify-center pt-8 pb-4">
               <div className="w-20 h-20 bg-green-100 rounded-full flex items-center justify-center">
                 <svg className="w-12 h-12 text-green-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                   <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                 </svg>
               </div>
             </div>

             {/* Success Content */}
             <div className="px-6 pb-6 text-center">
               <h3 className="text-xl font-bold text-gray-900 mb-2">
                 Profile Picture Updated!
               </h3>
               <p className="text-gray-600 mb-6">
                 Your profile picture has been successfully updated. The new image will be displayed in your profile and QR code.
               </p>

               {/* Action Button */}
               <button
                 onClick={() => setShowSuccessModal(false)}
                 className="w-full bg-green-600 hover:bg-green-700 text-white font-semibold py-3 px-6 rounded-xl transition-colors"
               >
                 Got it!
               </button>
             </div>
           </div>
         </div>
       )}
     </div>
   )
 }
