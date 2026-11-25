@echo off
setlocal
title Gondar Hospital Management System (GHMS) - Health Watchdog & Auto-Recovery
echo ============================================================
echo  GHMS Continuous Health Monitor & Auto-Recovery Watchdog
echo ============================================================
echo.

powershell.exe -NoProfile -ExecutionPolicy Bypass -File "%~dp0scripts\watchdog.ps1" -AutoRecover -IntervalSeconds 15 %*
if %ERRORLEVEL% EQU 0 goto :success

echo.
echo [ERROR] Watchdog exited with code %ERRORLEVEL%.
pause
exit /b 1

:success
exit /b 0
