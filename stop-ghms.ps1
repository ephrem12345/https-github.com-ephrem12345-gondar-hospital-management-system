[CmdletBinding()]
param (
    [int]$FrontendPort = 3002,
    [int]$BackendPort = 4000,
    [switch]$Force
)

$targetScript = Join-Path $PSScriptRoot "scripts\stop-ghms.ps1"
& $targetScript @PSBoundParameters
