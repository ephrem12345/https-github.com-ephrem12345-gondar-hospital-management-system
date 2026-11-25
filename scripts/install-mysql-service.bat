@echo off
setlocal
title GHMS - Install XAMPP MySQL as a Permanent Windows Service
echo ============================================================
echo  Install XAMPP MySQL as a Permanent Windows Service
echo ============================================================
echo.
echo NOTE: This script must be run as Administrator (Right click -> Run as Administrator).
echo.

openfiles >nul 2>&1
if %errorlevel% neq 0 (
    echo [ERROR] Administrative permissions required.
    echo Please right-click this file and select 'Run as administrator'.
    echo.
    pause
    exit /b 1
)

echo Stopping any standalone MySQL processes...
taskkill /F /IM mysqld.exe 2>nul

echo Installing MySQL Windows Service...
"C:\xampp\mysql\bin\mysqld.exe" --install "mysql" --defaults-file="C:\xampp\mysql\bin\my.ini"

echo Setting MySQL Service startup type to Automatic...
sc.exe config mysql start= auto

echo Starting MySQL Windows Service...
net start mysql

echo.
echo ============================================================
echo  MySQL is now installed as a Permanent Windows Service!
echo  It will automatically start when Windows boots up and
echo  remain running permanently in the background.
echo ============================================================
echo.
pause
