# PWA Setup Guide - Make App Installable

## ⚠️ CRITICAL: Create Icon Files

Your PWA requires icon files to be installable. The manifest references these files but they don't exist yet.

### Required Files:
1. **`public/icon-192.png`** - 192x192 pixels
2. **`public/icon-512.png`** - 512x512 pixels

### Quick Options to Create Icons:

#### Option 1: Use Online Tool (Recommended)
1. Go to [PWA Asset Generator](https://www.pwabuilder.com/imageGenerator)
2. Upload your logo (at least 512x512)
3. Download generated icons
4. Place `icon-192.png` and `icon-512.png` in the `public` folder

#### Option 2: Use Image Editor
1. Create a square image (512x512 minimum)
2. Design your app icon with "OL" or your logo
3. Export as PNG:
   - Resize to 192x192 → save as `public/icon-192.png`
   - Keep 512x512 → save as `public/icon-512.png`

#### Option 3: Use Script (Requires sharp package)
```bash
npm install sharp --save-dev
node scripts/create-icons.js
```

## Current PWA Configuration

✅ **Already Configured:**
- Service worker is registered (`next-pwa`)
- Manifest.json exists with proper configuration
- PWA install prompt component is ready
- Meta tags for iOS and Android
- Service worker caching strategy

✅ **What's Working:**
- Service worker generates on build
- Install prompt detects iOS vs Chrome/Edge
- Shows appropriate instructions for each platform
- Mobile-friendly install prompt UI

## Testing PWA Installation

### Chrome/Edge (Desktop & Android):
1. Visit your site
2. Look for install icon in address bar
3. Or wait for install prompt to appear
4. Click "Install App" button

### iOS Safari:
1. Visit your site in Safari
2. Tap Share button (□↗)
3. Select "Add to Home Screen"
4. Tap "Add"

### Verify Installation:
- Open DevTools → Application → Service Workers
- Should see `sw.js` registered and active
- Check Application → Manifest
- Verify icons are loaded

## After Creating Icons

1. **Place icons in `public` folder:**
   ```
   public/
     ├── icon-192.png
     ├── icon-512.png
     └── manifest.json
   ```

2. **Commit to git:**
   ```bash
   git add public/icon-*.png
   git commit -m "Add PWA icons"
   ```

3. **Deploy to Vercel:**
   - Icons will be included in deployment
   - PWA will be fully installable

## PWA Features Enabled

- ✅ Offline support (service worker caching)
- ✅ Install prompt (Chrome/Edge & iOS)
- ✅ Standalone mode (no browser UI when installed)
- ✅ App-like experience
- ✅ Fast loading (cached resources)

## Troubleshooting

**Install prompt doesn't appear:**
- Verify icons exist and are accessible
- Check site is served over HTTPS
- Clear browser cache
- Check browser console for errors

**Service worker not registering:**
- Verify `sw.js` exists in `public` after build
- Check browser console for errors
- Ensure PWA is enabled (not disabled in dev mode)

**Icons not showing:**
- Verify file names match exactly (case-sensitive)
- Check icons are valid PNG files
- Verify files are in `public` folder
- Check file permissions

