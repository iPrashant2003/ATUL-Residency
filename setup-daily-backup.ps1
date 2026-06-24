# =====================================================
# Atul Residency - Setup Automated Daily Backup
# Creates a Windows Task Scheduler job that runs 
# database backup every day at 2:00 AM and 2:00 PM
# =====================================================

$projectPath = "C:\Users\prash\.gemini\antigravity\scratch\atul-residency"
$batchFile = Join-Path $projectPath "auto-backup.bat"
$taskName = "AtulResidency-DailyBackup"

# Create logs directory if it doesn't exist
$logsDir = Join-Path $projectPath "logs"
if (-not (Test-Path $logsDir)) {
    New-Item -Path $logsDir -ItemType Directory -Force | Out-Null
}

# Remove existing task if it exists
$existingTask = Get-ScheduledTask -TaskName $taskName -ErrorAction SilentlyContinue
if ($existingTask) {
    Write-Host "🔄 Removing existing scheduled task '$taskName'..."
    Unregister-ScheduledTask -TaskName $taskName -Confirm:$false
}

# Create task action
$vbsPath = Join-Path $projectPath "run-backup-hidden.vbs"
$action = New-ScheduledTaskAction -Execute "wscript.exe" -Argument "`"$vbsPath`"" -WorkingDirectory $projectPath

# Create two triggers:
# 1. Daily at 2:00 AM (overnight safety backup)
# 2. Daily at 2:00 PM (midday backup for extra safety)
$trigger1 = New-ScheduledTaskTrigger -Daily -At "02:00"
$trigger2 = New-ScheduledTaskTrigger -Daily -At "14:00"

# Task settings
$settings = New-ScheduledTaskSettingsSet `
    -AllowStartIfOnBatteries `
    -DontStopIfGoingOnBatteries `
    -StartWhenAvailable `
    -RunOnlyIfNetworkAvailable `
    -MultipleInstances IgnoreNew

# Register the task
Register-ScheduledTask `
    -TaskName $taskName `
    -Action $action `
    -Trigger $trigger1, $trigger2 `
    -Settings $settings `
    -Description "Automated database backup for Atul Residency. Runs at 2 AM and 2 PM daily. Backs up to local JSON files and emails a copy to admin." `
    -RunLevel Limited

Write-Host ""
Write-Host "======================================================" -ForegroundColor Green
Write-Host "  ✅ AUTOMATED BACKUP SCHEDULED SUCCESSFULLY!" -ForegroundColor Green
Write-Host "======================================================" -ForegroundColor Green
Write-Host ""
Write-Host "  Task Name: $taskName"
Write-Host "  Schedule:  Every day at 2:00 AM and 2:00 PM"
Write-Host "  Script:    $batchFile"
Write-Host "  Logs:      $logsDir\auto-backup.log"
Write-Host "  Backups:   $projectPath\backups\"
Write-Host "  Retention: Last 30 backups kept"
Write-Host "  Email:     Backup emailed to admin after each run"
Write-Host ""
Write-Host "  To run manually: npm run db:backup" -ForegroundColor Cyan
Write-Host "  To restore:      npm run db:restore" -ForegroundColor Cyan
Write-Host ""
