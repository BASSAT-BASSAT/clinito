# Start All Services for CLINITO
# Run this script to start all required services

Write-Host "🚀 Starting CLINITO Services..." -ForegroundColor Cyan
Write-Host ""

# Check if Node.js is installed
if (-not (Get-Command node -ErrorAction SilentlyContinue)) {
    Write-Host "❌ Node.js is not installed!" -ForegroundColor Red
    exit 1
}

# Check if Python is installed
if (-not (Get-Command python -ErrorAction SilentlyContinue)) {
    Write-Host "❌ Python is not installed!" -ForegroundColor Red
    exit 1
}

$projectPath = "D:\clineto\New folder\clinito"

# Start Next.js (Terminal 1)
Write-Host "📦 Starting Next.js frontend..." -ForegroundColor Yellow
Start-Process powershell -ArgumentList "-NoExit", "-Command", "cd '$projectPath'; npm run dev"
Start-Sleep -Seconds 2

# Start Convex (Terminal 2)
Write-Host "🔷 Starting Convex backend..." -ForegroundColor Yellow
Start-Process powershell -ArgumentList "-NoExit", "-Command", "cd '$projectPath'; npx convex dev"
Start-Sleep -Seconds 2

# Start SAM3 Server (Terminal 3)
Write-Host "🤖 Starting SAM3 server..." -ForegroundColor Yellow
Start-Process powershell -ArgumentList "-NoExit", "-Command", "cd '$projectPath\sam3-server'; python main.py"
Start-Sleep -Seconds 2

Write-Host ""
Write-Host "✅ All services starting!" -ForegroundColor Green
Write-Host ""
Write-Host "📝 Services:" -ForegroundColor Cyan
Write-Host "  • Next.js: http://localhost:3000" -ForegroundColor White
Write-Host "  • Convex: Deploying functions..." -ForegroundColor White
Write-Host "  • SAM3: http://localhost:8000" -ForegroundColor White
Write-Host ""
Write-Host "⏳ Wait a few seconds for services to start..." -ForegroundColor Yellow
Write-Host "🌐 Then open: http://localhost:3000" -ForegroundColor Cyan
