<#
.SYNOPSIS
    Gondar Hospital Management System (GHMS) - Unified Service Launcher
.DESCRIPTION
    Starts the GHMS MySQL database (port 3306), Express backend API (port 4000), and
    Next.js frontend web application (port 3000) in proper dependency order.
    Performs pre-flight checks, verifies HTTP readiness, manages port collisions,
    and prevents duplicate processes without terminating unrelated applications.
.EXAMPLE
    .\scripts\start-ghms.ps1 -OpenBrowser
    .\scripts\start-ghms.ps1 -VerifyOnly
    .\scripts\start-ghms.ps1 -Force
    .\scripts\start-ghms.ps1 -Production
#>

[CmdletBinding()]
param (
    [int]$Port = 3002,
    [int]$BackendPort = 4000,
    [int]$MysqlPort = 3306,
    [switch]$Force,
    [switch]$Clean,
    [switch]$OpenBrowser,
    [switch]$VerifyOnly,
    [switch]$SkipBackend,
    [switch]$Production,
    [switch]$DetachFrontend,
    [switch]$Background
)

$ErrorActionPreference = "Continue"
$script:HasFailure = $false

# Determine project root regardless of where script was invoked from
$scriptDir = $PSScriptRoot
if ((Split-Path -Leaf $scriptDir) -eq "scripts") {
    $projectRoot = Split-Path -Parent $scriptDir
} else {
    $projectRoot = $scriptDir
}

$backendPath = Join-Path $projectRoot "backend"
$logsPath = Join-Path $projectRoot "logs"

if (-not (Test-Path -LiteralPath $logsPath)) {
    New-Item -ItemType Directory -Path $logsPath -Force | Out-Null
}

function Write-Step {
    param ([string]$StepNumber, [string]$Title)
    Write-Host ""
    Write-Host "[$StepNumber] $Title" -ForegroundColor Yellow
}

function Write-Result {
    param ([string]$Message, [string]$Color = "Gray")
    Write-Host "      $Message" -ForegroundColor $Color
}

function Test-TcpPort {
    param (
        [string]$TargetHost = "localhost",
        [int]$TargetPort,
        [int]$TimeoutMs = 1500
    )
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

[System.Net.ServicePointManager]::DefaultConnectionLimit = 100

function Test-HttpEndpoint {
    param ([string]$Url, [int]$TimeoutSec = 5)
    try {
        $req = [System.Net.HttpWebRequest]::Create($Url)
        $req.Proxy = $null
        $req.KeepAlive = $false
        $req.Timeout = $TimeoutSec * 1000
        $req.Method = "GET"
        $resp = $req.GetResponse()
        $status = [int]$resp.StatusCode
        $resp.Close()
        return ($status -ge 200 -and $status -lt 400)
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

function Stop-GhmsProcessTree {
    param ([int[]]$ProcessIds)
    foreach ($processId in $ProcessIds) {
        if (Test-GhmsProcess -ProcessId $processId) {
            Write-Result "Stopping GHMS process tree (PID $processId)..." "Yellow"
            cmd /c "taskkill /PID $processId /F /T 2>nul" | Out-Null
        } else {
            $details = Get-ProcessDetails -ProcessId $processId
            $name = if ($details) { $details.Name } else { "Unknown" }
            $cmd = if ($details) { $details.CommandLine } else { "Unknown" }
            Write-Result "REFUSING to stop PID $processId ($name) - unrelated foreign application:" "Red"
            Write-Result "  Command: $cmd" "DarkGray"
            $script:HasFailure = $true
        }
    }
}

function Wait-ForPortRelease {
    param ([int]$TargetPort, [int]$Attempts = 8)
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
Write-Host " Gondar Hospital Management System (GHMS) - Launcher" -ForegroundColor Cyan
Write-Host " Quality Healthcare * Better Service * Healthier Community" -ForegroundColor Cyan
Write-Host " Mode: $(if ($Production) { 'PRODUCTION' } else { 'DEVELOPMENT' })" -ForegroundColor Cyan
Write-Host "============================================================" -ForegroundColor Cyan

# -------------------------------------------------------------------------
# Step 1: Pre-flight checks (Node, npm, directories, .env)
# -------------------------------------------------------------------------
Write-Step "1/5" "Performing Pre-flight Environment Checks..."

# Check Node.js
try {
    $nodeVer = & node -v 2>&1
    Write-Result "[OK] Node.js is installed ($nodeVer)" "Green"
} catch {
    Write-Result "[X] Node.js is NOT found in PATH. Please install Node.js (v18+) and retry." "Red"
    exit 1
}

# Check npm
try {
    $npmVer = & npm -v 2>&1
    Write-Result "[OK] npm is installed (v$npmVer)" "Green"
} catch {
    Write-Result "[X] npm is NOT found in PATH." "Red"
    exit 1
}

# Check dependencies
if (-not (Test-Path -LiteralPath (Join-Path $projectRoot "node_modules"))) {
    Write-Result "[!] Frontend dependencies missing. Installing..." "Yellow"
    & npm install --prefix "$projectRoot"
}
if (-not (Test-Path -LiteralPath (Join-Path $backendPath "node_modules"))) {
    Write-Result "[!] Backend dependencies missing. Installing..." "Yellow"
    & npm install --prefix "$backendPath"
}

# Check environment files
$frontEnv = Join-Path $projectRoot ".env"
$frontEnvLocal = Join-Path $projectRoot ".env.local"
$backEnv = Join-Path $backendPath ".env"

if (-not (Test-Path -LiteralPath $frontEnv) -and -not (Test-Path -LiteralPath $frontEnvLocal)) {
    Write-Result "[!] Frontend .env missing. Creating standard .env..." "Yellow"
    @"
NEXT_PUBLIC_API_URL=http://localhost:$BackendPort/api/v1
NEXT_PUBLIC_API_BASE_URL=http://localhost:$BackendPort/api/v1
BACKEND_ORIGIN=http://localhost:$BackendPort
PORT=$Port
# DATABASE_URL belongs exclusively in backend/.env — never in frontend environment files.
"@ | Set-Content -Path $frontEnvLocal -Encoding UTF8
}

if (-not (Test-Path -LiteralPath $backEnv)) {
    Write-Result "[!] Backend .env missing! Please restore backend/.env before proceeding." "Red"
    $script:HasFailure = $true
}

# -------------------------------------------------------------------------
# Step 2: MySQL Database (port 3306)
# -------------------------------------------------------------------------
Write-Step "2/5" "Verifying MySQL Database on port $MysqlPort..."
$mysqlRunning = Test-TcpPort -TargetPort $MysqlPort

if (-not $mysqlRunning) {
    Write-Result "[!] MySQL is not responding on port $MysqlPort. Attempting to start XAMPP MySQL..." "Yellow"
    $xamppMysqlBat = "C:\xampp\mysql_start.bat"
    $xamppMysqld = "C:\xampp\mysql\bin\mysqld.exe"

    if (Test-Path -LiteralPath $xamppMysqlBat) {
        Start-Process -FilePath "cmd.exe" -ArgumentList "/c", "`"$xamppMysqlBat`"" -WindowStyle Hidden
        Write-Result "Waiting up to 12 seconds for MySQL to initialize..." "Gray"
        for ($i = 0; $i -lt 12; $i++) {
            Start-Sleep -Seconds 1
            if (Test-TcpPort -TargetPort $MysqlPort) { $mysqlRunning = $true; break }
        }
    } elseif (Test-Path -LiteralPath $xamppMysqld) {
        Start-Process -FilePath $xamppMysqld -ArgumentList "--defaults-file=C:\xampp\mysql\bin\my.ini", "--standalone" -WindowStyle Hidden
        Write-Result "Waiting up to 12 seconds for MySQL to initialize..." "Gray"
        for ($i = 0; $i -lt 12; $i++) {
            Start-Sleep -Seconds 1
            if (Test-TcpPort -TargetPort $MysqlPort) { $mysqlRunning = $true; break }
        }
    }
}

if ($mysqlRunning) {
    Write-Result "[OK] MySQL is active and accepting connections on port $MysqlPort." "Green"
} else {
    Write-Result "[X] MySQL is NOT running on port $MysqlPort." "Red"
    Write-Result "Please start MySQL in the XAMPP Control Panel, then re-run this script." "Red"
    $script:HasFailure = $true
}

# -------------------------------------------------------------------------
# Step 3: Backend API (port 4000)
# -------------------------------------------------------------------------
Write-Step "3/5" "Verifying GHMS Backend API on port $BackendPort..."
$healthUrl = "http://localhost:$BackendPort/api/health"
$healthV1Url = "http://localhost:$BackendPort/api/v1/health"
$readyUrl = "http://localhost:$BackendPort/api/ready"
$readyV1Url = "http://localhost:$BackendPort/api/v1/ready"
$backendReady = (Test-HttpEndpoint -Url $readyUrl -TimeoutSec 5) -or (Test-HttpEndpoint -Url $readyV1Url -TimeoutSec 5) -or (Test-HttpEndpoint -Url $healthUrl -TimeoutSec 5) -or (Test-HttpEndpoint -Url $healthV1Url -TimeoutSec 5)

if ($backendReady) {
    Write-Result "[OK] Backend is already running and ready at $readyV1Url" "Green"
} elseif ($VerifyOnly) {
    Write-Result "[!] Backend is not running (Verify-only mode)." "Yellow"
    $script:HasFailure = $true
} elseif ($SkipBackend) {
    Write-Result "[!] Backend startup skipped by request (-SkipBackend)." "Magenta"
} else {
    $backendPids = @(Get-PortProcessId -TargetPort $BackendPort)
    $ghmsPids = @($backendPids | Where-Object { Test-GhmsProcess -ProcessId $_ })
    $foreignPids = @($backendPids | Where-Object { -not (Test-GhmsProcess -ProcessId $_) })

    if ($foreignPids.Count -gt 0) {
        Write-Result "[X] Port $BackendPort is occupied by an unrelated foreign process:" "Red"
        foreach ($fpid in $foreignPids) {
            $fdetails = Get-ProcessDetails -ProcessId $fpid
            Write-Result "    PID: $fpid | Name: $($fdetails.Name) | Command: $($fdetails.CommandLine)" "Red"
        }
        Write-Result "Cannot start GHMS backend on port $BackendPort. Please resolve the port conflict." "Red"
        $script:HasFailure = $true
    } else {
        if ($ghmsPids.Count -gt 0 -and $Force) {
            Write-Result "Force-restarting unresponsive GHMS backend processes..." "Yellow"
            Stop-GhmsProcessTree -ProcessIds $ghmsPids
            Wait-ForPortRelease -TargetPort $BackendPort | Out-Null
        } elseif ($ghmsPids.Count -gt 0) {
            Write-Result "A GHMS backend process is running on port $BackendPort. Waiting for readiness..." "Yellow"
            for ($i = 0; $i -lt 15; $i++) {
                Start-Sleep -Seconds 1
                if ((Test-HttpEndpoint -Url $readyUrl -TimeoutSec 5) -or (Test-HttpEndpoint -Url $readyV1Url -TimeoutSec 5) -or (Test-HttpEndpoint -Url $healthUrl -TimeoutSec 5)) { $backendReady = $true; break }
            }
        }

        if (-not $backendReady) {
            Write-Result "[*] Starting GHMS Backend on port $BackendPort..." "Cyan"
            $backendScript = if ($Production) { "npm run start" } else { "npm run dev" }
            $backendLog = Join-Path $logsPath "backend.log"
            if ($Background) {
                Write-Result "Running backend persistently in background (Logs: $backendLog)..." "Cyan"
                $backendArgs = "/c title GHMS Backend API (Port $BackendPort) && $backendScript > `"$backendLog`" 2>&1"
                Start-Process -FilePath "cmd.exe" -ArgumentList $backendArgs -WorkingDirectory $backendPath -WindowStyle Hidden | Out-Null
            } else {
                $backendArgs = "/k title GHMS Backend API (Port $BackendPort) && $backendScript"
                Start-Process -FilePath "cmd.exe" -ArgumentList $backendArgs -WorkingDirectory $backendPath | Out-Null
            }

            Write-Result "Waiting up to 45 seconds for backend readiness and database connection (/api/ready)..." "Gray"
            for ($i = 0; $i -lt 45; $i++) {
                Start-Sleep -Seconds 1
                Write-Host -NoNewline "."
                if ((Test-HttpEndpoint -Url $readyUrl -TimeoutSec 5) -or (Test-HttpEndpoint -Url $readyV1Url -TimeoutSec 5) -or (Test-HttpEndpoint -Url $healthUrl -TimeoutSec 5)) { 
                    $backendReady = $true
                    Write-Host ""
                    break 
                }
            }

            if ($backendReady) {
                Write-Result "[OK] Backend is healthy and ready at $readyUrl" "Green"
            } else {
                Write-Host ""
                Write-Result "[X] Backend did not respond within 45 seconds. Inspect the 'GHMS Backend API' window for errors." "Red"
                $script:HasFailure = $true
            }
        }
    }
}

# -------------------------------------------------------------------------
# Step 4: Frontend Web Application (port 3000)
# -------------------------------------------------------------------------
Write-Step "4/5" "Verifying GHMS Frontend on port $Port..."
$frontendUrl = "http://localhost:$Port"
$frontendPids = @(Get-PortProcessId -TargetPort $Port)
$frontendHealthy = $false

if ($frontendPids.Count -gt 0) {
    $frontendHealthy = (Test-HttpEndpoint -Url $frontendUrl -TimeoutSec 5) -or (Test-HttpEndpoint -Url "$frontendUrl/login" -TimeoutSec 5)
}

$shouldStartFrontend = $true

if ($frontendPids.Count -gt 0) {
    if ($frontendHealthy -and -not $Force) {
        Write-Result "[OK] Frontend is already running and accessible at $frontendUrl (PID: $($frontendPids -join ', '))." "Green"
        $shouldStartFrontend = $false
    } else {
        $ghmsFrontPids = @($frontendPids | Where-Object { Test-GhmsProcess -ProcessId $_ })
        $foreignFrontPids = @($frontendPids | Where-Object { -not (Test-GhmsProcess -ProcessId $_) })

        if ($foreignFrontPids.Count -gt 0 -and -not $Force) {
            Write-Result "[X] Port $Port is occupied by an unrelated foreign process:" "Red"
            foreach ($ffpid in $foreignFrontPids) {
                $ffdetails = Get-ProcessDetails -ProcessId $ffpid
                Write-Result "    PID: $ffpid | Name: $($ffdetails.Name) | Command: $($ffdetails.CommandLine)" "Red"
            }
            Write-Result "Cannot start GHMS frontend on port $Port. Terminate conflicting process or re-run with -Force." "Red"
            $script:HasFailure = $true
            $shouldStartFrontend = $false
        } elseif ($Force) {
            Write-Result "Force-restarting frontend on port $Port..." "Yellow"
            Stop-GhmsProcessTree -ProcessIds $frontendPids
            if (Wait-ForPortRelease -TargetPort $Port) {
                Write-Result "[OK] Port $Port released." "Green"
            }
        } else {
            Write-Result "[!] Port $Port is occupied by an unresponsive GHMS process." "Yellow"
            Write-Result "Re-run with -Force to cleanly restart it." "Gray"
            $shouldStartFrontend = $false
        }
    }
} else {
    Write-Result "[OK] Port $Port is available." "Green"
}

# -------------------------------------------------------------------------
# Step 5: Startup / Verification Summary
# -------------------------------------------------------------------------
Write-Step "5/5" "Launching & Verifying Complete System..."

if ($VerifyOnly) {
    $backendAlive = (Test-HttpEndpoint -Url $healthUrl -TimeoutSec 5) -or (Test-HttpEndpoint -Url $healthV1Url -TimeoutSec 5) -or (Test-HttpEndpoint -Url $readyUrl -TimeoutSec 5)
    $frontAlive = (Test-HttpEndpoint -Url $frontendUrl -TimeoutSec 5) -or (Test-HttpEndpoint -Url "$frontendUrl/login" -TimeoutSec 5)
    $mysqlAlive = Test-TcpPort -TargetPort $MysqlPort

    Write-Host ""
    Write-Host "============================================================" -ForegroundColor Yellow
    Write-Host " GHMS Service Status Summary" -ForegroundColor Yellow
    Write-Host "============================================================" -ForegroundColor Yellow
    Write-Host " MySQL Database (Port $MysqlPort):   $(if ($mysqlAlive) { '[UP]' } else { '[DOWN]' })"
    Write-Host " Backend API (Port $BackendPort):     $(if ($backendAlive) { '[READY]' } else { '[DOWN]' })"
    Write-Host " Frontend Web App (Port $Port): $(if ($frontAlive) { '[READY]' } else { '[DOWN]' })"
    Write-Host "============================================================" -ForegroundColor Yellow
    if ($mysqlAlive -and $backendAlive -and $frontAlive) { exit 0 } else { exit 1 }
}

if (-not $shouldStartFrontend) {
    Write-Host ""
    Write-Host "============================================================" -ForegroundColor Green
    Write-Host " GHMS is fully operational!" -ForegroundColor Green
    Write-Host " Web Portal:      $frontendUrl" -ForegroundColor Cyan
    Write-Host " Backend API:     http://localhost:$BackendPort/api" -ForegroundColor Cyan
    Write-Host " API Health:      $healthUrl" -ForegroundColor Cyan
    Write-Host " API Readiness:   $readyUrl" -ForegroundColor Cyan
    Write-Host " MySQL Database:  localhost:$MysqlPort" -ForegroundColor Cyan
    Write-Host "============================================================" -ForegroundColor Green
    Write-Host ""
    if ($OpenBrowser) {
        Write-Host "Opening $frontendUrl in default browser..." -ForegroundColor Green
        Start-Process $frontendUrl
    }
    if ($script:HasFailure) { exit 1 }
    exit 0
}

Write-Result "[*] Preparing GHMS Frontend on port $Port..." "Cyan"

if ($Production) {
    Write-Result "Verifying production build in .next..." "Gray"
    $verifyScript = Join-Path $projectRoot "scripts\verify-build.cjs"
    $needsBuild = $false
    if (Test-Path -LiteralPath $verifyScript) {
        $null = & node "$verifyScript" 2>&1
        if ($LASTEXITCODE -ne 0) { $needsBuild = $true }
    } else {
        $needsBuild = -not (Test-Path -LiteralPath (Join-Path $projectRoot ".next\BUILD_ID"))
    }

    if ($needsBuild) {
        Write-Result "Production build missing or incomplete. Compiling Next.js production build..." "Yellow"
        & npm run build --prefix "$projectRoot"
        if ($LASTEXITCODE -ne 0) {
            Write-Result "[X] Production build failed. Aborting startup to prevent running broken build." "Red"
            $script:HasFailure = $true
            exit 1
        }
    }
} else {
    # Development mode: uses .next-dev isolated directory.
    # Cache cleaning is NOT run on normal restart; only if -Force or -Clean is requested.
    if ($Force -or $Clean) {
        $cleanCacheScript = Join-Path $projectRoot "scripts\clean-next-cache.cjs"
        if (Test-Path -LiteralPath $cleanCacheScript) {
            Write-Result "Clean/Force requested: Purging development cache in .next-dev..." "Gray"
            & node "$cleanCacheScript" --dev
        }
    }
}

$frontScript = if ($Production) { "npm run start:frontend" } else { "npm run dev:frontend" }

if ($DetachFrontend -or $true) {
    # Start frontend in its own designated window or hidden background process
    $frontendLog = Join-Path $logsPath "frontend.log"
    if ($Background) {
        Write-Result "Running frontend persistently in background (Logs: $frontendLog)..." "Cyan"
        $frontArgs = "/c title GHMS Frontend Web App (Port $Port) && $frontScript > `"$frontendLog`" 2>&1"
        Start-Process -FilePath "cmd.exe" -ArgumentList $frontArgs -WorkingDirectory $projectRoot -WindowStyle Hidden | Out-Null
    } else {
        $frontArgs = "/k title GHMS Frontend Web App (Port $Port) && $frontScript"
        Start-Process -FilePath "cmd.exe" -ArgumentList $frontArgs -WorkingDirectory $projectRoot | Out-Null
    }
    
    Write-Result "Waiting up to 45 seconds for frontend HTTP availability..." "Gray"
    for ($i = 0; $i -lt 45; $i++) {
        Start-Sleep -Seconds 1
        Write-Host -NoNewline "."
        if (Test-HttpEndpoint -Url $frontendUrl -TimeoutSec 2) {
            $frontendHealthy = $true
            Write-Host ""
            break
        }
    }

    if ($frontendHealthy) {
        Write-Host ""
        Write-Host "============================================================" -ForegroundColor Green
        Write-Host " GHMS is fully operational!" -ForegroundColor Green
        Write-Host " Web Portal:      $frontendUrl" -ForegroundColor Cyan
        Write-Host " Backend API:     http://localhost:$BackendPort/api" -ForegroundColor Cyan
        Write-Host " API Health:      $healthUrl" -ForegroundColor Cyan
        Write-Host " API Readiness:   $readyUrl" -ForegroundColor Cyan
        Write-Host " MySQL Database:  localhost:$MysqlPort" -ForegroundColor Cyan
        Write-Host "============================================================" -ForegroundColor Green
        Write-Host ""
        if ($OpenBrowser) {
            Write-Host "Opening $frontendUrl in default browser..." -ForegroundColor Green
            Start-Process $frontendUrl
        }
    } else {
        Write-Host ""
        Write-Result "[!] Frontend readiness check timed out. Browser was not opened." "Yellow"
        Write-Result "Please inspect the 'GHMS Frontend Web App' terminal window or logs\frontend.log." "Gray"
    }
}
