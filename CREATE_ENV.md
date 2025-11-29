# Create .env.local File

You need to create a `.env.local` file in the root directory with your Neon database connection.

## Quick Method

Run the setup script:
```powershell
.\setup-env.ps1
```

## Manual Method

Create a file named `.env.local` in the root directory with this content:

```env
DATABASE_URL=your_neon_database_url_here
NEXTAUTH_SECRET=your-random-secret-here
NEXTAUTH_URL=http://localhost:3000
```

### Where to get your Neon Database URL:

1. Go to your Neon dashboard
2. Select your project
3. Click on "Connection Details" or "Connection String"
4. Copy the connection string (it should look like: `postgresql://user:password@host/database?sslmode=require`)

### Generate NEXTAUTH_SECRET:

You can use any random string, or generate one:
```powershell
-join ((65..90) + (97..122) + (48..57) | Get-Random -Count 32 | ForEach-Object {[char]$_})
```

Or use an online generator, or just use a long random string.

## After Creating .env.local

1. **Push database schema:**
   ```bash
   npm run db:push
   ```

2. **Seed demo data:**
   ```bash
   npm run db:seed
   ```

3. **Start the app:**
   ```bash
   npm run dev
   ```

## Example .env.local

```env
DATABASE_URL=postgresql://user:password@ep-xxx-xxx.us-east-2.aws.neon.tech/dbname?sslmode=require
NEXTAUTH_SECRET=my-super-secret-key-12345
NEXTAUTH_URL=http://localhost:3000
```

**Important**: Never commit `.env.local` to git! It contains sensitive information.

