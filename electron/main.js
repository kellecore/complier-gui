const path = require("node:path");
const { spawn } = require("node:child_process");
const { execSync } = require("node:child_process");
const { app, BrowserWindow, dialog, Menu } = require("electron");

const ROOT = path.join(__dirname, "..");
const CORE_DIR = path.join(ROOT, "core");
const WEB_DIR = path.join(CORE_DIR, "web");
const BACKEND_URL = "http://127.0.0.1:8080/health";
const FRONTEND_URL = "http://127.0.0.1:3000";

let backendProc = null;
let frontendProc = null;
let mainWindow = null;
const ENABLE_CHILD_LOG_PIPE = process.env.ELECTRON_CHILD_LOG_PIPE === "1";

function isBrokenPipeError(err) {
  if (!err) return false;
  const message = String(err.message || "").toLowerCase();
  return err.code === "EPIPE" || message.includes("epipe") || message.includes("broken pipe");
}

function guardStreamErrors(stream) {
  if (!stream || typeof stream.on !== "function") return;
  stream.on("error", (err) => {
    // Logging streams can be unavailable in detached Electron launches on Windows.
    if (isBrokenPipeError(err)) return;
  });
}

guardStreamErrors(process.stdout);
guardStreamErrors(process.stderr);

function safeWrite(stream, message) {
  if (!stream || !stream.writable) return;
  try {
    stream.write(message);
  } catch (_err) {
    // Never let logging crash the application.
  }
}

function wait(ms) {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

async function waitForHttp(url, timeoutMs = 120000) {
  const started = Date.now();
  while (Date.now() - started < timeoutMs) {
    try {
      const res = await fetch(url);
      if (res.ok) return true;
    } catch (_err) {
      // keep retrying
    }
    await wait(1000);
  }
  return false;
}

async function waitForService(url, proc, timeoutMs, serviceName) {
  const started = Date.now();
  while (Date.now() - started < timeoutMs) {
    if (proc && proc.exitCode !== null) {
      throw new Error(`${serviceName} process exited early (code=${proc.exitCode}).`);
    }
    try {
      const res = await fetch(url);
      if (res.ok) return true;
    } catch (_err) {
      // keep retrying
    }
    await wait(1000);
  }
  return false;
}

function findWindowsPidsByPort(port) {
  try {
    const out = execSync(`netstat -ano | findstr :${port}`, {
      windowsHide: true,
      encoding: "utf8"
    });
    const pids = new Set();
    for (const line of out.split(/\r?\n/)) {
      const trimmed = line.trim();
      if (!trimmed) continue;
      if (!trimmed.includes("LISTENING")) continue;
      const parts = trimmed.split(/\s+/);
      const pid = Number(parts[parts.length - 1]);
      if (Number.isFinite(pid) && pid > 0) {
        pids.add(pid);
      }
    }
    return [...pids];
  } catch (_err) {
    return [];
  }
}

function ensurePortsFree(ports) {
  if (process.platform !== "win32") return;
  for (const port of ports) {
    const pids = findWindowsPidsByPort(port);
    for (const pid of pids) {
      try {
        execSync(`taskkill /PID ${pid} /T /F`, { windowsHide: true, stdio: "ignore" });
      } catch (_err) {
        // best effort only
      }
    }
  }
}

function spawnProcess(command, args, cwd, env = {}) {
  const child = spawn(command, args, {
    cwd,
    shell: true,
    env: { ...process.env, ...env },
    windowsHide: true,
    stdio: ENABLE_CHILD_LOG_PIPE ? "pipe" : "ignore"
  });
  if (ENABLE_CHILD_LOG_PIPE) {
    if (child.stdout) {
      guardStreamErrors(child.stdout);
      child.stdout.on("data", (chunk) => {
        safeWrite(process.stdout, `[${path.basename(cwd)}] ${chunk}`);
      });
    }
    if (child.stderr) {
      guardStreamErrors(child.stderr);
      child.stderr.on("data", (chunk) => {
        safeWrite(process.stderr, `[${path.basename(cwd)}] ${chunk}`);
      });
    }
  }
  return child;
}

function killProc(proc) {
  if (!proc || proc.killed) return;
  try {
    if (process.platform === "win32") {
      execSync(`taskkill /PID ${proc.pid} /T /F`, { windowsHide: true, stdio: "ignore" });
    } else {
      proc.kill("SIGTERM");
    }
  } catch (_err) {
    // ignore shutdown errors
  }
}

function cleanupAllProcesses() {
  // Kill tracked child processes
  killProc(frontendProc);
  killProc(backendProc);

  // Also kill any remaining processes on ports (belt and suspenders)
  ensurePortsFree([8080, 3000]);

  frontendProc = null;
  backendProc = null;
}

function createWindow() {
  mainWindow = new BrowserWindow({
    title: "Complier GUI",
    width: 1600,
    height: 980,
    minWidth: 1200,
    minHeight: 760,
    backgroundColor: "#0a0f1e",
    autoHideMenuBar: true,
    webPreferences: {
      contextIsolation: true,
      nodeIntegration: false,
      sandbox: true
    }
  });

  mainWindow.setMenuBarVisibility(false);
  mainWindow.removeMenu();
  mainWindow.loadURL(FRONTEND_URL);
}

async function startServices() {
  // Cleanup stale processes from previous runs.
  ensurePortsFree([8080, 3000]);

  backendProc = spawnProcess("python", ["-m", "uvicorn", "api.main:app", "--host", "127.0.0.1", "--port", "8080"], CORE_DIR);
  const backendReady = await waitForService(BACKEND_URL, backendProc, 90000, "Backend");
  if (!backendReady) {
    throw new Error("Backend baslatilamadi. core/requirements.txt bagimliliklarini kur.");
  }

  frontendProc = spawnProcess("npm", ["run", "dev", "--", "--port", "3000"], WEB_DIR);
  const frontendReady = await waitForService(FRONTEND_URL, frontendProc, 120000, "Frontend");
  if (!frontendReady) {
    throw new Error("Frontend baslatilamadi. core/web icinde npm install gerekli.");
  }
}

app.whenReady().then(async () => {
  try {
    Menu.setApplicationMenu(null);
    await startServices();
    createWindow();
  } catch (err) {
    dialog.showErrorBox("Startup Error", String(err?.message || err));
    app.quit();
    return;
  }

  app.on("activate", () => {
    if (BrowserWindow.getAllWindows().length === 0) createWindow();
  });
});

app.on("before-quit", () => {
  cleanupAllProcesses();
});

app.on("window-all-closed", () => {
  cleanupAllProcesses();
  if (process.platform !== "darwin") {
    app.quit();
  }
});
