<#
.SYNOPSIS
    Gondar Hospital Management System (GHMS) - Health and Operational Monitor
.DESCRIPTION
    Validates end-to-end operational health of GHMS:
    1. MySQL Database connectivity (port 3306)
    2. Backend API liveness (http://localhost:4000/api/v1/health)
    3. Backend Database readiness (http://localhost:4000/api/v1/ready)
    4. Frontend Web App HTTP response (http://localhost:3000)
    Supports continuous watch mode (-Watch) and automatic bounded recovery (-AutoRecover).
.EXAMPLE
    .\check-ghms-health.ps1
    .\check-ghms-health.ps1 -Watch -IntervalSeconds 15
    .\check-ghms-health.ps1 -AutoRecover
    .\check-ghms-health.ps1 -Json
#>

[CmdletBinding()]
param (
    [int]$FrontendPort = 3000,
    [int]$BackendPort = 4000,
    [int]$MysqlPort = 3306,
    [switch]$Watch,
    [int]$IntervalSeconds = 30,
    [switch]$AutoRecover,
    [int]$MaxRecoverAttempts = 2,
    [switch]$Json
)

$projectRoot = $PSScriptRoot
$logsDir = Join-Path $projectRoot "logs"
$logFile = Join-Path $logsDir "health-monitor.log"

if (-not (Test-Path -LiteralPath $logsDir)) {
    New-Item -ItemType Directory -Path $logsDir -Force | Out-Null
}

[System.Net.ServicePointManager]::DefaultConnectionLimit = 100

function Log-HealthEvent {
    param ([string]$Level, [string]$Message)
    $timestamp = (Get-Date).ToString("yyyy-MM-dd HH:mm:ss")
    $logLine = "[$timestamp] [$Level] $Message"
    Add-Content -Path $logFile -Value $logLine -Encoding UTF8
}

function Test-TcpPort {
    param ([string]$HostName = "localhost", [int]$Port, [int]$TimeoutMs = 1500)
    foreach ($target in @($HostName, "localhost", "127.0.0.1", "::1")) {
        $client = $null
        try {
            $client = New-Object System.Net.Sockets.TcpClient
            $async = $client.BeginConnect($target, $Port, $null, $null)
            if ($async.AsyncWaitHandle.WaitOne($TimeoutMs, $false)) {
                $client.EndConnect($async)
                return $true
            }
        } catch { } finally {
            if ($client) { $client.Close() }
        }
    }

    try {
        $conns = Get-NetTCPConnection -LocalPort $Port -ErrorAction SilentlyContinue
        if ($conns) { return $true }
    } catch { }

    return $false
}

function Test-HttpProbe {
    param ([string]$Url, [int]$TimeoutSec = 10)
    $stopwatch = [System.Diagnostics.Stopwatch]::StartNew()
    $result = [PSCustomObject]@{
        Url = $Url
        Healthy = $false
        StatusCode = 0
        LatencyMs = 0
        ErrorMessage = ""
        Payload = $null
    }

    $resp = $null
    $reader = $null

    try {
        $req = [System.Net.HttpWebRequest]::Create($Url)
        $req.Timeout = $TimeoutSec * 1000
        $req.Method = "GET"
        $req.KeepAlive = $false
        $req.UserAgent = "GHMS-HealthMonitor/1.0"
        
        $resp = $req.GetResponse()
        $stopwatch.Stop()
        $result.LatencyMs = $stopwatch.ElapsedMilliseconds
        $result.StatusCode = [int]$resp.StatusCode
        
        $reader = New-Object System.IO.StreamReader($resp.GetResponseStream())
        $body = $reader.ReadToEnd()

        $result.Healthy = ($result.StatusCode -ge 200 -and $result.StatusCode -lt 400)
        try {
            $result.Payload = $body | ConvertFrom-Json
        } catch {
            $result.Payload = $body
        }
    } catch [System.Net.WebException] {
        $stopwatch.Stop()
        $result.LatencyMs = $stopwatch.ElapsedMilliseconds
        if ($_.Response) {
            $result.StatusCode = [int]$_.Response.StatusCode
            $result.ErrorMessage = "HTTP $($result.StatusCode)"
            $_.Response.Close()
        } else {
            $result.ErrorMessage = $_.Message
        }
    } catch {
        $stopwatch.Stop()
        $result.LatencyMs = $stopwatch.ElapsedMilliseconds
        $result.ErrorMessage = $_.Message
    } finally {
        if ($reader) { $reader.Close(); $reader.Dispose() }
        if ($resp) { $resp.Close(); $resp.Dispose() }
    }

    return $result
}

function Execute-HealthAudit {
    $timestamp = (Get-Date).ToString("yyyy-MM-dd HH:mm:ss")
    
    # 1. Backend Health Probe
    $healthProbe = Test-HttpProbe -Url "http://localhost:$BackendPort/api/v1/health"
    
    # 2. Backend Readiness Probe (queries database SELECT 1)
    $readyProbe = Test-HttpProbe -Url "http://localhost:$BackendPort/api/v1/ready"
    
    # 3. MySQL Database Check
    $mysqlOk = $false
    if ($readyProbe.Healthy -and $readyProbe.Payload -and $readyProbe.Payload.data.database -eq "connected") {
        $mysqlOk = $true
    } else {
        $mysqlOk = Test-TcpPort -TargetPort $MysqlPort
    }

    # 4. Frontend HTTP Probe
    $frontendProbe = Test-HttpProbe -Url "http://localhost:$FrontendPort/"

    $allHealthy = ($mysqlOk -and $healthProbe.Healthy -and $readyProbe.Healthy -and $frontendProbe.Healthy)

    $report = [PSCustomObject]@{
        Timestamp = $timestamp
        AllHealthy = $allHealthy
        Services = @(
            [PSCustomObject]@{
                Service = "MySQL Database"
                Target = "127.0.0.1:$MysqlPort"
                Status = if ($mysqlOk) { "UP" } else { "DOWN" }
                Healthy = $mysqlOk
                LatencyMs = if ($readyProbe.Healthy) { "$($readyProbe.LatencyMs)ms" } else { "-" }
                Details = if ($mysqlOk) { "Database connected (verified via Prisma SELECT 1)" } else { "Database unreachable. Start MySQL in XAMPP." }
            },
            [PSCustomObject]@{
                Service = "Backend Liveness"
                Target = "http://localhost:$BackendPort/api/v1/health"
                Status = if ($healthProbe.Healthy) { "UP" } else { "DOWN" }
                Healthy = $healthProbe.Healthy
                LatencyMs = "$($healthProbe.LatencyMs)ms"
                Details = if ($healthProbe.Healthy) { "HTTP $($healthProbe.StatusCode) - Service alive" } else { $healthProbe.ErrorMessage }
            },
            [PSCustomObject]@{
                Service = "Backend Readiness"
                Target = "http://localhost:$BackendPort/api/v1/ready"
                Status = if ($readyProbe.Healthy) { "READY" } else { "NOT_READY" }
                Healthy = $readyProbe.Healthy
                LatencyMs = "$($readyProbe.LatencyMs)ms"
                Details = if ($readyProbe.Healthy) { "Database connection verified (SELECT 1)" } else { $readyProbe.ErrorMessage }
            },
            [PSCustomObject]@{
                Service = "Frontend Web Portal"
                Target = "http://localhost:$FrontendPort"
                Status = if ($frontendProbe.Healthy) { "UP" } else { "DOWN" }
                Healthy = $frontendProbe.Healthy
                LatencyMs = "$($frontendProbe.LatencyMs)ms"
                Details = if ($frontendProbe.Healthy) { "HTTP $($frontendProbe.StatusCode) - Ready for user requests" } else { $frontendProbe.ErrorMessage }
            }
        )
    }

    return $report
}

$recoverAttempts = 0

do {
    $audit = Execute-HealthAudit

    if ($Json) {
        $audit | ConvertTo-Json -Depth 4
    } else {
        Clear-Host
        Write-Host "========================================================================" -ForegroundColor Cyan
        Write-Host " Gondar Hospital Management System (GHMS) - Health Telemetry" -ForegroundColor Cyan
        Write-Host " Timestamp: $($audit.Timestamp)" -ForegroundColor Gray
        Write-Host "========================================================================" -ForegroundColor Cyan
        Write-Host ""

        foreach ($svc in $audit.Services) {
            $badgeColor = if ($svc.Healthy) { "Green" } else { "Red" }
            $badge = if ($svc.Healthy) { "[PASS]" } else { "[FAIL]" }
            Write-Host "$badge " -ForegroundColor $badgeColor -NoNewline
            Write-Host "$($svc.Service.PadRight(22)) " -ForegroundColor White -NoNewline
            Write-Host "$($svc.Status.PadRight(10)) " -ForegroundColor $badgeColor -NoNewline
            Write-Host "$($svc.LatencyMs.PadRight(8)) " -ForegroundColor DarkGray -NoNewline
            Write-Host "$($svc.Details)" -ForegroundColor Gray
        }

        Write-Host ""
        Write-Host "------------------------------------------------------------------------" -ForegroundColor DarkGray
        if ($audit.AllHealthy) {
            Write-Host " Overall System State: OPERATIONAL (All services responding normally)" -ForegroundColor Green
            Log-HealthEvent "INFO" "System operational. All 4 services passed health audit."
        } else {
            Write-Host " Overall System State: DEGRADED / UNHEALTHY" -ForegroundColor Red
            Log-HealthEvent "WARN" "System degraded. One or more services failed health audit."
        }
        Write-Host "------------------------------------------------------------------------" -ForegroundColor DarkGray
    }

    # Auto-recovery logic
    if (-not $audit.AllHealthy -and $AutoRecover) {
        if ($recoverAttempts -lt $MaxRecoverAttempts) {
            $recoverAttempts++
            Log-HealthEvent "WARN" "Initiating bounded auto-recovery attempt $recoverAttempts of $MaxRecoverAttempts..."
            Write-Host "[RECOVERY] Attempting bounded restart ($recoverAttempts/$MaxRecoverAttempts)..." -ForegroundColor Yellow
            
            $launcherScript = Join-Path $projectRoot "start-ghms.ps1"
            & powershell.exe -NoProfile -ExecutionPolicy Bypass -File "$launcherScript" -DetachFrontend
            Start-Sleep -Seconds 10
            continue
        } else {
            Log-HealthEvent "ERROR" "Max auto-recovery attempts ($MaxRecoverAttempts) reached. Manual intervention required."
            Write-Host "[RECOVERY] Maximum recovery attempts ($MaxRecoverAttempts) exhausted." -ForegroundColor Red
            Write-Host "Manual intervention is required. Check logs at: $logFile" -ForegroundColor Yellow
        }
    }

    if ($Watch) {
        Write-Host "`nRefreshing in $IntervalSeconds seconds (Press Ctrl+C to stop)..." -ForegroundColor DarkGray
        Start-Sleep -Seconds $IntervalSeconds
    }
} while ($Watch)
