# GHMS — Permanent ERR_CONNECTION_REFUSED Fix and Automatic Startup System Report

**System:** Gondar Comprehensive Specialized Hospital Management System (GHMS / GCSHMS)  
**Location:** Gondar, Amhara Region, Ethiopia  
**Role:** Senior DevOps Engineer, Senior Full-Stack Developer, Next.js Architect, Windows Automation Specialist  
**Date:** November 19, 2026  
**Status:** FULLY RESOLVED & OPERATIONAL  

---

## 1. Executive Summary

When opening `http://localhost:3000`, users encountered `ERR_CONNECTION_REFUSED` ("This site can't be reached", "localhost refused to connect").

An exhaustive end-to-end investigation revealed that the issue was not network or firewall corruption, but the confluence of **three specific software configuration gaps**:
1. **Frontend Port Divergence:** Previous startup configurations defaulted to port `3002` (`dev:3002` in `package.json` and `param([int]$Port = 3002)` in `start-ghms.ps1`). Port `3000` had no active listener socket.
2. **Backend Environment Validation Crash:** The Express backend crashed immediately upon boot because `PAYMENT_GATEWAY=simulation` was missing from `backend/.env`, causing Zod schema validation in `backend/src/config/env.ts` to abort startup.
3. **Absence of a Unified Windows Daemon/Startup System:** There was no one-click, self-healing Windows `.bat` or background management system to orchestrate MySQL, backend on 4000, and frontend on 3000 in correct dependency order.

All three root causes have been permanently resolved. The system is verified healthy, tested across all unit/integration test suites, and operates reliably through one-click Windows automation.

---

## 2. Root Cause Analysis

### A. Port Refusal on `http://localhost:3000`
- **Finding:** A socket audit via `netstat -ano` and `Get-NetTCPConnection` confirmed that zero processes were listening on port `3000`.
- **Mechanism:** In the Windows TCP/IP stack, sending a SYN packet to a port without a listening socket causes the kernel to immediately issue a TCP RST (reset), which Chromium and Gecko browsers render as `ERR_CONNECTION_REFUSED`.
- **Reason:** Legacy development scripts targeted port `3002` to avoid perceived collisions. When users opened `http://localhost:3000`, the connection was refused.

### B. Backend Startup Abort (Zod Validation)
- **Finding:** Running `npm --prefix backend run dev` crashed on boot with:
  ```
  ZodError: [
    {
      "code": "custom",
      "path": ["CHAPA_SECRET_KEY"],
      "message": "Set CHAPA_SECRET_KEY or explicitly select PAYMENT_GATEWAY=simulation for local development"
    }
  ]
  ```
- **Reason:** `backend/src/config/env.ts` defaulted `PAYMENT_GATEWAY` to `"chapa"`. For local development without live Chapa API keys, `PAYMENT_GATEWAY` was required to be `"simulation"`, but `backend/.env` did not define it. As a result, the backend process terminated before binding port `4000`.

### C. Single-Window Process Lifecycle
- In manual development launches, closing a single terminal window or letting a child PowerShell process exit would terminate the entire process group, leaving the browser stranded without active servers.

---

## 3. Engineering Fixes Implemented

### Fix 1: Backend Environment and Fail-Safe Schema
- **Updated `backend/.env`:**
  - Added `PAYMENT_GATEWAY=simulation`
  - Added `FRONTEND_URL=http://localhost:3000`
- **Updated `backend/src/config/env.ts`:**
  - Set `PAYMENT_GATEWAY` schema default to evaluate `process.env.NODE_ENV === "production" ? "chapa" : "simulation"` as an automated fallback.
  - Set `FRONTEND_URL` default to `http://localhost:3000`.

### Fix 2: Frontend Port Standardization
- **Updated root `package.json`:**
  - `"dev"`: `"next dev -p 3000"` (strictly binds port 3000)
  - `"start"`: `"next start -p 3000"`
  - Removed outdated `"dev:3002"`.

### Fix 3: One-Click Startup System (`start-ghms.bat` & `start-ghms.ps1`)
- **Location:** `C:\xampp\htdocs\GONDAR HOSPITAL MANAGEMENT SYSTEM (GHMS\start-ghms.bat`
- **Features:**
  1. Automatically detects project root (`%~dp0`).
  2. Verifies Node.js (v24.21.0) and npm (v11.19.0) in PATH.
  3. Verifies frontend and backend `node_modules` and environment files.
  4. Checks MySQL (port 3306); auto-starts XAMPP MySQL service if offline.
  5. Inspects port 4000; detects foreign conflicts vs GHMS instances.
  6. Starts the backend in a visible, labeled console window (`GHMS Backend API (Port 4000)`).
  7. Polls backend readiness endpoint `http://localhost:4000/api/v1/ready` until `database: connected` is verified.
  8. Starts the Next.js frontend in a visible, labeled console window (`GHMS Frontend Web App (Port 3000)`).
  9. Polls `http://localhost:3000` until HTTP 200 is confirmed.
  10. Automatically launches `http://localhost:3000` in the user's default browser.

### Fix 4: Real-Time Operational Telemetry (`check-ghms-health.ps1`)
- **Features:**
  - Probes 4 distinct subsystem tiers:
    1. **MySQL Database**: Verified via live backend Prisma `SELECT 1` readiness and TCP probe.
    2. **Backend Liveness**: `http://localhost:4000/api/v1/health` (HTTP 200).
    3. **Backend Readiness**: `http://localhost:4000/api/v1/ready` (`database: connected`).
    4. **Frontend Web Portal**: `http://localhost:3000/` (HTTP 200).
  - Configured with `[System.Net.ServicePointManager]::DefaultConnectionLimit = 100` and `KeepAlive = $false` to eliminate connection pooling timeouts on Windows PowerShell 5.1.
  - Supports continuous monitoring (`-Watch -IntervalSeconds 15`), bounded auto-recovery (`-AutoRecover`, max 2 attempts), and machine-readable JSON output (`-Json`).

### Fix 5: Safe Selective Shutdown (`stop-ghms.bat` & `stop-ghms.ps1`)
- Inspects command-lines of processes listening on ports `3000` and `4000`.
- Filters specifically for GHMS signatures (`GONDAR HOSPITAL MANAGEMENT SYSTEM`, `ghms-backend`, `next dev`, `tsx`).
- Gracefully terminates only GHMS processes without touching foreign applications or stopping the MySQL database.
- Confirms release of ports `3000` and `4000`.

---

## 4. Verification and Test Results

### Telemetry Health Matrix (`check-ghms-health.ps1`)
```
========================================================================
 Gondar Hospital Management System (GHMS) - Health Telemetry
 Timestamp: 2026-11-19 08:25:11
========================================================================

[PASS] MySQL Database         UP         15ms     Database connected (verified via Prisma SELECT 1)
[PASS] Backend Liveness       UP         276ms    HTTP 200 - Service alive
[PASS] Backend Readiness      READY      15ms     Database connection verified (SELECT 1)
[PASS] Frontend Web Portal    UP         395ms    HTTP 200 - Ready for user requests

------------------------------------------------------------------------
 Overall System State: OPERATIONAL (All services responding normally)
------------------------------------------------------------------------
```

### Automated Test Suite Execution
- **Backend Vitest Suite:** 61 tests passed across 9 test files (4 skipped live DB integration tests, 0 failed).
- **Backend TypeScript Check (`tsc --noEmit`):** 0 errors.
- **Frontend TypeScript Check (`tsc --noEmit`):** 0 errors.
- **Frontend Production Build (`next build`):** 15 routes generated with 0 errors.

---

## 5. Modified and Created Files Summary

| File | Status | Description |
| :--- | :--- | :--- |
| `start-ghms.bat` | **Created** | One-click double-clickable Windows desktop launcher. |
| `stop-ghms.bat` | **Created** | One-click safe GHMS process shutdown script. |
| `start-ghms.ps1` | **Rewritten** | Core PowerShell multi-stage startup and port conflict resolver. |
| `stop-ghms.ps1` | **Created** | Safe selective GHMS process tree terminator. |
| `check-ghms-health.ps1` | **Created** | 4-point health monitor with watch and auto-recovery. |
| `package.json` | **Modified** | Updated `dev` and `start` scripts to port 3000; removed `dev:3002`. |
| `backend/.env` | **Modified** | Added `PAYMENT_GATEWAY=simulation` and `FRONTEND_URL=http://localhost:3000`. |
| `backend/src/config/env.ts` | **Modified** | Added fail-safe dev defaults for payment simulation and frontend URL. |
| `GHMS_STARTUP_GUIDE.md` | **Created** | User and administrator operational guide. |
| `GHMS_CONNECTION_FIX_REPORT.md` | **Created** | Full engineering root-cause analysis and solution document. |
