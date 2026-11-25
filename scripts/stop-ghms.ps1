<#
.SYNOPSIS
    Gondar Hospital Management System (GHMS) - Safe Process Shutdown
.DESCRIPTION
    Safely discovers and terminates ONLY GHMS-owned frontend and backend
    processes bound to ports 3000 and 4000. Never kills foreign node.exe
    processes and never terminates the MySQL database service.
#>

[CmdletBinding()]
param (
    [int]$FrontendPort = 3002,
    [int]$BackendPort = 4000,
    [switch]$Force
)

$scriptDir = $PSScriptRoot
if ((Split-Path -Leaf $scriptDir) -eq "scripts") {
    $projectRoot = Split-Path -Parent $scriptDir
} else {
    $projectRoot = $scriptDir
}

function Write-Info {
    param ([string]$Msg, [string]$Color = "Cyan")
    Write-Host "$Msg" -ForegroundColor $Color
}

function Write-Sub {
    param ([string]$Msg, [string]$Color = "Gray")
    Write-Host "      $Msg" -ForegroundColor $Color
}

function Get-PortProcessId {
    param ([int]$TargetPort)
    $processIds = @()
    try {
        $conns = Get-NetTCPConnection -LocalPort $TargetPort -ErrorAction SilentlyContinue
        if ($conns) {
            foreach ($c in $conns) {
                if ($c.OwningProcess -and $c.OwningProcess -gt 0) {
                    $processIds += $c.OwningProcess
                }
            }
        }
    } catch { }

    if ($processIds.Count -eq 0) {
        try {
            $lines = netstat -ano | Select-String ":$TargetPort\s"
            foreach ($line in $lines) {
                $tokens = ($line.ToString().Trim() -split '\s+')
                if ($tokens.Count -ge 5) {
                    $pidVal = $tokens[-1]
                    if ($pidVal -match '^\d+$' -and [int]$pidVal -gt 0) {
                        $processIds += [int]$pidVal
                    }
                }
            }
        } catch { }
    }
    return ($processIds | Select-Object -Unique)
}

function Get-ProcessDetails {
    param ([int]$ProcessId)
    try {
        $proc = Get-CimInstance Win32_Process -Filter "ProcessId=$ProcessId" -ErrorAction Stop
        return @{
            ProcessId    = $proc.ProcessId
            Name         = $proc.Name
            CommandLine  = $proc.CommandLine
            Executable   = $proc.ExecutablePath
        }
    } catch {
        return $null
    }
}

function Test-GhmsProcess {
    param ([int]$ProcessId)
    $details = Get-ProcessDetails -ProcessId $ProcessId
    if (-not $details -or -not $details.CommandLine) { return $false }
    $cmd = $details.CommandLine
    return ($cmd -match 'GONDAR HOSPITAL MANAGEMENT SYSTEM' -or 
            $cmd -match 'ghms-backend' -or 
            $cmd -match 'next dev' -or 
            $cmd -match 'next start' -or
            $cmd -match 'tsx watch src/server.ts' -or
            $cmd -match 'dist/server.js' -or
            $cmd -match 'src/server.ts')
}

Write-Host ""
Write-Host "============================================================" -ForegroundColor Cyan
Write-Host " Gondar Hospital Management System (GHMS) - Safe Shutdown" -ForegroundColor Cyan
Write-Host "============================================================" -ForegroundColor Cyan
Write-Host ""

$stoppedCount = 0

# 1. Stop Frontend on port 3002 and 3000
$frontendPorts = @($FrontendPort, 3002, 3000) | Select-Object -Unique
foreach ($fPort in $frontendPorts) {
    Write-Info "Checking GHMS Frontend on port $fPort..."
    $frontPids = @(Get-PortProcessId -TargetPort $fPort)
    if ($frontPids.Count -eq 0) {
        Write-Sub "[OK] Port $fPort is already free." "Green"
    } else {
        foreach ($pidNum in $frontPids) {
            if (Test-GhmsProcess -ProcessId $pidNum) {
                Write-Sub "Stopping GHMS frontend (PID $pidNum on port $fPort)..." "Yellow"
                cmd /c "taskkill /PID $pidNum /F /T 2>nul" | Out-Null
                $stoppedCount++
            } else {
                $details = Get-ProcessDetails -ProcessId $pidNum
                $name = if ($details) { $details.Name } else { "Unknown" }
                Write-Sub "[!] PID $pidNum ($name) on port $fPort is an unrelated process. Skipping." "Red"
            }
        }
    }
}

# 2. Stop Backend on port 4000
Write-Info ""
Write-Info "[2/2] Checking GHMS Backend on port $BackendPort..."
$backPids = @(Get-PortProcessId -TargetPort $BackendPort)
if ($backPids.Count -eq 0) {
    Write-Sub "[OK] Port $BackendPort is already free." "Green"
} else {
    foreach ($pidNum in $backPids) {
        if (Test-GhmsProcess -ProcessId $pidNum) {
            $cmd = (Get-ProcessDetails -ProcessId $pidNum).CommandLine
            Write-Sub "Stopping GHMS backend (PID $pidNum)..." "Yellow"
            cmd /c "taskkill /PID $pidNum /F /T 2>nul" | Out-Null
            $stoppedCount++
        } else {
            $details = Get-ProcessDetails -ProcessId $pidNum
            $name = if ($details) { $details.Name } else { "Unknown" }
            Write-Sub "[!] PID $pidNum ($name) is an unrelated process. Skipping." "Red"
        }
    }
}

# 3. Check for any orphaned GHMS tsx / next background processes
$extraProcs = Get-CimInstance Win32_Process | Where-Object {
    $_.CommandLine -match 'GONDAR HOSPITAL MANAGEMENT SYSTEM' -and 
    ($_.Name -eq 'node.exe' -or $_.CommandLine -match 'tsx' -or $_.CommandLine -match 'next')
}
if ($extraProcs) {
    foreach ($p in $extraProcs) {
        Write-Sub "Stopping orphaned GHMS node process (PID $($p.ProcessId))..." "Yellow"
        cmd /c "taskkill /PID $($p.ProcessId) /F /T 2>nul" | Out-Null
        $stoppedCount++
    }
}

# 4. Verify release with polling
$remainingFront = @()
$remainingBack = @()
for ($i = 0; $i -lt 5; $i++) {
    Start-Sleep -Seconds 1
    $remainingFront = @(Get-PortProcessId -TargetPort $FrontendPort)
    $remainingBack = @(Get-PortProcessId -TargetPort $BackendPort)
    if ($remainingFront.Count -eq 0 -and $remainingBack.Count -eq 0) { break }
}

Write-Host ""
Write-Host "============================================================" -ForegroundColor Green
Write-Host " GHMS Shutdown Complete" -ForegroundColor Green
Write-Host "============================================================" -ForegroundColor Green
Write-Sub "Frontend Port ${FrontendPort}: $(if ($remainingFront.Count -eq 0) { '[RELEASED]' } else { '[OCCUPIED: ' + ($remainingFront -join ',') + ']' })" "Green"
Write-Sub "Backend Port ${BackendPort}:  $(if ($remainingBack.Count -eq 0) { '[RELEASED]' } else { '[OCCUPIED: ' + ($remainingBack -join ',') + ']' })" "Green"
Write-Sub "MySQL (Port 3306):   [UNTOUCHED - Database Preserved]" "Cyan"
Write-Host ""
