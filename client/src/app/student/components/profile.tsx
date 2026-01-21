'use client'

import { useState, useRef, useEffect, useCallback, useId } from 'react'
import { useAuth } from '@/contexts/AuthContext'
import { supabase, extractGoogleAvatar } from '@/lib/supabase'
import { User, Camera, Upload, X, RotateCcw, Edit, Save, CheckCircle } from 'lucide-react'
import ReactCrop, { Crop as CropType, PixelCrop } from 'react-image-crop'
import 'react-image-crop/dist/ReactCrop.css'

interface Course {
  id: number
  course_name: string
  short: string
}

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
  const uploadInputId = useId()
  const [showProfileModal, setShowProfileModal] = useState(false)
  const [selectedImage, setSelectedImage] = useState<File | null>(null)
  const [imagePreview, setImagePreview] = useState<string | null>(null)
  const [uploadingImage, setUploadingImage] = useState(false)
  const [showSuccessModal, setShowSuccessModal] = useState(false)
  const [displayAvatarUrl, setDisplayAvatarUrl] = useState<string | null>((profile?.avatar || extractGoogleAvatar(user)) ?? null)
  const previewObjectUrlRef = useRef<string | null>(null)
  
  // Edit mode states
  const [isEditing, setIsEditing] = useState(false)
  const [editingProfile, setEditingProfile] = useState<UserProfile | null>(null)
  const [savingProfile, setSavingProfile] = useState(false)
  const [courses, setCourses] = useState<Course[]>([])
  const [showEditSuccess, setShowEditSuccess] = useState(false)
  
  // Password confirmation states
  const [showPasswordModal, setShowPasswordModal] = useState(false)
  const [password, setPassword] = useState('')
  const [passwordError, setPasswordError] = useState('')
  const [verifyingPassword, setVerifyingPassword] = useState(false)
  
  // Cropping states
  const [crop, setCrop] = useState<CropType>({
    unit: '%',
    width: 80,
    height: 80,
    x: 10,
    y: 10
  })
  const [completedCrop, setCompletedCrop] = useState<PixelCrop>()
  const [isCropReady, setIsCropReady] = useState(false)
  const [showCropModal, setShowCropModal] = useState(false)
  const [originalImage, setOriginalImage] = useState<string | null>(null)
  const imgRef = useRef<HTMLImageElement>(null)
  const fileInputRef = useRef<HTMLInputElement>(null)

  const withTimeout = async <T,>(promise: PromiseLike<T>, ms: number, timeoutMessage: string): Promise<T> => {
    let timeoutId: ReturnType<typeof setTimeout> | undefined
    const timeoutPromise = new Promise<T>((_, reject) => {
      timeoutId = setTimeout(() => reject(new Error(timeoutMessage)), ms)
    })

    try {
      return await Promise.race([Promise.resolve(promise), timeoutPromise])
    } finally {
      if (timeoutId) clearTimeout(timeoutId)
    }
  }

  // Reset all state when component mounts or profile changes
  useEffect(() => {
    // Reset edit mode state when profile changes
    setIsEditing(false)
    setEditingProfile(null)
    setShowPasswordModal(false)
    setPassword('')
    setPasswordError('')
    setShowEditSuccess(false)
    setSavingProfile(false)
  }, [profile?.id]) // Reset when profile ID changes

  // Keep displayed avatar in sync with profile prop, but allow local immediate updates after upload.
  useEffect(() => {
    // Use profile avatar if available, otherwise fallback to Google profile picture
    const avatarUrl = profile?.avatar || extractGoogleAvatar(user)
    setDisplayAvatarUrl(avatarUrl ?? null)
  }, [profile?.avatar, profile?.id, user])

  // Fetch courses for dropdown
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

  // Initialize editing profile when entering edit mode
  useEffect(() => {
    if (isEditing && profile) {
      setEditingProfile({ ...profile })
    } else if (!isEditing) {
      setEditingProfile(null)
    }
  }, [isEditing, profile])

  const handleEditToggle = useCallback(() => {
    if (isEditing) {
      // Cancel editing
      setIsEditing(false)
      setEditingProfile(null)
      setShowPasswordModal(false)
      setPassword('')
      setPasswordError('')
    } else {
      // Start editing
      setIsEditing(true)
    }
  }, [isEditing])

  const handleEditInputChange = (field: keyof UserProfile, value: string | number) => {
    if (editingProfile) {
      setEditingProfile({
        ...editingProfile,
        [field]: value
      })
    }
  }

  const updateProfile = useCallback(async () => {
    if (!editingProfile || !user?.id) {
      console.warn('Cannot update: missing editingProfile or user')
      return
    }

    setSavingProfile(true)
    try {
      const { error } = await supabase
        .from('user_profiles')
        .update({
          first_name: editingProfile.first_name,
          middle_initial: editingProfile.middle_initial,
          last_name: editingProfile.last_name,
          course_id: editingProfile.course_id,
          year_level: editingProfile.year_level
        })
        .eq('id', user.id)

      if (error) {
        console.error('Error updating profile:', error)
        alert('Failed to update profile. Please try again.')
      } else {
        // Profile updated successfully
        
        // Update the profile state with new data including course info
        const updatedCourse = courses.find(c => c.id === editingProfile.course_id)
        const updatedProfile = {
          ...editingProfile,
          course: updatedCourse
        }
        
        if (onProfileUpdate) {
          onProfileUpdate(updatedProfile)
        }
        
        setIsEditing(false)
        setEditingProfile(null)
        setShowEditSuccess(true)
        
        // Hide success message after 3 seconds
        setTimeout(() => {
          setShowEditSuccess(false)
        }, 3000)
      }
    } catch (error) {
      console.error('Error saving profile:', error)
      alert('An unexpected error occurred. Please try again.')
    } finally {
      setSavingProfile(false)
    }
  }, [editingProfile, user?.id, courses, onProfileUpdate])

  const handleSaveProfile = useCallback(async () => {
    if (!editingProfile || !user?.id) {
      console.warn('Cannot save: missing editingProfile or user')
      return
    }

    // Show password modal instead of saving directly
    setShowPasswordModal(true)
  }, [editingProfile, user?.id])

  const handlePasswordVerification = useCallback(async () => {
    if (!password.trim()) {
      setPasswordError('Please enter your password')
      return
    }

    if (!user?.email) {
      setPasswordError('User email not found. Please refresh the page.')
      return
    }

    setVerifyingPassword(true)
    setPasswordError('')

    try {
      // Verify password by attempting to sign in
      const { error } = await supabase.auth.signInWithPassword({
        email: user.email,
        password: password
      })

      if (error) {
        setPasswordError('Incorrect password. Please try again.')
        setPassword('')
      } else {
        // Password is correct, proceed with profile update
        await updateProfile()
        setShowPasswordModal(false)
        setPassword('')
        setPasswordError('')
      }
    } catch (error) {
      console.error('Password verification error:', error)
      setPasswordError('An error occurred. Please try again.')
      setPassword('')
    } finally {
      setVerifyingPassword(false)
    }
  }, [password, user?.email, updateProfile])

  const handleImageUpload = async (file: File): Promise<string> => {
    return new Promise((resolve, reject) => {
      const cloudName = process.env.NEXT_PUBLIC_CLOUDINARY_CLOUD_NAME
      const uploadPreset = process.env.NEXT_PUBLIC_CLOUDINARY_UPLOAD_PRESET || 'user_profile'

      if (!cloudName) {
        reject(new Error('Cloudinary cloud name is not configured.'))
        return
      }

      // Starting Cloudinary upload

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
          // Cloudinary response received
          if (!response.ok) {
            throw new Error(`Upload failed with status: ${response.status}`)
          }
          return response.json()
        })
        .then((data) => {
          clearTimeout(timeoutId)
          // Cloudinary upload completed
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
    const input = event.target
    const file = input.files?.[0]
    // Reset the input so picking the same file again still triggers onChange
    input.value = ''
    if (file) {
      // File selected for upload
      
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
        setIsCropReady(false)
        // Image preview loaded successfully
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
      // Starting profile picture upload
      
      // Upload to Cloudinary
      const imageUrl = await withTimeout(
        handleImageUpload(selectedImage),
        45000,
        'Upload timed out. Please check your internet connection and try again.'
      )
      // Image uploaded to Cloudinary

      // Update profile in database
      const { error } = await withTimeout<{ data: unknown; error: unknown }>(
        supabase
          .from('user_profiles')
          .update({ avatar: imageUrl })
          .eq('id', user.id),
        20000,
        'Saving profile picture timed out. Please try again.'
      )

      if (error) {
        console.error('Error updating profile:', error)
        alert('Failed to update profile picture. Please try again.')
      } else {
        // Profile picture updated successfully in database
        
        // Verify user is still authenticated
        const { data: { session } } = await supabase.auth.getSession()
        if (!session) {
          console.error('User session lost after profile update')
          alert('Authentication error. Please sign in again.')
          return
        }
        
        // Force UI to show the new avatar immediately (cache-bust the displayed URL).
        // Keep the DB value clean (no cache-buster) by passing the original imageUrl to onProfileUpdate.
        const cacheBusted = `${imageUrl}${imageUrl.includes('?') ? '&' : '?'}v=${Date.now()}`
        setDisplayAvatarUrl(cacheBusted)

        if (profile && onProfileUpdate) {
          const updatedProfile = { ...profile, avatar: imageUrl }
          onProfileUpdate(updatedProfile)
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
    if (previewObjectUrlRef.current) {
      URL.revokeObjectURL(previewObjectUrlRef.current)
      previewObjectUrlRef.current = null
    }
    if (fileInputRef.current) {
      fileInputRef.current.value = ''
    }
    setCrop({
      unit: '%',
      width: 80,
      height: 80,
      x: 10,
      y: 10
    })
    setCompletedCrop(undefined)
    setIsCropReady(false)
    setOriginalImage(null)
  }

  const getPixelCropFromCrop = (image: HTMLImageElement, c: CropType): PixelCrop => {
    // ReactCrop gives us percent crops by default in this component; we need pixel values for canvas.
    if (c.unit === '%') {
      const x = (c.x / 100) * image.width
      const y = (c.y / 100) * image.height
      const width = (c.width / 100) * image.width
      const height = (c.height / 100) * image.height
      return {
        unit: 'px',
        x: Math.round(x),
        y: Math.round(y),
        width: Math.round(width),
        height: Math.round(height),
      }
    }

    // unit is 'px'
    return {
      unit: 'px',
      x: Math.round(c.x),
      y: Math.round(c.y),
      width: Math.round(c.width),
      height: Math.round(c.height),
    }
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
    if (!imgRef.current) return
    const effectiveCrop = completedCrop ?? getPixelCropFromCrop(imgRef.current, crop)

    try {
      const croppedBlob = await getCroppedImg(imgRef.current, effectiveCrop)
      const croppedFile = new File([croppedBlob], 'cropped-profile.jpg', { type: 'image/jpeg' })
      
      setSelectedImage(croppedFile)
      if (previewObjectUrlRef.current) URL.revokeObjectURL(previewObjectUrlRef.current)
      const objUrl = URL.createObjectURL(croppedBlob)
      previewObjectUrlRef.current = objUrl
      setImagePreview(objUrl)
      setShowCropModal(false)
    } catch (error) {
      console.error('Error cropping image:', error)
      alert('Error cropping image. Please try again.')
    }
  }

  // Allow user to skip cropping and use the original image
  const handleUseOriginalImage = () => {
    if (!originalImage || !selectedImage) return
    setImagePreview(originalImage)
    setShowCropModal(false)
  }

  const handleCropCancel = () => {
    setShowCropModal(false)
    setImagePreview(originalImage)
    setCrop({
      unit: '%',
      width: 80,
      height: 80,
      x: 10,
      y: 10
    })
    setCompletedCrop(undefined)
    setIsCropReady(false)
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <h2 className="text-xl sm:text-2xl font-bold text-gray-900">My Profile</h2>
        <button
          onClick={handleEditToggle}
          className="flex items-center space-x-2 px-4 py-2 bg-orange-600 text-white rounded-lg hover:bg-orange-700 transition-colors"
        >
          {isEditing ? (
            <>
              <X className="w-4 h-4" />
              <span>Cancel</span>
            </>
          ) : (
            <>
              <Edit className="w-4 h-4" />
              <span>Edit Profile</span>
            </>
          )}
        </button>
      </div>

      {/* Profile Content */}
      <div className="flex flex-col sm:flex-row sm:items-start space-y-6 sm:space-y-0 sm:space-x-6">
            {/* Profile Picture Section */}
            <div className="flex flex-col items-center sm:items-start">
              <div className="relative">
                <div className="w-32 h-32 sm:w-28 sm:h-28 rounded-2xl overflow-hidden bg-gray-100 shadow-lg border-4 border-white">
                  {displayAvatarUrl ? (
                    <img
                      src={displayAvatarUrl}
                      alt="Profile"
                      className="w-full h-full object-cover"
                      onError={() => setDisplayAvatarUrl(null)}
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
                {isEditing ? (
                  <div className="space-y-3">
                    <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                      <div>
                        <label className="block text-xs font-bold text-gray-500 uppercase tracking-wider mb-1">First Name</label>
                        <input
                          type="text"
                          value={editingProfile?.first_name || ''}
                          onChange={(e) => handleEditInputChange('first_name', e.target.value)}
                          className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-orange-500 focus:border-transparent"
                          placeholder="First Name"
                        />
                      </div>
                      <div>
                        <label className="block text-xs font-bold text-gray-500 uppercase tracking-wider mb-1">Middle Initial</label>
                        <input
                          type="text"
                          value={editingProfile?.middle_initial || ''}
                          onChange={(e) => handleEditInputChange('middle_initial', e.target.value)}
                          className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-orange-500 focus:border-transparent"
                          placeholder="M.I."
                          maxLength={1}
                        />
                      </div>
                      <div>
                        <label className="block text-xs font-bold text-gray-500 uppercase tracking-wider mb-1">Last Name</label>
                        <input
                          type="text"
                          value={editingProfile?.last_name || ''}
                          onChange={(e) => handleEditInputChange('last_name', e.target.value)}
                          className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-orange-500 focus:border-transparent"
                          placeholder="Last Name"
                        />
                      </div>
                    </div>
                  </div>
                ) : (
                  <h4 className="text-xl sm:text-2xl font-bold text-gray-900 mb-1">
                    {profile?.first_name} {profile?.middle_initial} {profile?.last_name}
                  </h4>
                )}
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
                  {isEditing ? (
                    <select
                      value={editingProfile?.year_level || ''}
                      onChange={(e) => handleEditInputChange('year_level', e.target.value)}
                      className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-orange-500 focus:border-transparent bg-white"
                    >
                      <option value="">Select Year Level</option>
                      <option value="1st Year">1st Year</option>
                      <option value="2nd Year">2nd Year</option>
                      <option value="3rd Year">3rd Year</option>
                      <option value="4th Year">4th Year</option>
                      <option value="5th Year">5th Year</option>
                    </select>
                  ) : (
                    <p className="text-gray-900 font-semibold text-sm sm:text-base">{profile?.year_level}</p>
                  )}
                </div>
                <div className="bg-gray-50 rounded-xl p-4 border border-gray-100">
                  <label className="block text-xs font-bold text-gray-500 uppercase tracking-wider mb-2">Course</label>
                  {isEditing ? (
                    <select
                      value={editingProfile?.course_id || ''}
                      onChange={(e) => handleEditInputChange('course_id', parseInt(e.target.value))}
                      className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-orange-500 focus:border-transparent bg-white"
                    >
                      <option value="">Select Course</option>
                      {courses.map((course) => (
                        <option key={course.id} value={course.id}>
                          {course.course_name}
                        </option>
                      ))}
                    </select>
                  ) : (
                    <p className="text-gray-900 font-semibold text-sm sm:text-base">{profile?.course?.course_name || 'Not specified'}</p>
                  )}
                </div>
              </div>

              {/* Save Button for Edit Mode */}
              {isEditing && (
                <div className="flex justify-end space-x-3">
                  <button
                    onClick={handleEditToggle}
                    className="px-4 py-2 text-gray-700 bg-gray-100 rounded-lg hover:bg-gray-200 transition-colors"
                    disabled={savingProfile}
                  >
                    Cancel
                  </button>
                  <button
                    onClick={handleSaveProfile}
                    disabled={savingProfile || !editingProfile?.first_name || !editingProfile?.last_name || !editingProfile?.course_id || !editingProfile?.year_level}
                    className="flex items-center space-x-2 px-4 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
                  >
                    {savingProfile ? (
                      <>
                        <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white"></div>
                        <span>Saving...</span>
                      </>
                    ) : (
                      <>
                        <Save className="w-4 h-4" />
                        <span>Save Changes</span>
                      </>
                    )}
                  </button>
                </div>
              )}

              {/* Additional Professional Details */}
              <div className="bg-gradient-to-r from-orange-50 to-orange-100 rounded-xl p-4 border border-orange-200">
                <h5 className="text-sm font-bold text-orange-800 uppercase tracking-wider mb-2">Academic Status</h5>
                <div className="flex items-center justify-between">
                  <span className="text-orange-700 font-medium text-sm">Active Student</span>
                  <div className="w-3 h-3 bg-green-500 rounded-full"></div>
                </div>
              </div>

                             {/* Developer Credit */}
               <div className="bg-gray-50 rounded-xl p-4 border border-gray-200 mt-6">
                 <div className="text-center">
                   <h5 className="text-sm font-bold text-gray-700 uppercase tracking-wider mb-3">Developer</h5>
                   <p className="text-gray-600 text-sm">
                     This website is created by <span className="font-semibold text-orange-600">Roberto Prisoris</span> using Next.js, Tailwind CSS, and Supabase
                   </p>
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
                      ref={fileInputRef}
                      // Avoid `display:none` on mobile Safari (can make label-click unreliable)
                      className="sr-only"
                      id={uploadInputId}
                    />
                    <label
                      htmlFor={uploadInputId}
                      className="cursor-pointer flex flex-col items-center space-y-4 select-none"
                    >
                      <Upload className="w-12 h-12 text-gray-400" />
                      <div>
                        <p className="text-lg text-gray-600">
                          Click to upload
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
                       width: 80,
                       height: 80,
                       x: 10,
                       y: 10
                     })
                     setCompletedCrop(undefined)
                   }}
                   className="p-2 text-blue-600 hover:bg-blue-50 rounded-lg transition-colors"
                   title="Reset crop"
                 >
                  <RotateCcw className="w-5 h-5" />
                </button>
                <button
                  onClick={handleUseOriginalImage}
                  className="px-3 py-2 text-gray-700 bg-gray-100 hover:bg-gray-200 rounded-lg transition-colors text-sm font-semibold"
                  title="Use original image (no crop)"
                >
                  Use Original
                </button>
                <button
                  onClick={handleCropSave}
                  disabled={!isCropReady}
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
                      onLoad={(e) => {
                        const img = e.currentTarget
                        const pixelCrop = getPixelCropFromCrop(img, crop)
                        setCompletedCrop(pixelCrop)
                        setIsCropReady(true)
                      }}
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

       {/* Profile Edit Success Modal */}
       {showEditSuccess && (
         <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
           <div className="bg-white rounded-2xl shadow-xl max-w-md w-full mx-4">
             {/* Success Icon */}
             <div className="flex justify-center pt-8 pb-4">
               <div className="w-20 h-20 bg-green-100 rounded-full flex items-center justify-center">
                 <CheckCircle className="w-12 h-12 text-green-600" />
               </div>
             </div>

             {/* Success Content */}
             <div className="px-6 pb-6 text-center">
               <h3 className="text-xl font-bold text-gray-900 mb-2">
                 Profile Updated Successfully!
               </h3>
               <p className="text-gray-600 mb-6">
                 Your profile information has been saved. The changes will be reflected in your profile and QR code.
               </p>

               {/* Action Button */}
               <button
                 onClick={() => setShowEditSuccess(false)}
                 className="w-full bg-green-600 hover:bg-green-700 text-white font-semibold py-3 px-6 rounded-xl transition-colors"
               >
                 Got it!
               </button>
             </div>
           </div>
         </div>
       )}

       {/* Password Confirmation Modal */}
       {showPasswordModal && (
         <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
           <div className="bg-white rounded-2xl shadow-xl max-w-md w-full mx-4">
             {/* Header */}
             <div className="flex justify-between items-center p-6 border-b border-gray-200">
               <h3 className="text-xl font-bold text-gray-900">
                 Confirm Password
               </h3>
               <button
                 onClick={() => {
                   setShowPasswordModal(false)
                   setPassword('')
                   setPasswordError('')
                 }}
                 className="text-gray-400 hover:text-gray-600 transition-colors"
               >
                 <X className="w-6 h-6" />
               </button>
             </div>

             {/* Content */}
             <div className="p-6">
               <p className="text-gray-600 mb-6">
                 Please enter your password to confirm the changes to your profile.
               </p>

               {passwordError && (
                 <div className="bg-red-50 border border-red-200 text-red-700 px-4 py-3 rounded-lg mb-4">
                   {passwordError}
                 </div>
               )}

               <div className="mb-6">
                 <label htmlFor="password" className="block text-sm font-medium text-gray-700 mb-2">
                   Password
                 </label>
                 <input
                   id="password"
                   type="password"
                   value={password}
                   onChange={(e) => setPassword(e.target.value)}
                   onKeyPress={(e) => {
                     if (e.key === 'Enter') {
                       handlePasswordVerification()
                     }
                   }}
                   className="w-full px-4 py-3 border border-gray-300 rounded-xl focus:ring-2 focus:ring-orange-500 focus:border-transparent transition-colors"
                   placeholder="Enter your password"
                   disabled={verifyingPassword}
                 />
               </div>

               {/* Action Buttons */}
               <div className="flex space-x-3">
                 <button
                   onClick={() => {
                     setShowPasswordModal(false)
                     setPassword('')
                     setPasswordError('')
                   }}
                   className="flex-1 bg-gray-100 hover:bg-gray-200 text-gray-700 font-semibold py-3 px-4 rounded-xl transition-colors"
                   disabled={verifyingPassword}
                 >
                   Cancel
                 </button>
                 <button
                   onClick={handlePasswordVerification}
                   disabled={verifyingPassword || !password.trim()}
                   className="flex-1 bg-orange-600 hover:bg-orange-700 text-white font-semibold py-3 px-4 rounded-xl transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
                 >
                   {verifyingPassword ? 'Verifying...' : 'Confirm Changes'}
                 </button>
               </div>
             </div>
           </div>
         </div>
       )}
     </div>
   )
 }
