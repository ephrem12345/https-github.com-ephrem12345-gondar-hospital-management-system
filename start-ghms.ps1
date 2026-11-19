<#
.SYNOPSIS
    Gondar Hospital Management System (GHMS) - Dev Server Starter Script
.DESCRIPTION
    Starts the GHMS backend (port 4000) and frontend (port 3002) in the correct order.
    It verifies MySQL (port 3306), waits for backend health readiness before launching
    the frontend, avoids duplicate processes, and never kills processes that do not
    belong to this GHMS project.
.EXAMPLE
    .\start-ghms.ps1
    .\start-ghms.ps1 -OpenBrowser
    .\start-ghms.ps1 -VerifyOnly
    .\start-ghms.ps1 -Force
    .\start-ghms.ps1 -SkipBackend
#>

[CmdletBinding()]
param (
    [int]$Port = 3002,
    [int]$BackendPort = 4000,
    [int]$MysqlPort = 3306,
    [switch]$Force,
    [switch]$StartBackend,
    [switch]$SkipBackend,
    [switch]$OpenBrowser,
    [switch]$VerifyOnly
)

$ErrorActionPreference = "Continue"
$script:HasFailure = $false

# -------------------------------------------------------------------------
# Helper Functions
# -------------------------------------------------------------------------
function Write-Result {
    param ([string]$Message, [string]$Color = "Gray")
    Write-Host "      $Message" -ForegroundColor $Color
}

function Test-TcpPort {
    param (
        [string]$TargetHost = "127.0.0.1",
        [int]$TargetPort,
        [int]$TimeoutMs = 1500
    )
    $client = $null
    try {
        $client = New-Object System.Net.Sockets.TcpClient
        $async = $client.BeginConnect($TargetHost, $TargetPort, $null, $null)
        if ($async.AsyncWaitHandle.WaitOne($TimeoutMs, $false)) {
            $client.EndConnect($async)
            return $true
        }
        return $false
    } catch {
        return $false
    } finally {
        if ($client) { $client.Close() }
    }
}

function Test-HttpEndpoint {
    param ([string]$Url, [int]$TimeoutSec = 3)
    try {
        $req = [System.Net.WebRequest]::Create($Url)
        $req.Timeout = $TimeoutSec * 1000
        $req.Method = "GET"
        $resp = $req.GetResponse()
        $resp.Close()
        return $true
    } catch [System.Net.WebException] {
        if ($_.Response) {
            $statusCode = [int]$_.Response.StatusCode
            $_.Response.Close()
            return ($statusCode -ge 200 -and $statusCode -lt 500)
        }
        return $false
    } catch {
        return $false
    }
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

function Get-ProcessCommandLine {
    param ([int]$ProcessId)
    try {
        $proc = Get-CimInstance Win32_Process -Filter "ProcessId=$ProcessId" -ErrorAction Stop
        return $proc.CommandLine
    } catch {
        return $null
    }
}

function Test-GhmsProcess {
    param ([int]$ProcessId)
    $cmd = Get-ProcessCommandLine -ProcessId $ProcessId
    if (-not $cmd) { return $false }
    return ($cmd -match 'GONDAR HOSPITAL MANAGEMENT SYSTEM' -or $cmd -match 'ghms-backend')
}

function Stop-GhmsProcessTree {
    param ([int[]]$ProcessIds)
    foreach ($processId in $ProcessIds) {
        if (Test-GhmsProcess -ProcessId $processId) {
            Write-Result "Stopping GHMS process tree (PID $processId)..." "Yellow"
            cmd /c "taskkill /PID $processId /F /T 2>nul" | Out-Null
        } else {
            Write-Result "Refusing to stop PID $processId - it does not belong to this GHMS project." "Red"
            $script:HasFailure = $true
        }
    }
}

function Wait-ForPortRelease {
    param ([int]$TargetPort, [int]$Attempts = 6)
    for ($i = 0; $i -lt $Attempts; $i++) {
        Start-Sleep -Seconds 1
        if ((Get-PortProcessId -TargetPort $TargetPort).Count -eq 0) { return $true }
    }
    return $false
}

# -------------------------------------------------------------------------
# Banner
# -------------------------------------------------------------------------
Write-Host ""
Write-Host "============================================================" -ForegroundColor Cyan
Write-Host " Gondar Hospital Management System (GHMS) - Dev Launcher" -ForegroundColor Cyan
Write-Host "============================================================" -ForegroundColor Cyan
Write-Host ""

$projectRoot = $PSScriptRoot
$backendPath = Join-Path $projectRoot "backend"

# -------------------------------------------------------------------------
# Step 1: MySQL availability
# -------------------------------------------------------------------------
Write-Host "[1/4] Checking MySQL on port $MysqlPort..." -ForegroundColor Yellow
if (Test-TcpPort -TargetPort $MysqlPort) {
    Write-Result "[OK] MySQL is accepting connections on port $MysqlPort." "Green"
} else {
    Write-Result "[X] MySQL is NOT reachable on port $MysqlPort." "Red"
    Write-Result "Start MySQL from the XAMPP Control Panel, then run this script again." "Red"
    $script:HasFailure = $true
}

# -------------------------------------------------------------------------
# Step 2: Backend (port 4000)
# -------------------------------------------------------------------------
Write-Host ""
Write-Host "[2/4] Checking GHMS Backend on port $BackendPort..." -ForegroundColor Yellow
$healthUrl = "http://localhost:$BackendPort/api/v1/health"
$backendHealthy = Test-HttpEndpoint -Url $healthUrl -TimeoutSec 2

if ($backendHealthy) {
    Write-Result "[OK] Backend is healthy at $healthUrl" "Green"
} elseif ($VerifyOnly) {
    Write-Result "[!] Backend is not running (verify-only mode - not starting it)." "Yellow"
    $script:HasFailure = $true
} elseif ($SkipBackend) {
    Write-Result "[!] Backend check skipped (-SkipBackend). Login will fail until it is running." "Magenta"
} else {
    $backendPids = @(Get-PortProcessId -TargetPort $BackendPort)
    $ghmsPids = @($backendPids | Where-Object { Test-GhmsProcess -ProcessId $_ })
    $foreignPids = @($backendPids | Where-Object { -not (Test-GhmsProcess -ProcessId $_) })

    if ($foreignPids.Count -gt 0) {
        Write-Result "[X] Port $BackendPort is held by a process that is not part of this GHMS project (PID: $($foreignPids -join ', '))." "Red"
        Write-Result "Stop that process or set a different PORT in backend/.env. This script will not kill it." "Red"
        $script:HasFailure = $true
    } elseif ($ghmsPids.Count -gt 0 -and -not $Force) {
        Write-Result "[!] A GHMS backend process is already bound to port $BackendPort but health is not responding yet." "Yellow"
        Write-Result "Waiting up to 20 seconds for readiness..." "Gray"
        for ($i = 0; $i -lt 20; $i++) {
            Start-Sleep -Seconds 1
            if (Test-HttpEndpoint -Url $healthUrl -TimeoutSec 2) { $backendHealthy = $true; break }
        }
        if ($backendHealthy) {
            Write-Result "[OK] Backend became healthy." "Green"
        } else {
            Write-Result "[X] Backend is still not responding. Re-run with -Force to restart the GHMS backend." "Red"
            $script:HasFailure = $true
        }
    } else {
        if ($ghmsPids.Count -gt 0 -and $Force) {
            Stop-GhmsProcessTree -ProcessIds $ghmsPids
            Wait-ForPortRelease -TargetPort $BackendPort | Out-Null
        }

        if (-not (Test-Path -LiteralPath $backendPath)) {
            Write-Result "[X] Backend directory not found at: $backendPath" "Red"
            $script:HasFailure = $true
        } elseif (-not (Test-Path -LiteralPath (Join-Path $backendPath "node_modules"))) {
            Write-Result "[X] Backend dependencies are missing. Run: npm --prefix `"$backendPath`" install" "Red"
            $script:HasFailure = $true
        } else {
            Write-Result "[*] Starting backend in a new PowerShell window..." "Cyan"
            $command = "Set-Location -LiteralPath '$backendPath'; `$host.UI.RawUI.WindowTitle = 'GHMS Backend ($BackendPort)'; npm run dev"
            Start-Process -FilePath "powershell.exe" -ArgumentList "-NoExit", "-ExecutionPolicy", "Bypass", "-Command", $command -WorkingDirectory $backendPath | Out-Null

            Write-Result "Waiting up to 60 seconds for backend health..." "Gray"
            for ($i = 0; $i -lt 60; $i++) {
                Start-Sleep -Seconds 1
                if (Test-HttpEndpoint -Url $healthUrl -TimeoutSec 2) { $backendHealthy = $true; break }
            }

            if ($backendHealthy) {
                Write-Result "[OK] Backend is healthy at $healthUrl" "Green"
            } else {
                Write-Result "[X] Backend did not become healthy. Check the backend window for the real error." "Red"
                $script:HasFailure = $true
            }
        }
    }
}

# -------------------------------------------------------------------------
# Step 3: Frontend port (3002)
# -------------------------------------------------------------------------
Write-Host ""
Write-Host "[3/4] Checking Frontend on port $Port..." -ForegroundColor Yellow
$frontendUrl = "http://localhost:$Port"
$frontendPids = @(Get-PortProcessId -TargetPort $Port)
$frontendResponding = $false
if ($frontendPids.Count -gt 0) {
    $frontendResponding = Test-HttpEndpoint -Url $frontendUrl -TimeoutSec 2
}

$shouldStartFrontend = $true
if ($frontendPids.Count -gt 0) {
    if ($frontendResponding -and -not $Force) {
        Write-Result "[OK] Frontend is already running at $frontendUrl (PID: $($frontendPids -join ', '))." "Green"
        $shouldStartFrontend = $false
    } else {
        $ghmsFrontPids = @($frontendPids | Where-Object { Test-GhmsProcess -ProcessId $_ })
        $foreignFrontPids = @($frontendPids | Where-Object { -not (Test-GhmsProcess -ProcessId $_) })

        if ($foreignFrontPids.Count -gt 0 -and -not $Force) {
            Write-Result "[X] Port $Port is held by a non-GHMS process (PID: $($foreignFrontPids -join ', '))." "Red"
            Write-Result "This script will not kill it. Stop it manually or use a different port." "Red"
            $script:HasFailure = $true
            $shouldStartFrontend = $false
        } elseif ($Force) {
            Stop-GhmsProcessTree -ProcessIds $frontendPids
            if (Wait-ForPortRelease -TargetPort $Port) {
                Write-Result "[OK] Port $Port released." "Green"
            } else {
                Write-Result "[!] Port $Port may still be releasing." "Yellow"
            }
        } else {
            Write-Result "[!] Port $Port is occupied by a GHMS process but not responding." "Yellow"
            Write-Result "Re-run with -Force to restart it safely." "Gray"
            $shouldStartFrontend = $false
        }
    }
} else {
    Write-Result "[OK] Port $Port is free." "Green"
}

# -------------------------------------------------------------------------
# Step 4: Start frontend / verification summary
# -------------------------------------------------------------------------
Write-Host ""
if ($VerifyOnly) {
    Write-Host "[4/4] Verification summary" -ForegroundColor Yellow
    Write-Host "      MySQL ($MysqlPort):      $(if (Test-TcpPort -TargetPort $MysqlPort) { 'UP' } else { 'DOWN' })"
    Write-Host "      Backend ($BackendPort):    $(if (Test-HttpEndpoint -Url $healthUrl -TimeoutSec 2) { 'UP' } else { 'DOWN' })"
    Write-Host "      Frontend ($Port):   $(if (Test-HttpEndpoint -Url $frontendUrl -TimeoutSec 2) { 'UP' } else { 'DOWN' })"
    Write-Host ""
    if ($script:HasFailure) { exit 1 } else { exit 0 }
}

if (-not $shouldStartFrontend) {
    Write-Host "============================================================" -ForegroundColor Green
    Write-Host " GHMS is ready: $frontendUrl" -ForegroundColor Green
    Write-Host " Backend health: $healthUrl" -ForegroundColor Green
    Write-Host "============================================================" -ForegroundColor Green
    Write-Host ""
    if ($OpenBrowser) { Start-Process $frontendUrl }
    if ($script:HasFailure) { exit 1 }
    exit 0
}

Write-Host "[4/4] Starting GHMS Frontend on port $Port..." -ForegroundColor Cyan
Write-Host "      URL: $frontendUrl" -ForegroundColor Green
Write-Host "      Backend API: http://localhost:$BackendPort/api/v1" -ForegroundColor Gray
Write-Host "      Press Ctrl+C at any time to stop the frontend." -ForegroundColor Gray
Write-Host "------------------------------------------------------------" -ForegroundColor Gray
Write-Host ""

if ($OpenBrowser) {
    Start-Job -ScriptBlock {
        param($url)
        Start-Sleep -Seconds 4
        Start-Process $url
    } -ArgumentList $frontendUrl | Out-Null
}

& npx next dev -p $Port
