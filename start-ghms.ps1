[CmdletBinding()]
param (
    [int]$Port = 3002,
    [int]$BackendPort = 4000,
    [int]$MysqlPort = 3306,
    [switch]$Force,
    [switch]$OpenBrowser,
    [switch]$VerifyOnly,
    [switch]$SkipBackend,
    [switch]$Production,
    [switch]$DetachFrontend,
    [switch]$Background
)

$targetScript = Join-Path $PSScriptRoot "scripts\start-ghms.ps1"
& $targetScript @PSBoundParameters
