@echo off
:: =====================================================
:: Atul Residency - Automated Daily Database Backup
:: This script is called by Windows Task Scheduler
:: =====================================================

cd /d "C:\Users\prash\.gemini\antigravity\scratch\atul-residency"

echo [%date% %time%] Starting automated database backup... >> logs\auto-backup.log
node scripts/backup-db.js >> logs\auto-backup.log 2>&1
echo [%date% %time%] Backup finished. >> logs\auto-backup.log
echo. >> logs\auto-backup.log
