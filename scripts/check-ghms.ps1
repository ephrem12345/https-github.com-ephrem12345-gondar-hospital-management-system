<#
.SYNOPSIS
    Gondar Hospital Management System (GHMS) - Service Health & Diagnostics
.DESCRIPTION
    Probes all 4 core tiers of the GHMS application:
      1. MySQL Database (Port 3306)
      2. Backend API Liveness (http://localhost:4000/api/health)
      3. Backend API Database Readiness (http://localhost:4000/api/v1/ready)
      4. Frontend Web Portal (http://localhost:3002)
    Displays a clear status dashboard with actionable diagnostics.
.EXAMPLE
    .\scripts\check-ghms.ps1
    .\scripts\check-ghms.ps1 -Watch -IntervalSeconds 5
    .\scripts\check-ghms.ps1 -Json
#>

[CmdletBinding()]
param (
    [int]$FrontendPort = 3002,
    [int]$BackendPort = 4000,
    [int]$MysqlPort = 3306,
    [switch]$Watch,
    [int]$IntervalSeconds = 5,
    [switch]$Json
)

[System.Net.ServicePointManager]::DefaultConnectionLimit = 100

function Test-TcpPort {
    param ([string]$TargetHost = "localhost", [int]$TargetPort, [int]$TimeoutMs = 1500)
    foreach ($target in @($TargetHost, "localhost", "127.0.0.1", "::1")) {
        $client = $null
        try {
            $client = New-Object System.Net.Sockets.TcpClient
            $async = $client.BeginConnect($target, $TargetPort, $null, $null)
            if ($async.AsyncWaitHandle.WaitOne($TimeoutMs, $false)) {
                $client.EndConnect($async)
                return $true
            }
        } catch { } finally {
            if ($client) { $client.Close() }
        }
    }
    try {
        $conns = Get-NetTCPConnection -LocalPort $TargetPort -ErrorAction SilentlyContinue
        if ($conns) { return $true }
    } catch { }
    return $false
}

function Test-HttpProbe {
    param ([string]$Url, [int]$TimeoutMs = 5000)
    $sw = [System.Diagnostics.Stopwatch]::StartNew()

    # Fast and reliable probe using curl.exe if available
    try {
        $timeoutSec = [math]::Max(2, [math]::Ceiling($TimeoutMs / 1000))
        $curlCode = & curl.exe -s -m $timeoutSec -w "%{http_code}" -o NUL $Url 2>$null
        $sw.Stop()
        if ($curlCode -and $curlCode.Trim() -match '^\d+$') {
            $status = [int]$curlCode.Trim()
            return @{
                Success     = ($status -ge 200 -and $status -lt 400)
                StatusCode  = $status
                LatencyMs   = [math]::Round($sw.Elapsed.TotalMilliseconds)
                Error       = if ($status -ge 200 -and $status -lt 400) { $null } else { "HTTP $status" }
            }
        }
    } catch { }

    try {
        $req = [System.Net.HttpWebRequest]::Create($Url)
        $req.Timeout = $TimeoutMs
        $req.KeepAlive = $false
        $req.Method = "GET"
        $resp = $req.GetResponse()
        $sw.Stop()
        $status = [int]$resp.StatusCode
        $resp.Close()
        return @{
            Success     = ($status -ge 200 -and $status -lt 400)
            StatusCode  = $status
            LatencyMs   = [math]::Round($sw.Elapsed.TotalMilliseconds)
            Error       = $null
        }
    } catch [System.Net.WebException] {
        $sw.Stop()
        if ($_.Response) {
            $status = [int]$_.Response.StatusCode
            $_.Response.Close()
            return @{
                Success     = ($status -ge 200 -and $status -lt 400)
                StatusCode  = $status
                LatencyMs   = [math]::Round($sw.Elapsed.TotalMilliseconds)
                Error       = "HTTP $status"
            }
        }
        return @{
            Success     = $false
            StatusCode  = 0
            LatencyMs   = [math]::Round($sw.Elapsed.TotalMilliseconds)
            Error       = $_.Exception.Message
        }
    } catch {
        $sw.Stop()
        return @{
            Success     = $false
            StatusCode  = 0
            LatencyMs   = [math]::Round($sw.Elapsed.TotalMilliseconds)
            Error       = $_.Exception.Message
        }
    }
}

function Run-Audit {
    $now = Get-Date -Format "yyyy-MM-dd HH:mm:ss"

    # 1. MySQL
    $mysqlUp = Test-TcpPort -TargetPort $MysqlPort

    # 2. Backend Health
    $healthRes = Test-HttpProbe -Url "http://localhost:$BackendPort/api/health"
    if (-not $healthRes.Success) {
        $healthRes = Test-HttpProbe -Url "http://localhost:$BackendPort/api/v1/health"
    }

    # 3. Backend Readiness (Database connectivity)
    $readyRes = Test-HttpProbe -Url "http://localhost:$BackendPort/api/v1/ready"

    # 4. Frontend Web Portal
    $frontRes = Test-HttpProbe -Url "http://localhost:$FrontendPort"
    if (-not $frontRes.Success) {
        $altPort = if ($FrontendPort -eq 3002) { 3000 } else { 3002 }
        $altRes = Test-HttpProbe -Url "http://localhost:$altPort"
        if ($altRes.Success) {
            $frontRes = $altRes
            $FrontendPort = $altPort
        }
    }

    $allPassed = ($mysqlUp -and $healthRes.Success -and $readyRes.Success -and $frontRes.Success)

    if ($Json) {
        [PSCustomObject]@{
            Timestamp       = $now
            AllHealthy      = $allPassed
            MySQL           = @{ Port = $MysqlPort; Status = if ($mysqlUp) { "UP" } else { "DOWN" } }
            BackendHealth   = @{ Url = "http://localhost:$BackendPort/api/health"; Status = if ($healthRes.Success) { "RUNNING" } else { "DOWN" }; LatencyMs = $healthRes.LatencyMs }
            BackendReady    = @{ Url = "http://localhost:$BackendPort/api/v1/ready"; Status = if ($readyRes.Success) { "READY" } else { "NOT_READY" }; LatencyMs = $readyRes.LatencyMs }
            Frontend        = @{ Url = "http://localhost:$FrontendPort"; Status = if ($frontRes.Success) { "RUNNING" } else { "DOWN" }; LatencyMs = $frontRes.LatencyMs }
        } | ConvertTo-Json -Depth 4
        return $allPassed
    }

    Write-Host ""
    Write-Host "============================================================" -ForegroundColor Cyan
    Write-Host " GHMS Service Health Check Matrix [$now]" -ForegroundColor Cyan
    Write-Host "============================================================" -ForegroundColor Cyan

    # Row 1: MySQL
    if ($mysqlUp) {
        Write-Host " [PASS] MySQL Database (Port $MysqlPort)             " -NoNewline -ForegroundColor Green
        Write-Host " [RUNNING / LISTENING]" -ForegroundColor Green
    } else {
        Write-Host " [FAIL] MySQL Database (Port $MysqlPort)             " -NoNewline -ForegroundColor Red
        Write-Host " [STOPPED / REFUSED]" -ForegroundColor Red
        Write-Host "        -> Start MySQL in the XAMPP Control Panel." -ForegroundColor Yellow
    }

    # Row 2: Backend Health
    if ($healthRes.Success) {
        Write-Host " [PASS] Backend API Health (Port $BackendPort)         " -NoNewline -ForegroundColor Green
        Write-Host " [RUNNING - $($healthRes.LatencyMs)ms]" -ForegroundColor Green
    } else {
        Write-Host " [FAIL] Backend API Health (Port $BackendPort)         " -NoNewline -ForegroundColor Red
        Write-Host " [STOPPED / REFUSED]" -ForegroundColor Red
        Write-Host "        -> Start backend with START-GHMS.bat or npm run backend:dev" -ForegroundColor Yellow
    }

    # Row 3: Backend DB Readiness
    if ($readyRes.Success) {
        Write-Host " [PASS] Backend DB Connectivity                   " -NoNewline -ForegroundColor Green
        Write-Host " [READY / CONNECTED]" -ForegroundColor Green
    } else {
        Write-Host " [FAIL] Backend DB Connectivity                   " -NoNewline -ForegroundColor Red
        Write-Host " [NOT READY / DISCONNECTED]" -ForegroundColor Red
    }

    # Row 4: Frontend
    if ($frontRes.Success) {
        Write-Host " [PASS] Frontend Next.js Portal (Port $FrontendPort)      " -NoNewline -ForegroundColor Green
        Write-Host " [RUNNING - $($frontRes.LatencyMs)ms]" -ForegroundColor Green
    } else {
        Write-Host " [FAIL] Frontend Next.js Portal (Port $FrontendPort)      " -NoNewline -ForegroundColor Red
        Write-Host " [STOPPED / REFUSED]" -ForegroundColor Red
        Write-Host "        -> Start frontend with START-GHMS.bat or npm run dev" -ForegroundColor Yellow
    }

    # Diagnostics: Build Isolation and Manifest Integrity
    $scriptDir = $PSScriptRoot
    $root = if ((Split-Path -Leaf $scriptDir) -eq "scripts") { Split-Path -Parent $scriptDir } else { $scriptDir }
    $devDir = Join-Path $root ".next-dev"
    $prodDir = Join-Path $root ".next"
    $prodBuildId = Join-Path $prodDir "BUILD_ID"

    Write-Host "------------------------------------------------------------" -ForegroundColor DarkGray
    Write-Host " Build Artifacts & Directory Isolation:" -ForegroundColor Yellow
    Write-Host "   Development Directory (.next-dev): $(if (Test-Path $devDir) { '[PRESENT - Isolated]' } else { '[EMPTY / CLEAN]' })" -ForegroundColor Gray
    Write-Host "   Production Directory (.next):     $(if (Test-Path $prodBuildId) { '[READY - Valid BUILD_ID]' } elseif (Test-Path $prodDir) { '[INCOMPLETE - Run npm run build]' } else { '[NOT BUILT]' })" -ForegroundColor Gray

    Write-Host "============================================================" -ForegroundColor Cyan
    if ($allPassed) {
        Write-Host " Overall Status: [OPERATIONAL] All 4 tiers are healthy." -ForegroundColor Green
        Write-Host " Web Portal: http://localhost:$FrontendPort" -ForegroundColor Cyan
        Write-Host " Backend API: http://localhost:$BackendPort/api" -ForegroundColor Cyan
    } else {
        Write-Host " Overall Status: [DEGRADED] One or more services require attention." -ForegroundColor Red
    }
    Write-Host ""
    return $allPassed
}

if ($Watch) {
    Write-Host "Entering Continuous Monitoring mode (Interval: ${IntervalSeconds}s). Press Ctrl+C to exit." -ForegroundColor Cyan
    while ($true) {
        Run-Audit | Out-Null
        Start-Sleep -Seconds $IntervalSeconds
    }
} else {
    $healthy = Run-Audit
    if ($healthy) { exit 0 } else { exit 1 }
}
