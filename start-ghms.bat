@echo off
setlocal
title Gondar Hospital Management System (GHMS) Launcher
cd /d "%~dp0"

echo ============================================================
echo   Gondar Hospital Management System (GHMS) Launcher
echo ============================================================
echo.

powershell.exe -NoProfile -ExecutionPolicy Bypass -File "%~dp0scripts\start-ghms.ps1" -OpenBrowser %*
if %ERRORLEVEL% EQU 0 goto :success

echo.
echo [ERROR] GHMS startup failed. Check logs directory for details.
pause
exit /b 1

:success
exit /b 0
