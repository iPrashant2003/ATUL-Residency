# WhatsApp Bot - Windows Task Scheduler Setup
# Run this script ONCE as Administrator to create the auto-start task

$taskName = "AtulResidency-WhatsAppBot"
$batPath = "C:\Users\prash\.gemini\antigravity\scratch\atul-residency\start-bot.bat"
$workDir = "C:\Users\prash\.gemini\antigravity\scratch\atul-residency"

Write-Host "=== WhatsApp Bot Auto-Start Setup ===" -ForegroundColor Cyan

# Remove old task if exists
$existing = Get-ScheduledTask -TaskName $taskName -ErrorAction SilentlyContinue
if ($existing) {
    Write-Host "Removing existing task..." -ForegroundColor Yellow
    Unregister-ScheduledTask -TaskName $taskName -Confirm:$false
}

# Create the scheduled task
$action = New-ScheduledTaskAction -Execute $batPath -WorkingDirectory $workDir
$trigger = New-ScheduledTaskTrigger -AtLogon
$settings = New-ScheduledTaskSettingsSet -AllowStartIfOnBatteries -DontStopIfGoingOnBatteries -StartWhenAvailable -RestartCount 3 -RestartInterval (New-TimeSpan -Minutes 1) -ExecutionTimeLimit (New-TimeSpan -Days 365)
Register-ScheduledTask -TaskName $taskName -Action $action -Trigger $trigger -Settings $settings -Description "Auto-starts the WhatsApp Bot for Atul Residency on login"

Write-Host ""
Write-Host "✅ Task '$taskName' registered successfully!" -ForegroundColor Green
Write-Host "The WhatsApp bot will auto-start every time you log into Windows." -ForegroundColor Green
Write-Host ""
Write-Host "To manually control:" -ForegroundColor Cyan
Write-Host "  Start:  Start-ScheduledTask -TaskName '$taskName'" -ForegroundColor White
Write-Host "  Stop:   Stop-ScheduledTask -TaskName '$taskName'" -ForegroundColor White
Write-Host "  Status: Get-ScheduledTask -TaskName '$taskName' | Select State" -ForegroundColor White
Write-Host "  Remove: Unregister-ScheduledTask -TaskName '$taskName'" -ForegroundColor White
