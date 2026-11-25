<#
.SYNOPSIS
    Configure optional automatic startup of GHMS upon Windows user login.
.DESCRIPTION
    Creates or removes a Windows Shortcut in the user's Startup folder
    (shell:startup) targeting START-GHMS.bat.
.EXAMPLE
    .\scripts\setup-windows-autostart.ps1 -Enable
    .\scripts\setup-windows-autostart.ps1 -Disable
#>

[CmdletBinding()]
param (
    [switch]$Enable,
    [switch]$Disable
)

$startupFolder = [Environment]::GetFolderPath("Startup")
$shortcutPath = Join-Path $startupFolder "Gondar Hospital Management System.lnk"
$projectRoot = Split-Path -Parent $PSScriptRoot
$targetBat = Join-Path $projectRoot "start-ghms-permanent.bat"
if (-not (Test-Path -LiteralPath $targetBat)) {
    $targetBat = Join-Path $projectRoot "start-ghms.bat"
}

if ($Disable) {
    if (Test-Path -LiteralPath $shortcutPath) {
        Remove-Item -LiteralPath $shortcutPath -Force
        Write-Host "[OK] GHMS autostart shortcut removed from Windows Startup folder." -ForegroundColor Green
    } else {
        Write-Host "[INFO] GHMS was not configured in Windows Startup folder." -ForegroundColor Yellow
    }
    exit 0
}

if ($Enable -or (-not $Disable)) {
    $wshell = New-Object -ComObject WScript.Shell
    $shortcut = $wshell.CreateShortcut($shortcutPath)
    $shortcut.TargetPath = $targetBat
    $shortcut.WorkingDirectory = $projectRoot
    $shortcut.Description = "Gondar Hospital Management System (GHMS) Auto Launcher"
    $shortcut.Save()
    Write-Host "============================================================" -ForegroundColor Green
    Write-Host " [SUCCESS] GHMS configured for automatic Windows startup!" -ForegroundColor Green
    Write-Host " Shortcut created: $shortcutPath" -ForegroundColor Cyan
    Write-Host " Target:           $targetBat" -ForegroundColor Cyan
    Write-Host " To remove later:  .\scripts\setup-windows-autostart.ps1 -Disable" -ForegroundColor Gray
    Write-Host "============================================================" -ForegroundColor Green
}
