@echo off
title WhatsApp Bot - Atul Residency (Console & QR Mode)
cd /d "C:\Users\prash\.gemini\antigravity\scratch\atul-residency"
echo ======================================================
echo 🤖 ATUL RESIDENCY WHATSAPP BOT SERVER
echo ======================================================
echo.
echo Starting bot server... Please scan the QR code below if prompted!
echo.
call node src/server/whatsapp.ts
pause
