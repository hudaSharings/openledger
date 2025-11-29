# Setup Environment File Script
# This script helps you create .env.local with your database connection

Write-Host "========================================" -ForegroundColor Cyan
Write-Host "OpenLedger Environment Setup" -ForegroundColor Cyan
Write-Host "========================================" -ForegroundColor Cyan
Write-Host ""

# Check if .env.local already exists
if (Test-Path ".env.local") {
    Write-Host "⚠️  .env.local already exists!" -ForegroundColor Yellow
    $overwrite = Read-Host "Do you want to overwrite it? (y/n)"
    if ($overwrite -ne "y") {
        Write-Host "Cancelled." -ForegroundColor Red
        exit
    }
}

Write-Host "Please provide the following information:" -ForegroundColor Green
Write-Host ""

# Get DATABASE_URL
$dbUrl = Read-Host "Enter your Neon Database URL (DATABASE_URL)"
if ([string]::IsNullOrWhiteSpace($dbUrl)) {
    Write-Host "❌ DATABASE_URL is required!" -ForegroundColor Red
    exit 1
}

# Generate or get NEXTAUTH_SECRET
Write-Host ""
Write-Host "Generating NEXTAUTH_SECRET..." -ForegroundColor Yellow
try {
    $secret = -join ((65..90) + (97..122) + (48..57) | Get-Random -Count 32 | ForEach-Object {[char]$_})
} catch {
    $secret = "change-this-secret-in-production-" + (Get-Random -Minimum 1000 -Maximum 9999)
}
Write-Host "✅ Generated secret: $secret" -ForegroundColor Green

# Get NEXTAUTH_URL
$nextAuthUrl = Read-Host "Enter NEXTAUTH_URL (default: http://localhost:3000)"
if ([string]::IsNullOrWhiteSpace($nextAuthUrl)) {
    $nextAuthUrl = "http://localhost:3000"
}

# Create .env.local file
$envContent = @"
# Database Connection
DATABASE_URL=$dbUrl

# NextAuth Configuration
NEXTAUTH_SECRET=$secret
NEXTAUTH_URL=$nextAuthUrl
"@

$envContent | Out-File -FilePath ".env.local" -Encoding utf8 -NoNewline

Write-Host ""
Write-Host "✅ Created .env.local file successfully!" -ForegroundColor Green
Write-Host ""
Write-Host "Next steps:" -ForegroundColor Cyan
Write-Host "1. Run: npm run db:push" -ForegroundColor White
Write-Host "2. Run: npm run db:seed" -ForegroundColor White
Write-Host "3. Run: npm run dev" -ForegroundColor White
Write-Host ""

