@echo off
setlocal
title Gondar Hospital Management System (GHMS) - Health Check
powershell.exe -NoProfile -ExecutionPolicy Bypass -File "%~dp0scripts\check-ghms.ps1" %*
echo.
pause
