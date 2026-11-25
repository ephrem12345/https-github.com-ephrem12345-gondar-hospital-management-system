@echo off
setlocal
title Gondar Hospital Management System (GHMS) - Permanent Background Launcher
echo ============================================================
echo  Starting GHMS in Permanent Background Mode (Production)
echo ============================================================
echo.
powershell.exe -NoProfile -ExecutionPolicy Bypass -File "%~dp0scripts\start-ghms.ps1" -Production -Background -OpenBrowser %*
echo.
echo GHMS services are running persistently in the background.
echo You can safely close this launcher window at any time.
echo To check status: run check-ghms.bat
echo To stop services: run stop-ghms.bat
echo.
pause
