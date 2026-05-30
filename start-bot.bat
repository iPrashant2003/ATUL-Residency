@echo off
title WhatsApp Bot - Atul Residency
cd /d "C:\Users\prash\.gemini\antigravity\scratch\atul-residency"

:restart
echo [%date% %time%] Starting WhatsApp Bot...
call npx tsx src/server/whatsapp.ts
echo [%date% %time%] Bot process exited. Restarting in 5 seconds...
timeout /t 5 /nobreak >nul
goto restart
