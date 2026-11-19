# Diagnostic script for GHMS Port 3002 & Node.js processes
$ErrorActionPreference = "Continue"

Write-Host "============================================================"
Write-Host "1. CHECKING TCP PORT 3002 (FRONTEND)"
Write-Host "============================================================"

$port3002 = Get-NetTCPConnection -LocalPort 3002 -ErrorAction SilentlyContinue
if ($port3002) {
    Write-Host "Found active connections on Port 3002:" -ForegroundColor Yellow
    foreach ($conn in $port3002) {
        $procId = $conn.OwningProcess
        $proc = Get-CimInstance Win32_Process -Filter "ProcessId = $procId" -ErrorAction SilentlyContinue
        Write-Host "  State:        $($conn.State)"
        Write-Host "  LocalAddress: $($conn.LocalAddress):$($conn.LocalPort)"
        Write-Host "  PID:          $procId"
        if ($proc) {
            Write-Host "  Name:         $($proc.Name)"
            Write-Host "  Parent PID:   $($proc.ParentProcessId)"
            Write-Host "  Command Line: $($proc.CommandLine)"
            Write-Host "  Exec Path:    $($proc.ExecutablePath)"
        }
        Write-Host "  --------------------------------------------------"
    }
} else {
    Write-Host "Get-NetTCPConnection reports NO active listener on port 3002." -ForegroundColor Green
}

Write-Host "`nChecking via netstat for :3002..."
$netstat3002 = netstat -ano | findstr ":3002"
if ($netstat3002) {
    Write-Host "netstat output for 3002:" -ForegroundColor Yellow
    $netstat3002 | ForEach-Object { Write-Host "  $_" }
} else {
    Write-Host "netstat reports no entry for :3002." -ForegroundColor Green
}

Write-Host "`n============================================================"
Write-Host "2. CHECKING TCP PORT 4000 (BACKEND)"
Write-Host "============================================================"
$port4000 = Get-NetTCPConnection -LocalPort 4000 -ErrorAction SilentlyContinue
if ($port4000) {
    foreach ($conn in $port4000) {
        $procId = $conn.OwningProcess
        $proc = Get-CimInstance Win32_Process -Filter "ProcessId = $procId" -ErrorAction SilentlyContinue
        Write-Host "  PID: $($conn.OwningProcess) | State: $($conn.State) | Name: $($proc.Name)"
    }
} else {
    Write-Host "No listener on port 4000."
}

Write-Host "`n============================================================"
Write-Host "3. ALL RUNNING NODE.EXE PROCESSES"
Write-Host "============================================================"
$nodeProcesses = Get-CimInstance Win32_Process -Filter "Name = 'node.exe'" -ErrorAction SilentlyContinue
if ($nodeProcesses) {
    Write-Host "Found $($nodeProcesses.Count) node.exe processes running:"
    foreach ($np in $nodeProcesses) {
        $parent = Get-CimInstance Win32_Process -Filter "ProcessId = $($np.ParentProcessId)" -ErrorAction SilentlyContinue
        Write-Host "  PID:        $($np.ProcessId)"
        Write-Host "  Parent PID: $($np.ParentProcessId) ($($parent.Name))"
        Write-Host "  Command:    $($np.CommandLine)"
        Write-Host "  --------------------------------------------------"
    }
} else {
    Write-Host "No node.exe processes currently found."
}
