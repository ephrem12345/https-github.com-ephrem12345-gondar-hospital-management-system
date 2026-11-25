# Gondar Hospital Management System (GHMS)
## Comprehensive Production Startup, Operation & Troubleshooting Guide

**Platform:** Windows 10/11, PowerShell 5.1+, XAMPP (MySQL 3306), Next.js 15 (Port 3002), Express 5 / Prisma (Port 4000)  
**System Version:** GHMS v0.1.0 Enterprise  
**Document Authoritative Reference:** Verified against local filesystem and live port testing.

---

## 1. Executive Summary

This guide provides authoritative operational procedures for launching, operating, monitoring, and shutting down the Gondar Hospital Management System (GHMS).

GHMS is a full-stack hospital information and clinical management platform composed of:
1. **Frontend:** Next.js 15 App Router web portal with strict role-based route protection and authentication gates (Port 3002).
2. **Backend API:** Express 5 REST API with Prisma ORM, JWT authentication, and tenant isolation (Port 4000).
3. **Database Tier:** MySQL 8/MariaDB via XAMPP with multi-tenant schema isolation (Port 3306).

All services are orchestrated via hardened Windows batch scripts and PowerShell automation that prevent duplicate instances, ensure correct dependency startup ordering, auto-recover from crashes, and preserve database integrity.

---

## 2. Project Structure & Verified Filesystem Paths

> [!IMPORTANT]
> **CRITICAL PATH CLARIFICATION: The Missing Closing Parenthesis**  
> On disk, the project root directory is literally:  
> `C:\xampp\htdocs\GONDAR HOSPITAL MANAGEMENT SYSTEM (GHMS`  
> (Notice: The folder name ends with `(GHMS` without a closing parenthesis `)`).  
> Attempting to navigate using `cd "C:\xampp\htdocs\GONDAR HOSPITAL MANAGEMENT SYSTEM (GHMS)\backend"` will fail with PowerShell error `path does not exist` because the closing parenthesis does not exist in the folder name on disk.  
> All GHMS scripts dynamically resolve paths using `%~dp0` and `$PSScriptRoot`, completely eliminating manual pathing errors.

### Verified Architecture Map

| Tier | Filesystem Path | Port | Health / Verification Check |
| :--- | :--- | :--- | :--- |
| **Project Root & Frontend** | `C:\xampp\htdocs\GONDAR HOSPITAL MANAGEMENT SYSTEM (GHMS` | `3002` | `http://localhost:3002` (Redirects to `/login`) |
| **Express Backend API** | `C:\xampp\htdocs\GONDAR HOSPITAL MANAGEMENT SYSTEM (GHMS\backend` | `4000` | `http://localhost:4000/api/health`<br>`http://localhost:4000/api/v1/ready` |
| **MySQL Database** | `C:\xampp\mysql` (Data: `C:\xampp\mysql\data`) | `3306` | TCP Port `3306` (`ghms` database) |
| **System Logs** | `C:\xampp\htdocs\GONDAR HOSPITAL MANAGEMENT SYSTEM (GHMS\logs` | N/A | `logs/watchdog.log`<br>`logs/backend.log`<br>`logs/frontend.log` |

---

## 3. Architecture & Port Mapping

```
                                [ CLIENT BROWSER ]
                                        │
                         HTTP Requests  │  (Port 3002)
                                        ▼
                  ┌───────────────────────────────────────────┐
                  │          GHMS Next.js 15 Frontend         │
                  │   Root Middleware & Client AuthGate       │
                  │   - Unauthenticated -> 307 Redirect       │
                  │   - Port: 3002 (Production & Dev)        │
                  └─────────────────────┬─────────────────────┘
                                        │
                          API Calls     │  (Port 4000)
                                        ▼
                  ┌───────────────────────────────────────────┐
                  │          GHMS Express 5 Backend           │
                  │   - Auth Controller & Tenant Isolation    │
                  │   - /api/health (Liveness)                │
                  │   - /api/v1/ready (DB Readiness)          │
                  │   - Port: 4000                            │
                  └─────────────────────┬─────────────────────┘
                                        │
                          TCP / SQL     │  (Port 3306)
                                        ▼
                  ┌───────────────────────────────────────────┐
                  │          XAMPP MySQL / MariaDB            │
                  │   - Multi-tenant Database: `ghms`         │
                  │   - Port: 3306                            │
                  └───────────────────────────────────────────┘
```

---

## 4. Quick Start (One-Click Operations)

### 4.1. Starting GHMS
To start the entire hospital system in correct dependency order:
1. Open Windows Explorer and navigate to `C:\xampp\htdocs\GONDAR HOSPITAL MANAGEMENT SYSTEM (GHMS`.
2. Double-click `start-ghms.bat`.

**What the launcher performs automatically:**
- **Step 1 (Pre-flight):** Checks Node.js and npm versions. Validates `.env` and `.env.local`.
- **Step 2 (Database):** Verifies MySQL on port 3306. If stopped, automatically starts XAMPP MySQL.
- **Step 3 (Backend):** Checks if the backend is already running. If not, launches the Express API on port 4000 and polls `/api/ready` until database connectivity is verified.
- **Step 4 (Frontend):** Checks if the frontend is already running. If not, launches Next.js on port 3002 and waits for HTTP 200 readiness.
- **Step 5 (Verification & Browser):** Validates all 4 tiers, displays an operational summary table, and opens `http://localhost:3002` in your default browser.
- **Duplicate Prevention:** If any or all services are already running, it detects them, prevents duplicate processes, and simply opens the portal.

### 4.2. Stopping GHMS Cleanly
To shut down GHMS:
1. Double-click `stop-ghms.bat`.

**Safety Guarantees of the Shutdown Script:**
- Terminates **ONLY** GHMS-owned node processes on ports 3002 and 4000.
- **NEVER** terminates unrelated Node.js applications or foreign developer processes.
- **NEVER** terminates or restarts MySQL (shared database service remains preserved).
- Polls ports 3002 and 4000 to verify full socket release before completing.

---

## 5. Automatic Recovery & Watchdog

To maintain continuous system uptime in a hospital environment, GHMS includes a dedicated watchdog monitor:

### 5.1. Starting the Watchdog
Double-click `run-watchdog.bat`. This opens a monitor window running:
```powershell
powershell.exe -ExecutionPolicy Bypass -File scripts\watchdog.ps1 -AutoRecover -IntervalSeconds 15
```

### 5.2. Watchdog Capabilities
1. **Continuous 3-Tier Health Check (Every 15 Seconds):**
   - MySQL service on port 3306.
   - Backend API liveness (`/api/health`) and database connectivity (`/api/ready`).
   - Frontend web portal on port 3002.
2. **Automated Crash Recovery:**
   - If MySQL stops: Attempts restart via XAMPP service scripts.
   - If Backend crashes: Automatically relaunches backend and verifies `/api/ready`.
   - If Frontend crashes: Automatically relaunches Next.js server.
3. **Bounded Retries with Exponential Backoff:**
   - Enforces a maximum of **3 restarts per service within any 5-minute rolling window**.
   - Applies exponential backoff delays between retries: **5 seconds -> 15 seconds -> 45 seconds**.
   - If a service fails 3 times consecutively, auto-recovery halts and outputs a high-priority `[ALERT]` requiring administrator inspection.
4. **Audit Logging:**
   - All check cycles, failures, backoffs, and restarts are written with timestamps to:  
     `logs\watchdog.log`

---

## 6. Manual Component-by-Component Startup (Developer Workflow)

If debugging individual components, start services in the following exact order:

### Step 1: Start MySQL
Open XAMPP Control Panel and click **Start** next to MySQL (or run `C:\xampp\mysql_start.bat`).  
Verify port:
```powershell
Test-NetConnection -ComputerName localhost -Port 3306
```

### Step 2: Start Backend API
Open a PowerShell terminal in the backend directory:
```powershell
cd "C:\xampp\htdocs\GONDAR HOSPITAL MANAGEMENT SYSTEM (GHMS\backend"
npm run dev
```
Verify readiness:
```powershell
Invoke-RestMethod -Uri "http://localhost:4000/api/v1/ready"
```
Expected output: `{"status":"ok","database":"connected",...}`

### Step 3: Start Frontend Portal
Open a second PowerShell terminal in the project root:
```powershell
cd "C:\xampp\htdocs\GONDAR HOSPITAL MANAGEMENT SYSTEM (GHMS"
npm run dev -- -p 3002 -H 0.0.0.0
```
Open `http://localhost:3002` in your browser.

---

## 7. Troubleshooting & Common Errors

### Error 1: `ERR_CONNECTION_REFUSED — localhost refused to connect`
* **Root Cause A:** MySQL service was not started before the backend. Express crashed because Prisma could not reach `127.0.0.1:3306`.  
  * **Solution:** Start MySQL in XAMPP, then double-click `start-ghms.bat`.
* **Root Cause B:** The backend or frontend process was unexpectedly killed or did not finish compiling.  
  * **Solution:** Inspect `logs\backend.log` and `logs\frontend.log`. Run `run-watchdog.bat` to maintain automated uptime.
* **Root Cause C:** The browser was directed to the wrong port (e.g. 3000 instead of 3002).  
  * **Solution:** GHMS frontend is configured for port `3002`. Always navigate to `http://localhost:3002`.

### Error 2: `cd: Cannot find path '... (GHMS)\backend' because it does not exist`
* **Root Cause:** A closing parenthesis was added to `(GHMS)`.  
* **Solution:** The directory path is literally `C:\xampp\htdocs\GONDAR HOSPITAL MANAGEMENT SYSTEM (GHMS\backend` (no closing parenthesis). Always use `start-ghms.bat` which handles paths automatically.

### Error 3: Port Conflict (`Port 4000 is occupied by an unrelated foreign process`)
* **Root Cause:** Another application (or an orphaned non-GHMS process) is listening on port 4000 or 3002.
* **Solution:** The launcher identifies the conflicting process PID and name in the terminal. Terminate the conflicting software or run `stop-ghms.bat -Force`.

### Error 4: Production Build Verification Failure (`BUILD_ID missing`)
* **Root Cause:** Incomplete Next.js build in `.next`.
* **Solution:** Rebuild the production frontend:
  ```powershell
  npm run build
  ```

---

## 8. Verification Matrix & Health Diagnostics

Run a full one-second health diagnostic across all 4 tiers at any time:
```powershell
powershell.exe -ExecutionPolicy Bypass -File .\scripts\check-ghms.ps1
```

Expected healthy output:
```
============================================================
 GHMS Service Health Check Matrix
============================================================
 [PASS] MySQL Database (Port 3306)              [RUNNING / LISTENING]
 [PASS] Backend API Health (Port 4000)          [RUNNING]
 [PASS] Backend DB Connectivity                 [READY / CONNECTED]
 [PASS] Frontend Next.js Portal (Port 3002)     [RUNNING]
============================================================
 Overall Status: [OPERATIONAL] All 4 tiers are healthy.
```
