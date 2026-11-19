@echo off
setlocal enabledelayedexpansion
title Gondar Hospital Management System (GHMS) - Service Stopper
color 0E

echo ============================================================
echo   Gondar Hospital Management System (GHMS) - Safe Stopper
echo ============================================================
echo.

cd /d "%~dp0"

echo Stopping GHMS servers safely...
echo.
powershell.exe -NoProfile -ExecutionPolicy Bypass -File "%~dp0stop-ghms.ps1" %*

echo.
echo Press any key to close this window...
pause >nul
