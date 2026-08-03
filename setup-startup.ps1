# Setup WhatsApp Bot Auto-Start via Windows Task Scheduler
# Run this script ONCE as Administrator to register the startup task

$taskName = "AtulResidency-WhatsAppBot"
$botDir = "C:\Users\prash\.gemini\antigravity\scratch\atul-residency"
$nodeExe = "C:\Program Files\nodejs\node.exe"
$botScript = "$botDir\bot-runner.js"
$logFile = "$botDir\logs\whatsapp-bot-startup.log"

# Remove old task if exists
schtasks /delete /tn $taskName /f 2>$null

# Create the action - run node bot-runner.js hidden
$action = New-ScheduledTaskAction `
    -Execute $nodeExe `
    -Argument $botScript `
    -WorkingDirectory $botDir

# Trigger: Run at logon of this user
$trigger = New-ScheduledTaskTrigger -AtLogOn -User $env:USERNAME

# Settings: allow running even on battery, don't stop if idle, restart on failure
$settings = New-ScheduledTaskSettingsSet `
    -AllowStartIfOnBatteries `
    -DontStopIfGoingOnBatteries `
    -DontStopOnIdleEnd `
    -ExecutionTimeLimit ([TimeSpan]::Zero) `
    -RestartCount 999 `
    -RestartInterval (New-TimeSpan -Minutes 1) `
    -MultipleInstances IgnoreNew

# Run with highest privileges, hidden
$principal = New-ScheduledTaskPrincipal `
    -UserId $env:USERNAME `
    -LogonType Interactive `
    -RunLevel Highest

# Register the task
Register-ScheduledTask `
    -TaskName $taskName `
    -Action $action `
    -Trigger $trigger `
    -Settings $settings `
    -Principal $principal `
    -Description "Starts the WhatsApp Bot for Atul Residency on user logon. Auto-restarts on failure." `
    -Force

Write-Host "✅ Task '$taskName' registered successfully!"
Write-Host "   The bot will now auto-start every time you log in to Windows."
Write-Host ""
Write-Host "Useful commands:"
Write-Host "  Start:   schtasks /run /tn '$taskName'"
Write-Host "  Stop:    schtasks /end /tn '$taskName'"
Write-Host "  Status:  schtasks /query /tn '$taskName' /fo LIST /v"
Write-Host "  Delete:  schtasks /delete /tn '$taskName' /f"
