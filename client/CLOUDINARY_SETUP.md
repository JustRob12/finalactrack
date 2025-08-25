# Cloudinary Setup Guide

## Step 1: Create a Cloudinary Account
1. Go to [Cloudinary](https://cloudinary.com/) and sign up for a free account
2. Verify your email address

## Step 2: Get Your Cloudinary Credentials
1. Log in to your Cloudinary dashboard
2. Go to the "Dashboard" section
3. Copy your credentials:
   - **Cloud Name** (e.g., `your_cloud_name`)
   - **API Key** (e.g., `123456789012345`)
   - **API Secret** (e.g., `abcdefghijklmnopqrstuvwxyz`)

## Step 3: Create Upload Preset
1. In your Cloudinary dashboard, go to "Settings" → "Upload"
2. Scroll down to "Upload presets"
3. Click "Add upload preset"
4. Set the following:
   - **Preset name**: `ml_default` (or any name you prefer)
   - **Signing Mode**: `Unsigned`
   - **Folder**: `events` (optional, for organization)
5. Click "Save"

## Step 4: Set Environment Variables
Create a `.env.local` file in your `client` directory with the following variables:

```env
# Cloudinary Configuration
NEXT_PUBLIC_CLOUDINARY_CLOUD_NAME=your_cloud_name
NEXT_PUBLIC_CLOUDINARY_API_KEY=your_api_key
NEXT_PUBLIC_CLOUDINARY_UPLOAD_PRESET=ml_default
CLOUDINARY_API_SECRET=your_api_secret
```

**Important Notes:**
- Replace `your_cloud_name`, `your_api_key`, and `your_api_secret` with your actual Cloudinary credentials
- The `NEXT_PUBLIC_` prefix makes these variables available in the browser
- Keep your API secret secure and never expose it in client-side code
- The upload preset should match what you created in Step 3

## Step 5: Test the Upload
1. Start your development server: `npm run dev`
2. Go to the admin dashboard
3. Click "Add Event"
4. Try uploading an image in the banner section
5. The image should upload to Cloudinary and the URL should be saved in your database

## Troubleshooting
- **Upload fails**: Check that your cloud name and upload preset are correct
- **CORS errors**: Make sure your upload preset is set to "Unsigned"
- **File size errors**: Images are limited to 5MB in the current implementation
- **File type errors**: Only image files (PNG, JPG, GIF) are accepted

## Security Best Practices
- Use unsigned uploads for client-side uploads
- Set appropriate file size and type restrictions
- Consider using signed uploads for more security (requires server-side implementation)
- Regularly rotate your API keys
