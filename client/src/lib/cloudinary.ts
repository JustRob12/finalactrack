// Function to upload image from URL to Cloudinary (for Google profile pictures)
export const uploadImageFromUrlToCloudinary = async (imageUrl: string): Promise<string> => {
  try {
    // Fetch the image from the URL
    const response = await fetch(imageUrl)
    if (!response.ok) {
      throw new Error(`Failed to fetch image: ${response.status}`)
    }

    // Convert to blob
    const blob = await response.blob()

    // Create a File object from the blob
    const file = new File([blob], 'google-profile.jpg', { type: 'image/jpeg' })

    // Upload to Cloudinary
    return await uploadImageToCloudinary(file)
  } catch (error) {
    console.error('Error uploading image from URL:', error)
    throw error
  }
}

// Function to upload image to Cloudinary
export const uploadImageToCloudinary = async (file: File): Promise<string> => {
  return new Promise((resolve, reject) => {
    const formData = new FormData()
    formData.append('file', file)
    formData.append('upload_preset', process.env.NEXT_PUBLIC_CLOUDINARY_UPLOAD_PRESET || 'ml_default')
    formData.append('cloud_name', process.env.NEXT_PUBLIC_CLOUDINARY_CLOUD_NAME || '')

    // Add quality preservation parameters
    formData.append('quality', 'auto')
    formData.append('format', 'auto')

    fetch(`https://api.cloudinary.com/v1_1/${process.env.NEXT_PUBLIC_CLOUDINARY_CLOUD_NAME}/image/upload`, {
      method: 'POST',
      body: formData,
    })
      .then((response) => response.json())
      .then((data) => {
        if (data.secure_url) {
          resolve(data.secure_url)
        } else {
          reject(new Error('Upload failed'))
        }
      })
      .catch((error) => {
        reject(error)
      })
  })
}
