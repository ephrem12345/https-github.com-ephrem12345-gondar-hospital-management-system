@echo off
setlocal
title Gondar Hospital Management System (GHMS) - Shutdown
color 0E

echo Stopping GHMS processes...
powershell.exe -NoProfile -ExecutionPolicy Bypass -File "%~dp0scripts\stop-ghms.ps1" %*

echo.
pause
