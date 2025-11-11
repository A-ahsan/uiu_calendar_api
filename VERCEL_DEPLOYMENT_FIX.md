# Vercel Deployment Fix

## Problem
The deployment was failing with `ERR_MODULE_NOT_FOUND` for Vite after 10 days due to:
1. Workspace configuration conflicts
2. Corrupted build cache
3. Missing Vite React plugin

## Solution Applied

### 1. Added `vercel.json` Configuration
- Skips root workspace install to avoid conflicts
- Installs only frontend dependencies
- Points to correct output directory

### 2. Updated Frontend Package
- Added `"type": "module"` for proper ESM support
- Updated Vite to latest stable version (5.3.5)
- Added missing `@vitejs/plugin-react` dependency

### 3. Created `vite.config.ts`
- Properly configures React plugin
- Sets correct build output directory

### 4. Added `.vercelignore`
- Excludes unnecessary Python files and logs
- Reduces upload size and build time

## Deployment Steps

### Option 1: Clear Cache and Redeploy (Recommended)
1. Go to your Vercel project settings
2. Navigate to "General" → "Build & Development Settings"
3. Enable "Ignore Build Cache" temporarily
4. Commit and push these changes
5. Vercel will automatically deploy with a fresh build

### Option 2: Manual Deploy
```bash
# Install Vercel CLI if not already installed
npm i -g vercel

# Deploy from project root
vercel --prod
```

### Option 3: Force Fresh Install Locally
```bash
# Test the build locally first
cd uiu-academic-calendar/frontend
rm -rf node_modules package-lock.json
npm install
npm run build
```

## Vercel Project Settings to Verify

1. **Root Directory**: Leave as `.` (project root)
2. **Framework Preset**: Other (or None)
3. **Build Command**: (will use vercel.json)
4. **Output Directory**: (will use vercel.json)
5. **Install Command**: (will use vercel.json)

## Environment Variables
Make sure any required environment variables are set in Vercel dashboard.

## Testing After Deployment
1. Check the deployment logs for successful build
2. Verify the site loads correctly
3. Check browser console for any errors

## If Issues Persist
1. Clear Vercel build cache in project settings
2. Delete the deployment and redeploy
3. Check Vercel logs for specific error messages
