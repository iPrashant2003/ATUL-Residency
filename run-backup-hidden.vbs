Set WshShell = CreateObject("WScript.Shell")
WshShell.CurrentDirectory = "C:\Users\prash\.gemini\antigravity\scratch\atul-residency"
WshShell.Run "auto-backup.bat", 0, False
