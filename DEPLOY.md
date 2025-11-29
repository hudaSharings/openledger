# Deploying OpenLedger to Vercel

This guide will walk you through deploying your OpenLedger application to Vercel.

## Prerequisites

1. **Vercel Account**: Sign up at [vercel.com](https://vercel.com) (free tier available)
2. **GitHub/GitLab/Bitbucket Account**: Your code needs to be in a Git repository
3. **Neon PostgreSQL Database**: You'll need a Neon database URL (free tier available at [neon.tech](https://neon.tech))

## Step 1: Prepare Your Repository

1. **Initialize Git** (if not already done):
   ```bash
   git init
   git add .
   git commit -m "Initial commit"
   ```

2. **Push to GitHub/GitLab/Bitbucket**:
   - Create a new repository on GitHub
   - Push your code:
     ```bash
     git remote add origin https://github.com/yourusername/openledger.git
     git branch -M main
     git push -u origin main
     ```

## Step 2: Set Up Neon Database

1. **Create a Neon Account**:
   - Go to [neon.tech](https://neon.tech)
   - Sign up for a free account
   - Create a new project

2. **Get Your Database URL**:
   - Copy your connection string (it looks like: `postgresql://user:password@host/database?sslmode=require`)
   - Keep this secure - you'll need it for environment variables

3. **Run Database Migrations**:
   - You can run migrations locally first, or use Neon's SQL editor
   - Or run migrations after deployment using Vercel's CLI

## Step 3: Deploy to Vercel

### Option A: Deploy via Vercel Dashboard (Recommended)

1. **Import Project**:
   - Go to [vercel.com/dashboard](https://vercel.com/dashboard)
   - Click "Add New..." → "Project"
   - Import your Git repository

2. **Configure Project**:
   - **Framework Preset**: Next.js (auto-detected)
   - **Root Directory**: `./` (default)
   - **Build Command**: `npm run build` (default)
   - **Output Directory**: `.next` (default)
   - **Install Command**: `npm install` (default)

3. **Environment Variables** (CRITICAL - Must be set before first deployment):
   
   **⚠️ IMPORTANT**: You MUST set these environment variables in Vercel BEFORE deploying, otherwise the build will fail!
   
   Go to: **Project Settings → Environment Variables**
   
   Add these environment variables:
   - `DATABASE_URL`: Your Neon PostgreSQL connection string
     - Value: `postgresql://user:password@host/database?sslmode=require`
     - **Environment**: Production, Preview, Development (select all)
   
   - `NEXTAUTH_SECRET`: Generate a random secret (see below)
     - **Environment**: Production, Preview, Development (select all)
   
   - `NEXTAUTH_URL`: Your Vercel deployment URL
     - Value: `https://your-app.vercel.app` (or your custom domain)
     - **Environment**: Production, Preview, Development (select all)
     - Note: Vercel will auto-set this, but you can override if needed

   **Generate NEXTAUTH_SECRET**:
   ```bash
   # On Linux/Mac
   openssl rand -base64 32
   
   # On Windows PowerShell
   [Convert]::ToBase64String((1..32 | ForEach-Object { Get-Random -Minimum 0 -Maximum 256 }))
   ```
   
   **⚠️ CRITICAL**: After adding environment variables, you MUST:
   1. Save the environment variables
   2. Redeploy the project (or wait for automatic redeploy)
   3. The build will now succeed because DATABASE_URL is available

4. **Deploy**:
   - Click "Deploy"
   - Wait for the build to complete

### Option B: Deploy via Vercel CLI

1. **Install Vercel CLI**:
   ```bash
   npm i -g vercel
   ```

2. **Login to Vercel**:
   ```bash
   vercel login
   ```

3. **Deploy**:
   ```bash
   vercel
   ```

4. **Set Environment Variables**:
   ```bash
   vercel env add DATABASE_URL
   vercel env add NEXTAUTH_SECRET
   vercel env add NEXTAUTH_URL
   ```

5. **Deploy to Production**:
   ```bash
   vercel --prod
   ```

## Step 4: Run Database Migrations

After deployment, you need to set up your database schema:

### Option A: Using Vercel CLI

1. **Install dependencies locally** (if not already):
   ```bash
   npm install
   ```

2. **Run migrations**:
   ```bash
   npm run db:push
   ```

   Or generate and run migrations:
   ```bash
   npm run db:generate
   npm run db:migrate
   ```

### Option B: Using Neon SQL Editor

1. Go to your Neon dashboard
2. Open the SQL Editor
3. Run the SQL from your migration files (in `drizzle/` directory)

## Step 5: Seed Database (Optional)

If you want demo data:

1. **Set up local environment**:
   ```bash
   # Create .env.local with your DATABASE_URL
   echo "DATABASE_URL=your-neon-connection-string" > .env.local
   ```

2. **Run seed script**:
   ```bash
   npm run db:seed
   ```

## Step 6: Verify Deployment

1. **Visit your Vercel URL**: `https://your-app.vercel.app`
2. **Test Registration**: Create a new account
3. **Test Login**: Log in with your credentials
4. **Check Database**: Verify data is being saved correctly

## Important Notes

### Environment Variables

Make sure these are set in Vercel:
- `DATABASE_URL`: Your Neon PostgreSQL connection string
- `NEXTAUTH_SECRET`: A random secret string (32+ characters)
- `NEXTAUTH_URL`: Your production URL (Vercel will set this automatically, but you can override)

### Database Connection

- **Neon** provides serverless PostgreSQL that works well with Vercel
- Make sure your Neon database allows connections from Vercel's IPs
- Use SSL mode in your connection string: `?sslmode=require`

### Build Configuration

Vercel will automatically:
- Detect Next.js framework
- Run `npm install`
- Run `npm run build`
- Deploy the `.next` output

### Custom Build Settings

If needed, you can add a `vercel.json` file:

```json
{
  "buildCommand": "npm run build",
  "devCommand": "npm run dev",
  "installCommand": "npm install",
  "framework": "nextjs",
  "regions": ["iad1"]
}
```

## Troubleshooting

### Build Fails

1. **Check build logs** in Vercel dashboard
2. **Verify environment variables** are set correctly
3. **Check Node.js version** (should be 18+)
4. **Review error messages** in build output

### Database Connection Issues

1. **Verify DATABASE_URL** is correct
2. **Check Neon database** is running
3. **Verify SSL mode** is enabled in connection string
4. **Check firewall rules** in Neon dashboard

### Authentication Issues

1. **Verify NEXTAUTH_SECRET** is set
2. **Check NEXTAUTH_URL** matches your deployment URL
3. **Clear browser cookies** and try again

## Next Steps

After deployment:
1. Set up a custom domain (optional)
2. Enable Vercel Analytics (optional)
3. Set up monitoring and alerts
4. Configure automatic deployments from Git

## Support

- Vercel Docs: [vercel.com/docs](https://vercel.com/docs)
- Neon Docs: [neon.tech/docs](https://neon.tech/docs)
- Next.js Docs: [nextjs.org/docs](https://nextjs.org/docs)

