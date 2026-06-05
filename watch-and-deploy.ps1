# watch-and-deploy.ps1
# This script monitors local changes in the project, debounces them,
# and automatically commits and pushes them to GitHub, triggering Vercel auto-deployment.

$projectDir = "C:\Users\prash\.gemini\antigravity\scratch\atul-residency"
Set-Location $projectDir

Write-Host "==========================================" -ForegroundColor Cyan
Write-Host "🚀 Auto-Deployment File Watcher Activated" -ForegroundColor Cyan
Write-Host "==========================================" -ForegroundColor Cyan
Write-Host "Monitoring changes in: $projectDir" -ForegroundColor Green
Write-Host "Will auto-commit and push to trigger Vercel deployment on changes." -ForegroundColor Yellow
Write-Host "Press Ctrl+C to stop.`n" -ForegroundColor White

# Set up file system watcher
$watcher = New-Object System.IO.FileSystemWatcher
$watcher.Path = $projectDir
$watcher.IncludeSubdirectories = $true
$watcher.EnableRaisingEvents = $true

# Debounce variables
$global:lastTriggered = [DateTime]::MinValue
$debounceIntervalMs = 5000 # 5 seconds debounce

# Filter function to ignore system folders and temp files
function Should-Process($path) {
    if ($path -like "*\.git\*" -or 
        $path -like "*\.next\*" -or 
        $path -like "*\node_modules\*" -or 
        $path -like "*\logs\*" -or 
        $path -like "*\backups\*" -or 
        $path -like "*\.wwebjs_cache\*" -or 
        $path -like "*\.wwebjs_auth\*") {
        return $false
    }
    # Only watch relevant source code extensions
    $ext = [System.IO.Path]::GetExtension($path)
    if ($ext -in ".ts", ".tsx", ".js", ".jsx", ".json", ".css", ".prisma", ".html") {
        return $true
    }
    return $false
}

$action = {
    $path = $Event.SourceEventArgs.FullPath
    $changeType = $Event.SourceEventArgs.ChangeType
    
    # Check if we should process this file
    if (-not (Should-Process $path)) {
        return
    }

    # Debounce checks
    $now = [DateTime]::Now
    $timeDiff = ($now - $global:lastTriggered).TotalMilliseconds
    if ($timeDiff -lt $debounceIntervalMs) {
        return
    }
    $global:lastTriggered = $now

    Write-Host "`n[$(Get-Date -Format 'HH:mm:ss')] Change detected: $changeType on $path" -ForegroundColor Cyan
    Write-Host "Settling file changes..." -ForegroundColor Gray
    Start-Sleep -Seconds 2

    # Stage, commit, and push
    $filename = [System.IO.Path]::GetFileName($path)
    Write-Host "Adding files to git..." -ForegroundColor Yellow
    git add .
    
    # Check if there are actual changes staged
    $status = git status --porcelain
    if (-not $status) {
        Write-Host "No staging changes to commit." -ForegroundColor Gray
        return
    }

    Write-Host "Committing changes..." -ForegroundColor Yellow
    git commit -m "auto: update $filename and deploy changes"
    
    Write-Host "Pushing to GitHub (origin main)..." -ForegroundColor Yellow
    git push origin main
    
    if ($LASTEXITCODE -eq 0) {
        Write-Host "🚀 Successfully pushed to GitHub! Vercel is now deploying your changes." -ForegroundColor Green
    } else {
        Write-Host "❌ Git push failed. Please check your network connection or git status." -ForegroundColor Red
    }
}

# Register events
$handlers = @()
$handlers += Register-ObjectEvent $watcher "Changed" -Action $action
$handlers += Register-ObjectEvent $watcher "Created" -Action $action
$handlers += Register-ObjectEvent $watcher "Deleted" -Action $action
$handlers += Register-ObjectEvent $watcher "Renamed" -Action $action

try {
    while ($true) {
        Start-Sleep -Seconds 1
    }
}
finally {
    # Clean up events when stopped
    Write-Host "`nStopping watcher and cleaning up events..." -ForegroundColor Yellow
    foreach ($handler in $handlers) {
        Unregister-Event -SourceIdentifier $handler.Name -ErrorAction SilentlyContinue
    }
    $watcher.Dispose()
    Write-Host "Watcher stopped." -ForegroundColor White
}
