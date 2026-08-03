@echo off
title WhatsApp Bot - Atul Residency
cd /d "C:\Users\prash\.gemini\antigravity\scratch\atul-residency"

echo [%date% %time%] Cleaning up stale Node & Chrome processes... >> logs\whatsapp-bot-startup.log
for /f "tokens=5" %%a in ('netstat -aon ^| findstr :3001 ^| findstr LISTENING') do taskkill /F /PID %%a 2>nul
taskkill /F /IM chrome.exe /T 2>nul

:restart
echo [%date% %time%] Starting WhatsApp Bot... >> logs\whatsapp-bot-startup.log
call node src/server/whatsapp.ts >> logs\whatsapp-bot-startup.log 2>&1
echo [%date% %time%] Bot process exited with code %errorlevel%. Restarting in 5 seconds... >> logs\whatsapp-bot-startup.log
timeout /t 5 /nobreak >nul
goto restart
