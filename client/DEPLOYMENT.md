# 🚀 Vercel Deployment Guide for FinalActrack

## Prerequisites

1. **GitHub Account** - Your code should be in a GitHub repository
2. **Vercel Account** - Sign up at [vercel.com](https://vercel.com)
3. **Supabase Project** - Your database should be set up
4. **Cloudinary Account** - For image uploads (optional)

## Step 1: Prepare Your Repository

Make sure your project structure looks like this:
```
finalactrack/
├── client/
│   ├── src/
│   ├── public/
│   ├── package.json
│   ├── next.config.ts
│   └── tailwind.config.ts
└── README.md
```

## Step 2: Environment Variables

You'll need to set these environment variables in Vercel:

### Required Variables:
```
NEXT_PUBLIC_SUPABASE_URL=your_supabase_project_url
NEXT_PUBLIC_SUPABASE_ANON_KEY=your_supabase_anon_key
```

### Optional Variables (for image uploads):
```
NEXT_PUBLIC_CLOUDINARY_CLOUD_NAME=your_cloudinary_cloud_name
CLOUDINARY_API_KEY=your_cloudinary_api_key
CLOUDINARY_API_SECRET=your_cloudinary_api_secret
```

## Step 3: Deploy to Vercel

### Method 1: Using Vercel Dashboard (Recommended)

1. **Push to GitHub**
   ```bash
   git add .
   git commit -m "Ready for deployment"
   git push origin main
   ```

2. **Connect to Vercel**
   - Go to [vercel.com](https://vercel.com)
   - Click "New Project"
   - Import your GitHub repository
   - Select the repository

3. **Configure Project**
   - **Framework Preset**: Next.js
   - **Root Directory**: `client` (if your Next.js app is in the client folder)
   - **Build Command**: `npm run build` (or `yarn build`)
   - **Output Directory**: `.next`
   - **Install Command**: `npm install` (or `yarn install`)

4. **Add Environment Variables**
   - Click "Environment Variables"
   - Add all the variables listed above
   - Make sure to add them to Production, Preview, and Development

5. **Deploy**
   - Click "Deploy"
   - Wait for the build to complete

### Method 2: Using Vercel CLI

1. **Install Vercel CLI**
   ```bash
   npm i -g vercel
   ```

2. **Login to Vercel**
   ```bash
   vercel login
   ```

3. **Deploy**
   ```bash
   cd client
   vercel
   ```

4. **Follow the prompts**
   - Link to existing project or create new
   - Set environment variables
   - Deploy

## Step 4: Configure Custom Domain (Optional)

1. Go to your Vercel project dashboard
2. Click "Settings" → "Domains"
3. Add your custom domain
4. Configure DNS settings as instructed

## Step 5: Post-Deployment Setup

### 1. Update Supabase Settings
- Go to your Supabase project dashboard
- Navigate to Settings → API
- Add your Vercel domain to "Additional Allowed Origins"

### 2. Test Your Application
- Test user registration
- Test login functionality
- Test QR code scanning
- Test image uploads (if using Cloudinary)

### 3. Monitor Performance
- Check Vercel Analytics
- Monitor function execution times
- Check for any errors in the logs

## Troubleshooting

### Common Issues:

1. **Build Errors**
   - Check that all dependencies are in `package.json`
   - Ensure TypeScript compilation passes
   - Check for missing environment variables

2. **Runtime Errors**
   - Check Vercel function logs
   - Verify environment variables are set correctly
   - Check Supabase connection

3. **Image Upload Issues**
   - Verify Cloudinary credentials
   - Check CORS settings
   - Ensure proper image domains in `next.config.ts`

### Useful Commands:

```bash
# Check build locally
npm run build

# Test production build
npm run start

# Check for TypeScript errors
npx tsc --noEmit

# Lint your code
npm run lint
```

## Environment Variables Reference

| Variable | Description | Required |
|----------|-------------|----------|
| `NEXT_PUBLIC_SUPABASE_URL` | Your Supabase project URL | ✅ |
| `NEXT_PUBLIC_SUPABASE_ANON_KEY` | Your Supabase anonymous key | ✅ |
| `NEXT_PUBLIC_CLOUDINARY_CLOUD_NAME` | Cloudinary cloud name | ❌ |
| `CLOUDINARY_API_KEY` | Cloudinary API key | ❌ |
| `CLOUDINARY_API_SECRET` | Cloudinary API secret | ❌ |

## Support

If you encounter issues:
1. Check Vercel deployment logs
2. Verify all environment variables are set
3. Test locally with production build
4. Check Supabase and Cloudinary dashboards for errors

## Next Steps

After successful deployment:
1. Set up monitoring and analytics
2. Configure automatic deployments from main branch
3. Set up staging environment
4. Implement CI/CD pipeline
