<#
.SYNOPSIS
    Root wrapper for GHMS Watchdog and Health Diagnostics.
#>
[CmdletBinding()]
param (
    [int]$FrontendPort = 3002,
    [int]$BackendPort = 4000,
    [int]$MysqlPort = 3306,
    [int]$IntervalSeconds = 15,
    [int]$MaxRetries = 3,
    [int]$WindowMinutes = 5,
    [switch]$AutoRecover = $true,
    [switch]$Once,
    [switch]$Watch
)

$targetScript = Join-Path $PSScriptRoot "scripts\watchdog.ps1"
if (Test-Path -LiteralPath $targetScript) {
    & $targetScript -FrontendPort $FrontendPort -BackendPort $BackendPort -MysqlPort $MysqlPort -IntervalSeconds $IntervalSeconds -MaxRetries $MaxRetries -WindowMinutes $WindowMinutes -AutoRecover:$AutoRecover -Once:$Once
} else {
    Write-Error "Could not find $targetScript"
    exit 1
}
