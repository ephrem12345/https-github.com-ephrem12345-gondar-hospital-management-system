[CmdletBinding()]
param (
    [int]$FrontendPort = 3002,
    [int]$BackendPort = 4000,
    [int]$MysqlPort = 3306,
    [switch]$Watch,
    [int]$IntervalSeconds = 5,
    [switch]$Json
)

$targetScript = Join-Path $PSScriptRoot "scripts\check-ghms.ps1"
& $targetScript @PSBoundParameters
