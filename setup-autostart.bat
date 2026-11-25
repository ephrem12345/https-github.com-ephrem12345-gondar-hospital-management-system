@echo off
setlocal
title Gondar Hospital Management System (GHMS) - Windows Autostart Setup
echo ============================================================
echo  Configure GHMS to Automatically Start on Windows Boot/Login
echo ============================================================
echo.
powershell.exe -NoProfile -ExecutionPolicy Bypass -File "%~dp0scripts\setup-windows-autostart.ps1" -Enable
echo.
pause
