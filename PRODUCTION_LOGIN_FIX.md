# Production Login Issue - Fix Guide

## Problem
Login works fine locally but fails in production (Vercel). After successful login, users stay on the login page instead of being redirected to the dashboard.

## Root Causes

### 1. **Cookie Configuration**
In production (HTTPS), NextAuth cookies require specific settings:
- `secure: true` - Required for HTTPS
- `sameSite: "lax"` - Required for proper cookie handling
- Proper cookie name with `__Secure-` prefix in production

### 2. **Environment Variables**
Critical environment variables must be set correctly in Vercel:
- `NEXTAUTH_URL` - Must match your production domain exactly
- `NEXTAUTH_SECRET` - Must be the same secret used for JWT signing

### 3. **Cookie Propagation Delay**
Production environments may need additional time for cookies to be set before redirect.

## Fixes Applied

### 1. Updated Auth Configuration (`src/lib/auth.ts`)
Added production-specific cookie settings:
```typescript
cookies: {
  sessionToken: {
    name: `${process.env.NODE_ENV === "production" ? "__Secure-" : ""}next-auth.session-token`,
    options: {
      httpOnly: true,
      sameSite: "lax",
      path: "/",
      secure: process.env.NODE_ENV === "production",
    },
  },
},
```

### 2. Updated Login Redirect (`src/app/login/page.tsx`)
- Increased delay for production environments (500ms vs 200ms)
- Uses `window.location.replace()` for hard redirect
- Detects HTTPS automatically for proper delay

## Required Vercel Environment Variables

### ⚠️ CRITICAL: Verify these are set in Vercel

1. **NEXTAUTH_URL**
   - Must be: `https://openledger1-pxbm.vercel.app` (or your actual domain)
   - **NOT** `http://localhost:3000`
   - Go to: Vercel Dashboard → Your Project → Settings → Environment Variables

2. **NEXTAUTH_SECRET**
   - Must be a secure random string (32+ characters)
   - Generate with: `openssl rand -base64 32`
   - **Must be the same value** across all environments if you're using the same database

3. **DATABASE_URL**
   - Your Neon PostgreSQL connection string
   - Should already be set

## How to Fix in Vercel

### Step 1: Check Environment Variables
1. Go to [Vercel Dashboard](https://vercel.com/dashboard)
2. Select your project: `openledger1-pxbm`
3. Go to **Settings** → **Environment Variables**
4. Verify these variables exist:

| Variable | Value Example | Required |
|----------|---------------|----------|
| `NEXTAUTH_URL` | `https://openledger1-pxbm.vercel.app` | ✅ Yes |
| `NEXTAUTH_SECRET` | `your-generated-secret-here` | ✅ Yes |
| `DATABASE_URL` | `postgresql://...` | ✅ Yes |

### Step 2: Update NEXTAUTH_URL
If `NEXTAUTH_URL` is missing or incorrect:
1. Click **Add New** or edit existing
2. Key: `NEXTAUTH_URL`
3. Value: `https://openledger1-pxbm.vercel.app` (your actual Vercel URL)
4. Environment: **Production** (and Preview if needed)
5. Click **Save**

### Step 3: Verify NEXTAUTH_SECRET
If `NEXTAUTH_SECRET` is missing or you want to regenerate:
1. Generate a new secret locally:
   ```bash
   openssl rand -base64 32
   ```
2. Copy the output
3. In Vercel, add/update `NEXTAUTH_SECRET` with the generated value
4. **Important**: If you change this, all existing sessions will be invalidated

### Step 4: Redeploy
After updating environment variables:
1. Go to **Deployments** tab
2. Click **Redeploy** on the latest deployment
3. Or push a new commit to trigger a new deployment

## Testing After Fix

1. **Clear Browser Cookies**
   - Open DevTools (F12)
   - Application → Cookies
   - Delete all cookies for your domain
   - Or use Incognito/Private mode

2. **Test Login**
   - Go to `https://openledger1-pxbm.vercel.app/login`
   - Enter credentials
   - Should redirect to dashboard after login

3. **Check Browser Console**
   - Open DevTools → Console
   - Look for any errors related to cookies or authentication

4. **Check Network Tab**
   - Open DevTools → Network
   - After login, check the `/api/auth/session` request
   - Should return user data, not `null`

## Common Issues

### Issue: Still redirecting to login after successful authentication
**Solution**: 
- Verify `NEXTAUTH_URL` matches your domain exactly (no trailing slash)
- Check that `NEXTAUTH_SECRET` is set
- Clear browser cookies and try again
- Check Vercel function logs for errors

### Issue: "Invalid credentials" even with correct password
**Solution**:
- Verify `DATABASE_URL` is correct
- Check database connection in Vercel logs
- Ensure user exists in database

### Issue: Cookie not being set
**Solution**:
- Verify `NEXTAUTH_URL` uses `https://` (not `http://`)
- Check browser console for cookie warnings
- Ensure domain matches exactly (no subdomain mismatches)

## Debugging

### Check Vercel Logs
1. Go to Vercel Dashboard → Your Project → **Logs**
2. Look for:
   - NextAuth errors
   - Database connection errors
   - Cookie-related warnings

### Check Browser Console
1. Open DevTools (F12)
2. Go to **Console** tab
3. Look for:
   - Authentication errors
   - Cookie warnings
   - CORS errors

### Check Network Requests
1. Open DevTools → **Network** tab
2. After login attempt, check:
   - `/api/auth/callback/credentials` - Should return 200
   - `/api/auth/session` - Should return user data
   - Cookie headers in response

## Additional Notes

- The cookie configuration now automatically detects production vs development
- Production uses `__Secure-` prefix for cookie name (required by browsers for secure cookies)
- `sameSite: "lax"` allows cookies to work with redirects
- `secure: true` in production ensures cookies only work over HTTPS

## Still Having Issues?

If login still doesn't work after following these steps:

1. **Verify all environment variables are set correctly**
2. **Check Vercel deployment logs for errors**
3. **Test with a fresh browser session (Incognito)**
4. **Verify the database connection is working**
5. **Check that the user exists in the database**

The code changes have been applied. The main issue is likely missing or incorrect environment variables in Vercel.

