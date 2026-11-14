/**
 * CivicPulse Full-Stack Orchestrator
 * Automatically starts:
 *   1. FastAPI AI Vision & NLP Service (port 8000)
 *   2. Express Node.js Backend API (port 4000)
 *   3. Vite React Frontend (port 5173)
 * Guarantees zero proxy errors and cleans up all processes on Ctrl+C.
 */

const { spawn, execSync } = require('child_process');
const http = require('http');
const path = require('path');
const fs = require('fs');

const isWin = process.platform === 'win32';

// Resolve project directories whether invoked from CivicPulseApp or CivicPulse
let rootDir = __dirname;
if (!fs.existsSync(path.join(rootDir, 'CivicPulse')) && fs.existsSync(path.join(rootDir, 'backend'))) {
  rootDir = path.resolve(rootDir, '..');
}

const frontendDir = path.join(rootDir, 'CivicPulse');
const backendDir = path.join(rootDir, 'CivicPulse', 'backend');
const aiDir = path.join(rootDir, 'CivicPulse', 'ai-service');

const processes = [];

// Colored terminal output
const log = {
  launcher: (msg) => console.log(`\x1b[33m[CivicPulse]\x1b[0m ${msg}`),
  ai: (msg) => process.stdout.write(`\x1b[35m[AI Engine]\x1b[0m ${msg}`),
  backend: (msg) => process.stdout.write(`\x1b[36m[Backend]\x1b[0m ${msg}`),
  frontend: (msg) => process.stdout.write(`\x1b[32m[Frontend]\x1b[0m ${msg}`),
  error: (msg) => console.error(`\x1b[31m[Error]\x1b[0m ${msg}`),
};

function checkPort(port, checkPath = '/') {
  return new Promise((resolve) => {
    const req = http.get({ hostname: 'localhost', port, path: checkPath, timeout: 600 }, (res) => {
      resolve(true);
    });
    req.on('error', () => resolve(false));
    req.on('timeout', () => { req.destroy(); resolve(false); });
  });
}

function killProcess(proc) {
  if (!proc || !proc.pid) return;
  try {
    if (isWin) {
      execSync(`taskkill /pid ${proc.pid} /T /F`, { stdio: 'ignore' });
    } else {
      process.kill(-proc.pid);
    }
  } catch (e) {}
}

let isCleaningUp = false;
function cleanExit() {
  if (isCleaningUp) return;
  isCleaningUp = true;
  log.launcher('Stopping all CivicPulse background processes...');
  for (const p of processes) {
    killProcess(p);
  }
  process.exit(0);
}

process.on('SIGINT', cleanExit);
process.on('SIGTERM', cleanExit);

function pipeOutput(proc, logger) {
  if (proc.stdout) proc.stdout.on('data', (d) => logger(d.toString()));
  if (proc.stderr) proc.stderr.on('data', (d) => logger(d.toString()));
  proc.on('error', (err) => log.error(`Process error: ${err.message}`));
}

async function startAI() {
  const isRunning = await checkPort(8000, '/');
  if (isRunning) {
    log.launcher('FastAPI AI Service already running on http://localhost:8000 (reusing)');
    return;
  }

  log.launcher('Starting FastAPI AI Vision & NLP Service on port 8000...');
  let pythonCmd = 'python';
  try {
    execSync('python --version', { stdio: 'ignore' });
  } catch (e) {
    try {
      execSync('py --version', { stdio: 'ignore' });
      pythonCmd = 'py';
    } catch (e2) {
      pythonCmd = 'python3';
    }
  }

  const p = spawn(pythonCmd, ['-m', 'uvicorn', 'main:app', '--host', '0.0.0.0', '--port', '8000', '--reload'], {
    cwd: aiDir,
    shell: true,
  });
  processes.push(p);
  pipeOutput(p, log.ai);
}

async function startBackend() {
  const isRunning = await checkPort(4000, '/api/v1/health');
  if (isRunning) {
    log.launcher('Express Backend API already running on http://localhost:4000 (reusing)');
    return;
  }

  log.launcher('Starting Express Backend API on port 4000...');
  const npmCmd = isWin ? 'npm.cmd' : 'npm';
  const p = spawn(npmCmd, ['run', 'dev'], {
    cwd: backendDir,
    shell: true,
  });
  processes.push(p);
  pipeOutput(p, log.backend);
}

async function waitForBackend(maxWaitMs = 15000) {
  log.launcher('Waiting for Backend API (:4000) to be ready...');
  const start = Date.now();
  while (Date.now() - start < maxWaitMs) {
    const ok = await checkPort(4000, '/api/v1/health');
    if (ok) {
      log.launcher('✔ Backend API is healthy and ready on port 4000');
      return true;
    }
    await new Promise((r) => setTimeout(r, 400));
  }
  log.launcher('Notice: Backend still starting up, proceeding to launch Frontend...');
  return false;
}

async function startFrontend() {
  const isRunning = await checkPort(5173, '/');
  if (isRunning) {
    log.launcher('Vite Frontend already running on http://localhost:5173 (reusing)');
    return;
  }

  log.launcher('Starting Vite Frontend on port 5173...');
  const npmCmd = isWin ? 'npm.cmd' : 'npm';
  const p = spawn(npmCmd, ['run', 'dev:vite'], {
    cwd: frontendDir,
    shell: true,
  });
  processes.push(p);
  pipeOutput(p, log.frontend);
}

async function main() {
  console.log('\x1b[36m============================================================\x1b[0m');
  console.log('\x1b[36m              CivicPulse Full-Stack Orchestrator            \x1b[0m');
  console.log('\x1b[36m============================================================\x1b[0m');

  await startAI();
  await startBackend();
  await waitForBackend();
  await startFrontend();

  console.log('\n\x1b[32m✔ All CivicPulse services active. Press Ctrl+C to stop all.\x1b[0m\n');
}

main().catch((err) => {
  log.error(err.message);
  cleanExit();
});
