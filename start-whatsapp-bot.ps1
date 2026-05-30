# WhatsApp Bot Startup Script for Windows
# Run this script as Administrator to set up PM2 as a Windows service

Write-Host "=== WhatsApp Bot PM2 Setup ===" -ForegroundColor Cyan

# Step 1: Install pm2 globally if not present
Write-Host "`n[1/4] Checking PM2 installation..." -ForegroundColor Yellow
$pm2Check = Get-Command pm2 -ErrorAction SilentlyContinue
if (-not $pm2Check) {
    Write-Host "PM2 not found. Installing globally..." -ForegroundColor Yellow
    npm install -g pm2
} else {
    Write-Host "PM2 already installed: $($pm2Check.Source)" -ForegroundColor Green
}

# Step 2: Install pm2-windows-startup for auto-start on boot
Write-Host "`n[2/4] Installing pm2-windows-startup for boot persistence..." -ForegroundColor Yellow
npm install -g pm2-windows-startup
pm2-startup install

# Step 3: Stop any existing whatsapp-bot instance and start fresh
Write-Host "`n[3/4] Starting WhatsApp bot with PM2..." -ForegroundColor Yellow
Set-Location "C:\Users\prash\.gemini\antigravity\scratch\atul-residency"

# Create logs dir if not exists
New-Item -ItemType Directory -Force -Path "logs" | Out-Null

pm2 delete whatsapp-bot 2>$null  # Delete old instance if it exists
pm2 start ecosystem.config.js

# Step 4: Save PM2 process list so it survives reboots
Write-Host "`n[4/4] Saving PM2 process list for auto-restart on reboot..." -ForegroundColor Yellow
pm2 save

Write-Host "`n=== Setup Complete! ===" -ForegroundColor Green
Write-Host "WhatsApp bot is now running under PM2." -ForegroundColor Green
Write-Host ""
Write-Host "Useful commands:" -ForegroundColor Cyan
Write-Host "  pm2 status             -- See bot status" -ForegroundColor White
Write-Host "  pm2 logs whatsapp-bot  -- View live logs" -ForegroundColor White
Write-Host "  pm2 restart whatsapp-bot -- Manually restart" -ForegroundColor White
Write-Host "  pm2 stop whatsapp-bot  -- Stop the bot" -ForegroundColor White
