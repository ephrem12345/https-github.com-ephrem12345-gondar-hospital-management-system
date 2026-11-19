# Gondar Hospital Management System (GHMS) — Startup and Operations Guide

Welcome to the **Gondar Comprehensive Specialized Hospital Management System (GHMS / GCSHMS)** startup and operations guide. This document provides step-by-step instructions for launching, monitoring, and safely stopping the GHMS hospital platform on Windows.

---

## 1. Quick Start (One-Click)

The easiest way to start GHMS is using the Windows batch launcher:

1. Open File Explorer and navigate to:
   ```
   C:\xampp\htdocs\GONDAR HOSPITAL MANAGEMENT SYSTEM (GHMS
   ```
2. **Double-click `start-ghms.bat`**
3. The launcher will automatically:
   - Verify Node.js (v18+) and npm are available.
   - Verify all frontend and backend npm dependencies.
   - Check if MySQL (port 3306) is running; if not, automatically start XAMPP MySQL.
   - Start the **GHMS Backend API** on port `4000` in a dedicated, labeled window.
   - Verify the backend health and database readiness (`http://localhost:4000/api/v1/ready`).
   - Start the **GHMS Frontend Web App** on port `3000` in a dedicated, labeled window.
   - Verify frontend HTTP accessibility (`http://localhost:3000`).
   - Automatically open **`http://localhost:3000`** in your default web browser.

---

## 2. Safe Shutdown (One-Click)

To stop all GHMS servers without affecting any unrelated software or shutting down the database:

1. In the project directory, **double-click `stop-ghms.bat`**.
2. The stopper will:
   - Identify the exact PIDs belonging to GHMS on ports `3000` and `4000`.
   - Safely terminate the GHMS frontend and backend process trees.
   - Confirm that ports `3000` and `4000` have been released.
   - Leave the MySQL database running untouched so other projects and data remain safe.

---

## 3. Real-Time Health Telemetry and Monitoring

To monitor the operational status of all GHMS subsystems:

### Single Health Check:
Open PowerShell and run:
```powershell
powershell -NoProfile -ExecutionPolicy Bypass -File .\check-ghms-health.ps1
```

### Continuous Telemetry (Watch Mode):
Monitors and refreshes status every 15 seconds:
```powershell
powershell -NoProfile -ExecutionPolicy Bypass -File .\check-ghms-health.ps1 -Watch -IntervalSeconds 15
```

### Automated Bounded Recovery:
Automatically detects if a service stopped and restarts it safely (up to 2 attempts):
```powershell
powershell -NoProfile -ExecutionPolicy Bypass -File .\check-ghms-health.ps1 -AutoRecover
```

### JSON Telemetry for DevOps / CI:
```powershell
powershell -NoProfile -ExecutionPolicy Bypass -File .\check-ghms-health.ps1 -Json
```

---

## 4. Port and URL Mapping Reference

| Component | Port | URL / Endpoint | Protocol / Purpose |
| :--- | :--- | :--- | :--- |
| **Frontend Web Portal** | `3000` | `http://localhost:3000` | Next.js 15 App Router |
| **Backend API Base** | `4000` | `http://localhost:4000/api/v1` | Express 5 REST API |
| **Backend Liveness Check** | `4000` | `http://localhost:4000/api/v1/health` | Process vitality probe |
| **Backend Database Readiness** | `4000` | `http://localhost:4000/api/v1/ready` | Prisma DB query (`SELECT 1`) |
| **MySQL Database** | `3306` | `127.0.0.1:3306` / `[::1]:3306` | XAMPP MariaDB / MySQL |

---

## 5. Command-Line Options (PowerShell)

You can launch `start-ghms.ps1` with various operational switches:

```powershell
# Standard development launch with browser auto-open
powershell -NoProfile -ExecutionPolicy Bypass -File .\start-ghms.ps1 -OpenBrowser

# Verify health status of all ports and services without starting new processes
powershell -NoProfile -ExecutionPolicy Bypass -File .\start-ghms.ps1 -VerifyOnly

# Force-restart existing GHMS processes if unresponsive
powershell -NoProfile -ExecutionPolicy Bypass -File .\start-ghms.ps1 -Force

# Start in production mode (using pre-built next start and node server)
powershell -NoProfile -ExecutionPolicy Bypass -File .\start-ghms.ps1 -Production
```

---

## 6. Troubleshooting Common Issues

### Issue 1: "ERR_CONNECTION_REFUSED" on `http://localhost:3000`
- **Cause:** The Next.js frontend dev server is not currently running, or was previously stopped.
- **Solution:** Double-click `start-ghms.bat`. The launcher will verify MySQL, start both servers, and open `http://localhost:3000`.

### Issue 2: Port 3000 or 4000 is occupied by a foreign application
- **Diagnosis:** Run `powershell .\check-ghms-health.ps1` or check the launcher output.
- **Remedy:** The launcher detects foreign PIDs and refuses to kill them automatically. You can either close that application, or re-run `stop-ghms.bat` if it was an orphaned GHMS node instance.

### Issue 3: MySQL is not running
- **Diagnosis:** `check-ghms-health.ps1` shows `[FAIL] MySQL Database DOWN`.
- **Remedy:** Open the **XAMPP Control Panel** and click **Start** next to **MySQL**.

### Issue 4: Reviewing Server Logs
- Persistent monitor logs are saved to:
  ```
  logs/health-monitor.log
  ```
- Both the **GHMS Backend API** and **GHMS Frontend Web App** run in dedicated terminal windows, keeping live build logs, errors, and request metrics visible in real time.
