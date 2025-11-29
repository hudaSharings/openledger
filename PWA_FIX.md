# PWA Installation Fix for Production

## Problem
PWA install prompt is not showing in production deployment on Vercel.

## Root Causes

### 1. **Missing Icon Files**
The `manifest.json` references icon files that don't exist:
- `/icon-192.png` (192x192 pixels)
- `/icon-512.png` (512x512 pixels)

### 2. **PWA Configuration**
The PWA might not be properly configured for production builds.

### 3. **Service Worker Registration**
The service worker might not be properly registered in production.

## Fixes Applied

### 1. Updated `next.config.ts`
- Changed `disable: !isProduction` to `disable: process.env.NODE_ENV === "development"`
- Added explicit `sw: "sw.js"` configuration
- Added `scope: "/"` for proper PWA scope

### 2. Updated `src/app/layout.tsx`
- Enhanced icon metadata with proper sizes
- Added explicit manifest link in HTML head
- Added Apple-specific meta tags for iOS
- Added theme color meta tag

### 3. Updated `public/manifest.json`
- Added `prefer_related_applications: false` to ensure PWA is preferred

## Required Actions

### ⚠️ CRITICAL: Create Icon Files

You **must** create the following icon files in the `public` folder:

1. **`public/icon-192.png`**
   - Size: 192x192 pixels
   - Format: PNG
   - Purpose: App icon for Android and general use

2. **`public/icon-512.png`**
   - Size: 512x512 pixels
   - Format: PNG
   - Purpose: App icon for Android and splash screens

### How to Create Icons

#### Option 1: Use an Online Tool
1. Go to [PWA Asset Generator](https://www.pwabuilder.com/imageGenerator)
2. Upload your logo/icon (at least 512x512)
3. Download the generated icons
4. Place `icon-192.png` and `icon-512.png` in the `public` folder

#### Option 2: Use Image Editing Software
1. Create a square image (at least 512x512)
2. Design your app icon
3. Export as PNG:
   - Resize to 192x192 → save as `icon-192.png`
   - Resize to 512x512 → save as `icon-512.png`
4. Place both files in the `public` folder

#### Option 3: Use a Simple Placeholder (For Testing)
If you just want to test PWA functionality, you can create simple colored squares:

```bash
# Using ImageMagick (if installed)
magick -size 192x192 xc:#3b82f6 public/icon-192.png
magick -size 512x512 xc:#3b82f6 public/icon-512.png
```

Or create simple colored PNG files using any image editor.

## PWA Requirements Checklist

### ✅ Already Configured
- [x] `manifest.json` exists and is properly formatted
- [x] Service worker configuration in `next.config.ts`
- [x] PWA install prompt component
- [x] Meta tags for PWA in layout
- [x] HTTPS (Vercel provides this automatically)

### ⚠️ Needs Action
- [ ] Create `icon-192.png` (192x192 PNG)
- [ ] Create `icon-512.png` (512x512 PNG)

## Testing PWA in Production

### 1. Verify Manifest is Accessible
After deploying, check:
```
https://your-domain.vercel.app/manifest.json
```
Should return valid JSON.

### 2. Verify Icons are Accessible
Check:
```
https://your-domain.vercel.app/icon-192.png
https://your-domain.vercel.app/icon-512.png
```
Both should return valid PNG images.

### 3. Verify Service Worker
Open DevTools → Application → Service Workers
- Should see `sw.js` registered
- Status should be "activated and running"

### 4. Test Install Prompt
1. Open your production site on a mobile device or Chrome desktop
2. The install prompt should appear automatically (or via the install button)
3. On mobile: Look for "Add to Home Screen" option
4. On desktop: Look for install icon in address bar

## Browser Requirements

### Chrome/Edge (Desktop)
- Install icon appears in address bar
- Or use menu: "Install OpenLedger..."

### Chrome/Edge (Android)
- "Add to Home Screen" prompt appears
- Or use menu: "Add to Home screen"

### Safari (iOS)
- Share button → "Add to Home Screen"
- Requires iOS 11.3+

### Firefox
- Menu → "Install Site as App"

## Troubleshooting

### Issue: Install prompt doesn't appear
**Solutions:**
1. Verify icons exist and are accessible
2. Check manifest.json is valid (use [Manifest Validator](https://manifest-validator.appspot.com/))
3. Ensure site is served over HTTPS
4. Clear browser cache and try again
5. Check browser console for errors

### Issue: Service worker not registering
**Solutions:**
1. Check Vercel build logs for PWA compilation errors
2. Verify `sw.js` is generated in `public` folder after build
3. Check browser console for service worker errors
4. Ensure PWA is not disabled in `next.config.ts`

### Issue: Icons not loading
**Solutions:**
1. Verify icon files exist in `public` folder
2. Check file names match exactly (case-sensitive)
3. Verify icons are valid PNG files
4. Check file permissions

### Issue: PWA works locally but not in production
**Solutions:**
1. Verify `NODE_ENV=production` in Vercel
2. Check that icons are committed to git and deployed
3. Verify service worker is generated during build
4. Check Vercel build logs for PWA-related errors

## Deployment Checklist

Before deploying to production:

- [ ] Icon files created (`icon-192.png`, `icon-512.png`)
- [ ] Icons placed in `public` folder
- [ ] Icons committed to git
- [ ] `manifest.json` is valid
- [ ] Service worker is generated (check `public/sw.js` after build)
- [ ] Test locally with `npm run build && npm start`
- [ ] Verify PWA works in production after deployment

## Additional Notes

- PWA requires HTTPS (Vercel provides this automatically)
- Service worker is only generated in production builds
- The install prompt appears automatically when PWA criteria are met
- Users can dismiss the prompt; it may reappear later
- Once installed, the app runs in standalone mode (no browser UI)

## Quick Test

After creating icons and deploying:

1. Visit your production site
2. Open Chrome DevTools (F12)
3. Go to **Application** tab
4. Check:
   - **Manifest**: Should show your app details
   - **Service Workers**: Should show `sw.js` registered
   - **Icons**: Should display your icons

If all three are present, PWA should work!

