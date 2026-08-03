@echo off
title WhatsApp Bot - Atul Residency (Console & QR Mode)
cd /d "C:\Users\prash\.gemini\antigravity\scratch\atul-residency"

echo ======================================================
echo 🤖 ATUL RESIDENCY WHATSAPP BOT SERVER
echo ======================================================
echo.
echo Cleaning up stale background processes...
for /f "tokens=5" %%a in ('netstat -aon ^| findstr :3001 ^| findstr LISTENING') do taskkill /F /PID %%a 2>nul
taskkill /F /IM chrome.exe /T 2>nul

echo.
echo Starting bot server... Please scan the QR code below if prompted!
echo.
call node src/server/whatsapp.ts
pause
