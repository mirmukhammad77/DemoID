import { spawn } from 'node:child_process';
import { existsSync, readFileSync } from 'node:fs';
import { createServer } from 'node:net';
import { fileURLToPath } from 'node:url';
import { dirname, join, resolve } from 'node:path';
import { createInterface } from 'node:readline';
import { parseEnv } from 'node:util';
import { setTimeout as delay } from 'node:timers/promises';

const root = resolve(dirname(fileURLToPath(import.meta.url)), '..');
const windows = process.platform === 'win32';
const children = [];
let stopping = false;
let stopPromise;

function environment(directory) {
  const file = join(directory, '.env');
  return { ...(existsSync(file) ? parseEnv(readFileSync(file, 'utf8')) : {}), ...process.env };
}

function integer(value, fallback, name, maximum = 65535) {
  const number = Number(value ?? fallback);
  if (!Number.isInteger(number) || number < 1 || number > maximum) throw new Error(`Invalid ${name}.`);
  return number;
}

async function available(host, port, label) {
  const server = createServer();
  await new Promise((accept, reject) => {
    server.once('error', () => reject(new Error(`${label} port is unavailable. Stop its current owner or change the documented port settings.`)));
    server.listen(port, host, accept);
  });
  await new Promise(resolveClose => server.close(resolveClose));
}

function start(label, executable, args, cwd, env) {
  const child = spawn(executable, args, { cwd, env, windowsHide: true,
    detached: !windows, stdio: ['ignore', 'pipe', 'pipe'] });
  const entry = { label, child, exited: false };
  children.push(entry);
  for (const stream of [child.stdout, child.stderr]) {
    createInterface({ input: stream }).on('line', line => {
      console.log(`[${label}] ${line}`);
      if (label === 'api' && /^(API startup failed\.|Missing configuration:|Invalid configuration:|WEB_ORIGIN must|FACE_SIMILARITY_THRESHOLD is retired)/.test(line)) {
        void stop(1, 'API startup failed; correct the reported configuration or dependency.');
      }
    });
  }
  child.on('error', () => { void stop(1, `${label} could not start. Check its executable, dependencies, and configuration.`); });
  child.on('exit', (code, signal) => {
    entry.exited = true;
    if (!stopping) void stop(1, `${label} exited unexpectedly (${signal ?? code}). Stopping the backend pair.`);
  });
  return entry;
}

function run(executable, args) {
  return new Promise(resolveRun => {
    const child = spawn(executable, args, { windowsHide: true, stdio: ['ignore', 'pipe', 'ignore'] });
    let output = '';
    child.stdout.on('data', chunk => { output += chunk; });
    child.on('error', () => resolveRun(''));
    child.on('close', () => resolveRun(output));
  });
}

async function stopWindows(entry) {
  if (!entry.child.pid) return;
  const pid = entry.child.pid;
  const systemRoot = process.env.SystemRoot ?? 'C:\\Windows';
  const powershell = join(systemRoot, 'System32/WindowsPowerShell/v1.0/powershell.exe');
  // Snapshot only IDs and creation times, so a watcher parent exiting cannot orphan untracked children.
  const script = `$items = @(Get-CimInstance Win32_Process); $owned = @(${pid}); do { $next = @($items | Where-Object { $_.ParentProcessId -in $owned -and $_.ProcessId -notin $owned } | Select-Object -ExpandProperty ProcessId); $owned += $next } while ($next.Count); @($items | Where-Object { $_.ProcessId -in $owned } | Select-Object ProcessId, CreationDate) | ConvertTo-Json -Compress`;
  let owned = [];
  try {
    const result = JSON.parse(await run(powershell, ['-NoProfile', '-NonInteractive', '-Command', script]));
    owned = Array.isArray(result) ? result : [result];
  } catch { /* taskkill still handles the tracked root tree when CIM is unavailable. */ }
  const taskkill = join(systemRoot, 'System32/taskkill.exe');
  await run(taskkill, ['/PID', String(pid), '/T']);
  await delay(1000);
  await run(taskkill, ['/PID', String(pid), '/T', '/F']);
  for (const item of owned.reverse()) {
    if (!Number.isSafeInteger(item?.ProcessId) || !item.CreationDate) continue;
    const encodedCreation = Buffer.from(JSON.stringify(item.CreationDate)).toString('base64');
    const cleanup = `$expected = [System.Text.Encoding]::UTF8.GetString([Convert]::FromBase64String('${encodedCreation}')) | ConvertFrom-Json; $current = Get-CimInstance Win32_Process -Filter 'ProcessId = ${item.ProcessId}' -ErrorAction SilentlyContinue; if ($current -and (($current.CreationDate | ConvertTo-Json -Compress) -eq ($expected | ConvertTo-Json -Compress))) { & '${taskkill.replaceAll("'", "''")}' /PID ${item.ProcessId} /T /F | Out-Null }`;
    await run(powershell, ['-NoProfile', '-NonInteractive', '-Command', cleanup]);
  }
}

async function stopPosix(entry) {
  if (!entry.child.pid) return;
  try { process.kill(-entry.child.pid, 'SIGTERM'); } catch { return; }
  await delay(1000);
  try { process.kill(-entry.child.pid, 'SIGKILL'); } catch { /* Already stopped. */ }
}

function stop(code, message) {
  if (stopPromise) return stopPromise;
  stopping = true;
  if (message) console.log(`[dev] ${message}`);
  stopPromise = (async () => {
    await Promise.all(children.map(entry => windows ? stopWindows(entry) : stopPosix(entry)));
    process.exitCode = code;
    console.log('[dev] Backend processes stopped.');
  })();
  return stopPromise;
}

process.on('SIGINT', () => { void stop(0, 'Stopping both backends...'); });
process.on('SIGTERM', () => { void stop(0, 'Stopping both backends...'); });

async function apiReady(url) {
  try {
    const response = await fetch(url + '/api', { signal: AbortSignal.timeout(1000), redirect: 'error' });
    await response.body?.cancel();
    return response.headers.get('cache-control') === 'no-store';
  } catch { return false; }
}

async function workerReady(url) {
  try {
    const response = await fetch(url + '/health/ready', { signal: AbortSignal.timeout(1000), redirect: 'error' });
    if (!response.ok) { await response.body?.cancel(); return false; }
    const text = await response.text();
    if (text.length > 4096) return false;
    const body = JSON.parse(text);
    return body.status === 'ready' && body.model === 'VGG-Face' && body.detector === 'opencv' && body.metric === 'cosine';
  } catch { return false; }
}

async function main() {
  const launcherEnv = environment(root);
  const apiDirectory = join(root, 'api');
  const pythonDirectory = join(root, 'deepface-service');
  const apiEnv = environment(apiDirectory);
  const pythonEnv = environment(pythonDirectory);
  const python = launcherEnv.PYTHON_EXECUTABLE || join(pythonDirectory, '.venv', windows ? 'Scripts/python.exe' : 'bin/python');
  if (!existsSync(python)) throw new Error('Python executable not found. Create deepface-service/.venv using Python 3.11 or set PYTHON_EXECUTABLE to an installed interpreter path.');
  const startupTimeout = integer(launcherEnv.DEV_STARTUP_TIMEOUT_MS, 180000, 'DEV_STARTUP_TIMEOUT_MS', 3600000);
  const apiPort = integer(apiEnv.PORT, 3000, 'PORT');
  const workerPort = integer(pythonEnv.DEEPFACE_PORT, 8000, 'DEEPFACE_PORT');
  const apiHost = apiEnv.HOST || '127.0.0.1';
  const workerHost = pythonEnv.DEEPFACE_HOST || '127.0.0.1';
  if (!['127.0.0.1', 'localhost', '::1'].includes(workerHost)) throw new Error('DEEPFACE_HOST must be a loopback address.');
  const workerUrl = new URL(apiEnv.DEEPFACE_BASE_URL || 'http://127.0.0.1:8000');
  const normalizedWorkerHost = workerUrl.hostname.replace(/^\[|\]$/g, '');
  if (workerUrl.protocol !== 'http:' || normalizedWorkerHost !== workerHost || Number(workerUrl.port || 80) !== workerPort
    || workerUrl.username || workerUrl.password || workerUrl.pathname !== '/' || workerUrl.search || workerUrl.hash) {
    throw new Error('DEEPFACE_BASE_URL in api/.env must point to this Python service’s host and port.');
  }
  await available(apiHost, apiPort, 'API');
  await available(workerHost, workerPort, 'Python');
  if (stopping) return;
  console.log('[dev] Starting NestJS and Python; waiting for API reachability and initialized model readiness...');
  start('api', process.execPath, ['--watch', '--env-file-if-exists=.env', '-r', 'ts-node/register', 'src/main.ts'], apiDirectory, apiEnv);
  start('python', python, ['-u', '-m', 'app'], pythonDirectory, pythonEnv);
  const displayHost = apiHost === '0.0.0.0' ? '127.0.0.1' : apiHost === '::' ? '::1' : apiHost;
  const apiUrl = `http://${displayHost.includes(':') ? '[' + displayHost + ']' : displayHost}:${apiPort}`;
  const deadline = Date.now() + startupTimeout;
  while (!stopping && Date.now() < deadline) {
    const [api, worker] = await Promise.all([apiReady(apiUrl), workerReady(workerUrl.origin)]);
    if (stopping) break;
    if (api && worker) {
      console.log(`[dev] Both backends ready. Public API: ${apiUrl}/api`);
      return;
    }
    await delay(500);
  }
  if (!stopping) await stop(1, 'Startup deadline exceeded. Check service logs and run the documented model preparation command before retrying.');
}

main().catch(error => { void stop(1, error instanceof Error ? error.message : 'Development startup failed.'); });
