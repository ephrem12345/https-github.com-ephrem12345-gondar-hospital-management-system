<#
.SYNOPSIS
    Gondar Hospital Management System (GHMS) - Health Watchdog & Auto-Recovery
.DESCRIPTION
    Continuously monitors GHMS services (MySQL port 3306, Express Backend port 4000,
    Next.js Frontend port 3002). Automatically detects failures, logs events to logs/watchdog.log,
    and applies bounded automatic restarts with exponential backoff.
.PARAMETER IntervalSeconds
    Interval between health checks (default: 15 seconds).
.PARAMETER MaxRetries
    Maximum restart attempts allowed per service in the window (default: 3).
.PARAMETER WindowMinutes
    Time window for counting restart attempts (default: 5 minutes).
.PARAMETER AutoRecover
    Switch to enable automatic restart on failure.
.PARAMETER Once
    Perform a single check cycle and exit (useful for automated verification).
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

$scriptDir = $PSScriptRoot
if ((Split-Path -Leaf $scriptDir) -eq "scripts") {
    $projectRoot = Split-Path -Parent $scriptDir
} else {
    $projectRoot = $scriptDir
}

$logsDir = Join-Path $projectRoot "logs"
if (-not (Test-Path -LiteralPath $logsDir)) {
    New-Item -ItemType Directory -Path $logsDir -Force | Out-Null
}
$logFile = Join-Path $logsDir "watchdog.log"
$startScript = Join-Path $projectRoot "scripts\start-ghms.ps1"

# Exponential backoff schedule in seconds
$backoffSeconds = @(5, 15, 45)

# Track restart timestamps per service
$restartHistory = @{
    MySQL    = [System.Collections.Generic.List[datetime]]::new()
    Backend  = [System.Collections.Generic.List[datetime]]::new()
    Frontend = [System.Collections.Generic.List[datetime]]::new()
}

$consecutiveFailures = @{
    MySQL    = 0
    Backend  = 0
    Frontend = 0
}

function Write-WatchdogLog {
    param (
        [string]$Service,
        [string]$EventType, # CHECK, FAILURE, RESTART, BACKOFF, ALERT, SUCCESS
        [string]$Message,
        [string]$Color = "Gray"
    )
    $ts = Get-Date -Format "yyyy-MM-dd HH:mm:ss"
    $logLine = "[$ts] [$Service] [$EventType] $Message"
    
    # Write to console
    switch ($EventType) {
        "SUCCESS" { Write-Host $logLine -ForegroundColor Green }
        "CHECK"   { Write-Host $logLine -ForegroundColor Cyan }
        "RESTART" { Write-Host $logLine -ForegroundColor Yellow }
        "BACKOFF" { Write-Host $logLine -ForegroundColor DarkYellow }
        "FAILURE" { Write-Host $logLine -ForegroundColor Red }
        "ALERT"   { Write-Host $logLine -ForegroundColor Magenta }
        default   { Write-Host $logLine -ForegroundColor $Color }
    }

    # Append to logfile safely
    try {
        $logLine | Out-File -FilePath $logFile -Append -Encoding UTF8
    } catch { }
}

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
    param ([string]$Url, [int]$TimeoutMs = 3000)
    try {
        $req = [System.Net.HttpWebRequest]::Create($Url)
        $req.Timeout = $TimeoutMs
        $req.KeepAlive = $false
        $req.Method = "GET"
        $resp = $req.GetResponse()
        $status = [int]$resp.StatusCode
        $resp.Close()
        return ($status -ge 200 -and $status -lt 400)
    } catch [System.Net.WebException] {
        if ($_.Response) {
            $status = [int]$_.Response.StatusCode
            $_.Response.Close()
            return ($status -ge 200 -and $status -lt 400)
        }
        return $false
    } catch {
        return $false
    }
}

function Clean-History {
    param ([string]$Service)
    $cutoff = (Get-Date).AddMinutes(-$WindowMinutes)
    $validTimes = [System.Collections.Generic.List[datetime]]::new()
    foreach ($t in $restartHistory[$Service]) {
        if ($t -ge $cutoff) {
            $validTimes.Add($t)
        }
    }
    $restartHistory[$Service] = $validTimes
}

function Should-Attempt-Restart {
    param ([string]$Service)
    Clean-History -Service $Service
    $recentCount = $restartHistory[$Service].Count
    if ($recentCount -ge $MaxRetries) {
        # Check time since most recent attempt
        $lastAttempt = if ($restartHistory[$Service].Count -gt 0) { $restartHistory[$Service][-1] } else { [datetime]::MinValue }
        $secondsSinceLast = ((Get-Date) - $lastAttempt).TotalSeconds

        # Cooldown period of 60 seconds before allowing another recovery cycle
        if ($secondsSinceLast -lt 60) {
            $remaining = [math]::Ceiling(60 - $secondsSinceLast)
            Write-WatchdogLog -Service $Service -EventType "BACKOFF" -Message "Reached $MaxRetries retries in window. Cooling down ($remaining seconds remaining) before next recovery attempt..."
            return $false
        } else {
            # Cooldown elapsed: reset half of history to allow bounded progressive retries
            Write-WatchdogLog -Service $Service -EventType "ALERT" -Message "Cooldown period elapsed. Resuming auto-recovery for $Service..."
            $restartHistory[$Service].Clear()
            return $true
        }
    }
    return $true
}

function Restart-MySQL {
    if (-not (Should-Attempt-Restart -Service "MySQL")) { return }
    $attemptIndex = $restartHistory["MySQL"].Count
    $backoff = if ($attemptIndex -lt $backoffSeconds.Length) { $backoffSeconds[$attemptIndex] } else { 45 }
    
    Write-WatchdogLog -Service "MySQL" -EventType "BACKOFF" -Message "Applying exponential backoff: waiting $backoff seconds before restart attempt $($attemptIndex + 1)/$MaxRetries..."
    Start-Sleep -Seconds $backoff

    $restartHistory["MySQL"].Add((Get-Date))
    Write-WatchdogLog -Service "MySQL" -EventType "RESTART" -Message "Initiating MySQL restart attempt $($attemptIndex + 1)/$MaxRetries..."

    $xamppMysqlBat = "C:\xampp\mysql_start.bat"
    $xamppMysqld = "C:\xampp\mysql\bin\mysqld.exe"

    if (Test-Path -LiteralPath $xamppMysqlBat) {
        Start-Process -FilePath "cmd.exe" -ArgumentList "/c", "`"$xamppMysqlBat`"" -WindowStyle Hidden
    } elseif (Test-Path -LiteralPath $xamppMysqld) {
        Start-Process -FilePath $xamppMysqld -ArgumentList "--defaults-file=C:\xampp\mysql\bin\my.ini", "--standalone" -WindowStyle Hidden
    }

    # Wait for MySQL readiness
    for ($i = 0; $i -lt 15; $i++) {
        Start-Sleep -Seconds 1
        if (Test-TcpPort -TargetPort $MysqlPort) {
            Write-WatchdogLog -Service "MySQL" -EventType "SUCCESS" -Message "MySQL successfully restored on port $MysqlPort."
            $consecutiveFailures["MySQL"] = 0
            return
        }
    }
    Write-WatchdogLog -Service "MySQL" -EventType "FAILURE" -Message "MySQL failed to respond after restart attempt."
}

function Restart-Backend {
    if (-not (Should-Attempt-Restart -Service "Backend")) { return }
    $attemptIndex = $restartHistory["Backend"].Count
    $backoff = if ($attemptIndex -lt $backoffSeconds.Length) { $backoffSeconds[$attemptIndex] } else { 45 }

    Write-WatchdogLog -Service "Backend" -EventType "BACKOFF" -Message "Applying exponential backoff: waiting $backoff seconds before restart attempt $($attemptIndex + 1)/$MaxRetries..."
    Start-Sleep -Seconds $backoff

    $restartHistory["Backend"].Add((Get-Date))
    Write-WatchdogLog -Service "Backend" -EventType "RESTART" -Message "Initiating Backend restart attempt $($attemptIndex + 1)/$MaxRetries..."

    $backendPath = Join-Path $projectRoot "backend"
    $backendLog = Join-Path $logsDir "backend.log"
    $backendScript = "npm run dev"

    $backendArgs = "/c title GHMS Backend API (Port $BackendPort) && $backendScript >> `"$backendLog`" 2>&1"
    Start-Process -FilePath "cmd.exe" -ArgumentList $backendArgs -WorkingDirectory $backendPath -WindowStyle Hidden | Out-Null

    # Wait for Backend readiness
    $readyUrl = "http://localhost:$BackendPort/api/ready"
    $healthUrl = "http://localhost:$BackendPort/api/health"
    for ($i = 0; $i -lt 30; $i++) {
        Start-Sleep -Seconds 1
        if ((Test-HttpProbe -Url $readyUrl) -or (Test-HttpProbe -Url $healthUrl)) {
            Write-WatchdogLog -Service "Backend" -EventType "SUCCESS" -Message "Backend API successfully restored on port $BackendPort."
            $consecutiveFailures["Backend"] = 0
            return
        }
    }
    Write-WatchdogLog -Service "Backend" -EventType "FAILURE" -Message "Backend API did not reach ready state after restart attempt."
}

function Restart-Frontend {
    if (-not (Should-Attempt-Restart -Service "Frontend")) { return }
    $attemptIndex = $restartHistory["Frontend"].Count
    $backoff = if ($attemptIndex -lt $backoffSeconds.Length) { $backoffSeconds[$attemptIndex] } else { 45 }

    Write-WatchdogLog -Service "Frontend" -EventType "BACKOFF" -Message "Applying exponential backoff: waiting $backoff seconds before restart attempt $($attemptIndex + 1)/$MaxRetries..."
    Start-Sleep -Seconds $backoff

    $restartHistory["Frontend"].Add((Get-Date))
    Write-WatchdogLog -Service "Frontend" -EventType "RESTART" -Message "Initiating Frontend restart attempt $($attemptIndex + 1)/$MaxRetries..."

    $frontendLog = Join-Path $logsDir "frontend.log"
    $prodBuildId = Join-Path $projectRoot ".next\BUILD_ID"
    $frontScript = if (Test-Path -LiteralPath $prodBuildId) {
        "npm run start:frontend"
    } else {
        "npm run dev:frontend"
    }

    $frontArgs = "/c title GHMS Frontend Web App (Port $FrontendPort) && $frontScript >> `"$frontendLog`" 2>&1"
    Start-Process -FilePath "cmd.exe" -ArgumentList $frontArgs -WorkingDirectory $projectRoot -WindowStyle Hidden | Out-Null

    # Wait for Frontend HTTP availability
    $frontendUrl = "http://localhost:$FrontendPort"
    for ($i = 0; $i -lt 30; $i++) {
        Start-Sleep -Seconds 1
        if (Test-HttpProbe -Url $frontendUrl) {
            Write-WatchdogLog -Service "Frontend" -EventType "SUCCESS" -Message "Frontend portal successfully restored on port $FrontendPort."
            $consecutiveFailures["Frontend"] = 0
            return
        }
    }
    Write-WatchdogLog -Service "Frontend" -EventType "FAILURE" -Message "Frontend portal did not respond after restart attempt."
}

function Run-HealthCycle {
    Write-WatchdogLog -Service "Watchdog" -EventType "CHECK" -Message "Starting service health evaluation cycle..."

    # 1. MySQL Port Check
    $mysqlOk = Test-TcpPort -TargetPort $MysqlPort
    if ($mysqlOk) {
        $consecutiveFailures["MySQL"] = 0
        Write-WatchdogLog -Service "MySQL" -EventType "CHECK" -Message "Port $MysqlPort is healthy."
    } else {
        $consecutiveFailures["MySQL"]++
        Write-WatchdogLog -Service "MySQL" -EventType "FAILURE" -Message "Port $MysqlPort is unreachable / connection refused."
        if ($AutoRecover) {
            Restart-MySQL
        }
    }

    # 2. Backend Health & Readiness Check
    $backendHealthUrl = "http://localhost:$BackendPort/api/health"
    $backendReadyUrl = "http://localhost:$BackendPort/api/ready"
    $backendHealthOk = Test-HttpProbe -Url $backendHealthUrl
    $backendReadyOk = Test-HttpProbe -Url $backendReadyUrl

    if ($backendHealthOk -and $backendReadyOk) {
        $consecutiveFailures["Backend"] = 0
        Write-WatchdogLog -Service "Backend" -EventType "CHECK" -Message "API health & database readiness verified on port $BackendPort."
    } elseif ($backendHealthOk) {
        Write-WatchdogLog -Service "Backend" -EventType "CHECK" -Message "API server is alive but database readiness probe is degraded."
    } else {
        $consecutiveFailures["Backend"]++
        Write-WatchdogLog -Service "Backend" -EventType "FAILURE" -Message "Backend API on port $BackendPort is unresponsive / connection refused."
        if ($AutoRecover -and $mysqlOk) {
            Restart-Backend
        }
    }

    # 3. Frontend Web Server Check
    $frontendUrl = "http://localhost:$FrontendPort"
    $frontendOk = Test-HttpProbe -Url $frontendUrl
    if ($frontendOk) {
        $consecutiveFailures["Frontend"] = 0
        Write-WatchdogLog -Service "Frontend" -EventType "CHECK" -Message "Web portal on port $FrontendPort is healthy."
    } else {
        $consecutiveFailures["Frontend"]++
        Write-WatchdogLog -Service "Frontend" -EventType "FAILURE" -Message "Frontend web portal on port $FrontendPort is unreachable / connection refused."
        if ($AutoRecover) {
            Restart-Frontend
        }
    }

    $allHealthy = ($mysqlOk -and $backendHealthOk -and $frontendOk)
    if ($allHealthy) {
        Write-WatchdogLog -Service "Watchdog" -EventType "SUCCESS" -Message "All GHMS services are operational."
    } else {
        Write-WatchdogLog -Service "Watchdog" -EventType "CHECK" -Message "System is in degraded state."
    }
    return $allHealthy
}

Write-Host "============================================================" -ForegroundColor Cyan
Write-Host " GHMS Automated Health Monitor & Auto-Recovery Watchdog" -ForegroundColor Cyan
Write-Host " Project: Gondar Hospital Management System" -ForegroundColor Cyan
Write-Host " Log File: $logFile" -ForegroundColor Cyan
Write-Host " Auto-Recovery: $(if ($AutoRecover) { 'ENABLED' } else { 'DISABLED' })" -ForegroundColor Cyan
Write-Host " Max Retries: $MaxRetries per $WindowMinutes minutes" -ForegroundColor Cyan
Write-Host "============================================================" -ForegroundColor Cyan

if ($Once) {
    $res = Run-HealthCycle
    if ($res) { exit 0 } else { exit 1 }
}

Write-Host "Starting continuous monitoring every $IntervalSeconds seconds. Press Ctrl+C to stop." -ForegroundColor Gray
while ($true) {
    Run-HealthCycle | Out-Null
    Start-Sleep -Seconds $IntervalSeconds
}
