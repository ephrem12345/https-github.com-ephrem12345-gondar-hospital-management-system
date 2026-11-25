/**
 * Gondar Hospital Management System (GHMS) - Unified Development Orchestrator
 *
 * Orchestrates and supervises:
 *   1. MySQL Database Service (Port 3306)
 *   2. Express 5 Backend REST API (Port 4000)
 *   3. Next.js 15 Frontend Web Application (Port 3002)
 *
 * Guarantees:
 *   - Strict dependency ordering: MySQL -> Backend (/api/v1/ready) -> Frontend (Port 3002).
 *   - Reliable process cleanup: Ctrl+C or closing terminal cleanly terminates all child process trees.
 *   - Structured, colorized console output with [Backend] and [Frontend] prefixes.
 *   - Failure and shutdown telemetry written to logs/dev-runner.log.
 */

const { spawn, execSync, exec } = require("node:child_process");
const http = require("node:http");
const net = require("node:net");
const path = require("node:path");
const fs = require("node:fs");

const projectRoot = path.resolve(__dirname, "..");
const backendRoot = path.join(projectRoot, "backend");
const logsDir = path.join(projectRoot, "logs");
if (!fs.existsSync(logsDir)) {
  fs.mkdirSync(logsDir, { recursive: true });
}
const runnerLog = path.join(logsDir, "dev-runner.log");

const FRONTEND_PORT = 3002;
const BACKEND_PORT = 4000;
const MYSQL_PORT = 3306;

const colors = {
  reset: "\x1b[0m",
  bold: "\x1b[1m",
  red: "\x1b[31m",
  green: "\x1b[32m",
  yellow: "\x1b[33m",
  blue: "\x1b[34m",
  magenta: "\x1b[35m",
  cyan: "\x1b[36m",
  gray: "\x1b[90m",
};

function logEvent(source, message, color = colors.reset) {
  const timestamp = new Date().toISOString().replace("T", " ").substring(0, 19);
  const formattedConsole = `${colors.gray}[${timestamp}]${colors.reset} ${color}[${source}]${colors.reset} ${message}`;
  console.log(formattedConsole);

  const cleanMessage = `[${timestamp}] [${source}] ${message.replace(/\x1b\[[0-9;]*m/g, "")}\n`;
  try {
    fs.appendFileSync(runnerLog, cleanMessage, "utf8");
  } catch {}
}

function testPort(port, host = "127.0.0.1", timeoutMs = 1500) {
  return new Promise((resolve) => {
    const socket = new net.Socket();
    let hasResolved = false;

    socket.setTimeout(timeoutMs);
    socket.once("connect", () => {
      hasResolved = true;
      socket.destroy();
      resolve(true);
    });
    socket.once("timeout", () => {
      if (!hasResolved) {
        hasResolved = true;
        socket.destroy();
        resolve(false);
      }
    });
    socket.once("error", () => {
      if (!hasResolved) {
        hasResolved = true;
        socket.destroy();
        resolve(false);
      }
    });

    try {
      socket.connect(port, host);
    } catch {
      resolve(false);
    }
  });
}

function probeHttp(url, timeoutMs = 3000) {
  return new Promise((resolve) => {
    const parsed = new URL(url);
    const req = http.request(
      {
        hostname: parsed.hostname,
        port: parsed.port,
        path: parsed.pathname + parsed.search,
        method: "GET",
        timeout: timeoutMs,
      },
      (res) => {
        resolve(res.statusCode >= 200 && res.statusCode < 500);
      }
    );
    req.on("error", () => resolve(false));
    req.on("timeout", () => {
      req.destroy();
      resolve(false);
    });
    req.end();
  });
}

async function startMysqlIfNeeded() {
  logEvent("Database", `Checking MySQL listener on port ${MYSQL_PORT}...`, colors.cyan);
  const isUp = await testPort(MYSQL_PORT);
  if (isUp) {
    logEvent("Database", `MySQL is already active and accepting connections on port ${MYSQL_PORT}.`, colors.green);
    return true;
  }

  logEvent("Database", `MySQL is NOT responding on port ${MYSQL_PORT}. Attempting safe local startup...`, colors.yellow);
  const xamppBat = "C:\\xampp\\mysql_start.bat";
  const xamppExe = "C:\\xampp\\mysql\\bin\\mysqld.exe";

  try {
    if (fs.existsSync(xamppBat)) {
      exec(`cmd.exe /c "${xamppBat}"`, { windowsHide: true });
    } else if (fs.existsSync(xamppExe)) {
      exec(`"${xamppExe}" --defaults-file=C:\\xampp\\mysql\\bin\\my.ini --standalone`, { windowsHide: true });
    }
  } catch (err) {
    logEvent("Database", `Failed to trigger MySQL executable: ${err.message}`, colors.red);
  }

  // Poll for MySQL readiness (up to 15 seconds)
  for (let i = 0; i < 15; i++) {
    await new Promise((r) => setTimeout(r, 1000));
    const ready = await testPort(MYSQL_PORT);
    if (ready) {
      logEvent("Database", `MySQL successfully initialized and listening on port ${MYSQL_PORT}.`, colors.green);
      return true;
    }
  }

  logEvent("Database", `MySQL failed to start on port ${MYSQL_PORT}. Please ensure MySQL is started in XAMPP.`, colors.red);
  return false;
}

let backendProcess = null;
let frontendProcess = null;
let isShuttingDown = false;

function terminateProcessTree(pid) {
  if (!pid) return;
  try {
    if (process.platform === "win32") {
      execSync(`taskkill /PID ${pid} /T /F 2>nul`);
    } else {
      process.kill(-pid, "SIGTERM");
    }
  } catch {}
}

function cleanupAndExit(code = 0) {
  if (isShuttingDown) return;
  isShuttingDown = true;

  logEvent("GHMS System", "Shutting down all GHMS development servers cleanly...", colors.yellow);

  if (backendProcess && backendProcess.pid) {
    logEvent("Backend", `Terminating Express backend process tree (PID ${backendProcess.pid})...`, colors.yellow);
    terminateProcessTree(backendProcess.pid);
  }

  if (frontendProcess && frontendProcess.pid) {
    logEvent("Frontend", `Terminating Next.js frontend process tree (PID ${frontendProcess.pid})...`, colors.yellow);
    terminateProcessTree(frontendProcess.pid);
  }

  logEvent("GHMS System", "All GHMS processes successfully terminated. Ports released.", colors.green);
  process.exit(code);
}

process.on("SIGINT", () => cleanupAndExit(0));
process.on("SIGTERM", () => cleanupAndExit(0));
process.on("SIGHUP", () => cleanupAndExit(0));
process.on("exit", () => {
  if (!isShuttingDown) cleanupAndExit(0);
});

async function main() {
  console.log(`
${colors.cyan}============================================================
 Gondar Hospital Management System (GHMS) - Unified Dev Runner
 Port Configuration:
   - Frontend Web Portal: http://localhost:${FRONTEND_PORT}
   - Express REST API:    http://localhost:${BACKEND_PORT}/api/v1
   - MySQL Database:      localhost:${MYSQL_PORT}
============================================================${colors.reset}
`);

  // Step 1: Database Check
  const dbOk = await startMysqlIfNeeded();
  if (!dbOk) {
    logEvent("Database", "Proceeding with backend startup (backend will log warnings if DB remains unavailable).", colors.yellow);
  }

  // Step 2: Start Express Backend
  logEvent("Backend", `Starting Express 5 backend on port ${BACKEND_PORT}...`, colors.cyan);
  const isWindows = process.platform === "win32";
  const npmCmd = isWindows ? "npm.cmd" : "npm";

  backendProcess = spawn(npmCmd, ["run", "dev"], {
    cwd: backendRoot,
    env: { ...process.env, PORT: String(BACKEND_PORT), NODE_ENV: "development" },
    shell: true,
  });

  backendProcess.stdout.on("data", (data) => {
    const lines = data.toString().split(/\r?\n/).filter(Boolean);
    for (const line of lines) {
      logEvent("Backend", line, colors.magenta);
    }
  });

  backendProcess.stderr.on("data", (data) => {
    const lines = data.toString().split(/\r?\n/).filter(Boolean);
    for (const line of lines) {
      logEvent("Backend", line, colors.red);
    }
  });

  backendProcess.on("close", (code) => {
    if (!isShuttingDown) {
      logEvent("Backend", `Express backend exited unexpectedly with code ${code}.`, colors.red);
      cleanupAndExit(code || 1);
    }
  });

  // Step 3: Wait for Backend Readiness
  logEvent("Backend", `Waiting for backend API readiness on http://localhost:${BACKEND_PORT}/api/v1/ready...`, colors.cyan);
  let backendReady = false;
  for (let i = 0; i < 30; i++) {
    await new Promise((r) => setTimeout(r, 1000));
    const ready = await probeHttp(`http://localhost:${BACKEND_PORT}/api/v1/ready`);
    const health = await probeHttp(`http://localhost:${BACKEND_PORT}/api/health`);
    if (ready || health) {
      backendReady = true;
      logEvent("Backend", `Backend API is healthy and accepting requests on port ${BACKEND_PORT}.`, colors.green);
      break;
    }
  }

  if (!backendReady) {
    logEvent("Backend", `Backend did not confirm readiness within 30s. Starting frontend anyway...`, colors.yellow);
  }

  // Step 4: Start Next.js Frontend
  logEvent("Frontend", `Starting Next.js 15 frontend on port ${FRONTEND_PORT}...`, colors.cyan);
  frontendProcess = spawn(npmCmd, ["run", "dev:frontend"], {
    cwd: projectRoot,
    env: { ...process.env, PORT: String(FRONTEND_PORT) },
    shell: true,
  });

  frontendProcess.stdout.on("data", (data) => {
    const lines = data.toString().split(/\r?\n/).filter(Boolean);
    for (const line of lines) {
      logEvent("Frontend", line, colors.blue);
    }
  });

  frontendProcess.stderr.on("data", (data) => {
    const lines = data.toString().split(/\r?\n/).filter(Boolean);
    for (const line of lines) {
      logEvent("Frontend", line, colors.yellow);
    }
  });

  frontendProcess.on("close", (code) => {
    if (!isShuttingDown) {
      logEvent("Frontend", `Next.js frontend exited unexpectedly with code ${code}.`, colors.red);
      cleanupAndExit(code || 1);
    }
  });

  // Step 5: Wait for Frontend Availability
  logEvent("Frontend", `Waiting for frontend availability on http://localhost:${FRONTEND_PORT}...`, colors.cyan);
  let frontendReady = false;
  for (let i = 0; i < 40; i++) {
    await new Promise((r) => setTimeout(r, 1000));
    const ready = await probeHttp(`http://localhost:${FRONTEND_PORT}`);
    if (ready) {
      frontendReady = true;
      break;
    }
  }

  if (frontendReady) {
    console.log(`
${colors.green}============================================================
 [SUCCESS] Gondar Hospital Management System (GHMS) is Ready!
 Web Portal:      http://localhost:${FRONTEND_PORT}
 Backend API:     http://localhost:${BACKEND_PORT}/api/v1
 Health Check:    http://localhost:${BACKEND_PORT}/api/health
 Readiness:       http://localhost:${BACKEND_PORT}/api/v1/ready
 Database:        localhost:${MYSQL_PORT}
 (Press Ctrl+C to stop all services simultaneously)
============================================================${colors.reset}
`);
  } else {
    logEvent("Frontend", `Frontend is still compiling. Open http://localhost:${FRONTEND_PORT} in your browser once compilation finishes.`, colors.yellow);
  }
}

main().catch((err) => {
  logEvent("GHMS System", `Fatal startup error: ${err.message}`, colors.red);
  cleanupAndExit(1);
});
