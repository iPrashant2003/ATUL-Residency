@echo off
title WhatsApp Bot - Atul Residency
cd /d "C:\Users\prash\.gemini\antigravity\scratch\atul-residency"

:restart
echo [%date% %time%] Starting WhatsApp Bot... >> logs\whatsapp-bot-startup.log
call node src/server/whatsapp.ts >> logs\whatsapp-bot-startup.log 2>&1
echo [%date% %time%] Bot process exited with code %errorlevel%. Restarting in 5 seconds... >> logs\whatsapp-bot-startup.log
timeout /t 5 /nobreak >nul
goto restart
