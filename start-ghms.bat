@echo off
setlocal enabledelayedexpansion
title Gondar Hospital Management System (GHMS) - Startup Launcher
color 0B

echo ============================================================
echo   Gondar Hospital Management System (GHMS) - Quick Starter
echo   Location: Gondar, Amhara Region, Ethiopia
echo ============================================================
echo.

cd /d "%~dp0"

echo [1/2] Detecting Windows PowerShell...
where powershell >nul 2>&1
if %ERRORLEVEL% neq 0 (
    color 0C
    echo [ERROR] PowerShell is not found on this system.
    echo Please install Windows PowerShell to run GHMS.
    pause
    exit /b 1
)

echo [2/2] Launching GHMS services via PowerShell automation...
echo.
powershell.exe -NoProfile -ExecutionPolicy Bypass -File "%~dp0start-ghms.ps1" -OpenBrowser -DetachFrontend %*

set SCRIPT_EXIT=%ERRORLEVEL%

echo.
if %SCRIPT_EXIT% equ 0 (
    color 0A
    echo ============================================================
    echo   GHMS has started successfully!
    echo   Frontend: http://localhost:3000
    echo   Backend:  http://localhost:4000/api/v1/health
    echo.
    echo   The server windows will stay active in the background.
    echo   To stop all GHMS servers, double-click stop-ghms.bat.
    echo ============================================================
) else (
    color 0C
    echo ============================================================
    echo   [ERROR] GHMS encountered a startup issue (Code %SCRIPT_EXIT%).
    echo   Review the diagnostic messages above.
    echo ============================================================
)

echo.
echo Press any key to close this launcher window...
pause >nul
