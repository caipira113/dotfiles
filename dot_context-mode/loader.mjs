import childProcess from "node:child_process";
import { createHash, randomBytes } from "node:crypto";
import { mkdirSync, mkdtempSync, readFileSync, readdirSync, renameSync, rmSync, writeFileSync } from "node:fs";
import { syncBuiltinESMExports } from "node:module";
import { tmpdir } from "node:os";
import { join } from "node:path";

const projectRoot =
  process.env.CONTEXT_MODE_PROJECT_DIR ||
  process.env.GEMINI_PROJECT_DIR ||
  process.env.VSCODE_CWD ||
  process.cwd();
const snapshotKey = createHash("sha256").update(projectRoot).digest("hex").slice(0, 16);
const hookEnvDir = join(tmpdir(), "context-mode-env-snapshots");
const hookEnvPrefix = `context-mode-env-${snapshotKey}-`;
const hookEnvTtlMs = 5 * 60 * 1000;

if (process.env.CONTEXT_MODE_CAPTURE_ENV === "1" || process.argv.includes("--capture-env")) {
  captureHookEnv(getCaptureSnapshotCount());
  process.exit(0);
}

const originalSpawn = childProcess.spawn;
const originalSpawnSync = childProcess.spawnSync;
const originalExecFileSync = childProcess.execFileSync;
const originalExecSync = childProcess.execSync;
let lastShellEnv = null;

function isContextModeTempDir(value) {
  return typeof value === "string" && /(^|[\\/])\.ctx-mode-[^\\/]+$/.test(value);
}

function normalizeEnvObject(value) {
  if (!value || typeof value !== "object" || Array.isArray(value)) return null;

  const env = {};
  for (const [key, envValue] of Object.entries(value)) {
    if (typeof envValue === "string") env[key] = envValue;
  }
  return env;
}

function readEnvFile(filePath) {
  const parsed = JSON.parse(readFileSync(filePath, "utf8"));
  const envSource = parsed && typeof parsed === "object" && !Array.isArray(parsed) && parsed.env
    ? parsed.env
    : parsed;

  return normalizeEnvObject(envSource);
}

function removeOldHookEnvSnapshots(now = Date.now()) {
  let names;
  try {
    names = readdirSync(hookEnvDir);
  } catch {
    return;
  }

  for (const name of names) {
    if (!name.startsWith(hookEnvPrefix)) continue;

    const timestamp = Number(name.slice(hookEnvPrefix.length).split("-")[0]);
    if (!Number.isFinite(timestamp) || now - timestamp > hookEnvTtlMs) {
      rmSync(join(hookEnvDir, name), { force: true });
    }
  }
}

function getCaptureSnapshotCount() {
  if (process.stdin.isTTY) return 1;

  try {
    const raw = readFileSync(0, "utf8");
    if (!raw.trim()) return 1;

    const input = JSON.parse(raw);
    const toolInput = input && typeof input === "object" ? input.tool_input : null;
    const commands = toolInput && typeof toolInput === "object" ? toolInput.commands : null;
    if (Array.isArray(commands)) return Math.max(1, Math.min(commands.length, 128));
  } catch {
    // Hook stdin is optional for manual capture calls.
  }

  return 1;
}

function captureHookEnv(count = 1) {
  mkdirSync(hookEnvDir, { recursive: true });
  removeOldHookEnvSnapshots();

  const createdAt = Date.now();
  const payload = JSON.stringify({
    version: 1,
    projectRoot,
    createdAt,
    pid: process.pid,
    env: process.env,
  });

  for (let index = 0; index < count; index += 1) {
    const finalFile = join(
      hookEnvDir,
      `${hookEnvPrefix}${createdAt}-${process.pid}-${String(index).padStart(3, "0")}-${randomBytes(6).toString("hex")}.json`,
    );
    const tempFile = `${finalFile}.tmp`;
    writeFileSync(tempFile, payload);
    renameSync(tempFile, finalFile);
  }
}

function getHookEnv() {
  removeOldHookEnvSnapshots();

  let names;
  try {
    names = readdirSync(hookEnvDir);
  } catch {
    return null;
  }

  for (const name of names.filter((entry) => {
    return entry.startsWith(hookEnvPrefix) && entry.endsWith(".json");
  }).sort()) {
    const filePath = join(hookEnvDir, name);
    const claimedPath = `${filePath}.claim-${process.pid}-${randomBytes(4).toString("hex")}`;
    try {
      renameSync(filePath, claimedPath);
    } catch {
      continue;
    }

    try {
      const parsed = JSON.parse(readFileSync(claimedPath, "utf8"));
      if (!parsed || typeof parsed !== "object" || Array.isArray(parsed)) continue;
      if (parsed.projectRoot && parsed.projectRoot !== projectRoot) continue;
      if (typeof parsed.createdAt !== "number" || Date.now() - parsed.createdAt > hookEnvTtlMs) {
        continue;
      }

      const env = normalizeEnvObject(parsed.env);
      if (env) return { ...process.env, ...env };
    } catch {
      // Ignore broken snapshots and keep fallback path available.
    } finally {
      rmSync(claimedPath, { force: true });
    }
  }

  return null;
}

function resolveShell() {
  return process.env.CONTEXT_MODE_ENV_SHELL ||
    process.env.SHELL ||
    process.env.ComSpec ||
    process.env.COMSPEC ||
    null;
}

function quoteShellToken(value) {
  return `"${String(value).replace(/"/g, '\\"')}"`;
}

function rawShellToken(value) {
  const text = String(value);
  return /^[^\s"'`&|;<>()]+$/.test(text) ? text : null;
}

function shellEnvSnapshotCommands() {
  const code = [
    "require('node:fs').writeFileSync(process.env.CONTEXT_MODE_ENV_FILE,JSON.stringify(process.env));",
  ].join("");
  const rawExec = rawShellToken(process.execPath);
  const quotedExec = quoteShellToken(process.execPath);
  const codeArg = quoteShellToken(code);
  return [
    rawExec ? `${rawExec} -e ${codeArg}` : null,
    `${quotedExec} -e ${codeArg}`,
    `& ${quotedExec} -e ${codeArg}`,
  ].filter(Boolean);
}

function getShellEnv() {
  const hookEnv = getHookEnv();
  if (hookEnv) {
    lastShellEnv = hookEnv;
    return hookEnv;
  }

  const shell = resolveShell();
  if (!shell) return { ...process.env };

  const snapshotDir = mkdtempSync(join(tmpdir(), ".ctx-mode-env-"));
  const snapshotFile = join(snapshotDir, "env.json");
  try {
    for (const command of shellEnvSnapshotCommands()) {
      try {
        rmSync(snapshotFile, { force: true });
        originalSpawnSync(command, {
          cwd: projectRoot,
          env: { ...process.env, CONTEXT_MODE_ENV_FILE: snapshotFile },
          encoding: "utf8",
          stdio: ["ignore", "ignore", "ignore"],
          timeout: 15000,
          windowsHide: true,
          shell,
        });
        const shellEnv = readEnvFile(snapshotFile);
        if (shellEnv) {
          lastShellEnv = { ...process.env, ...shellEnv };
          return lastShellEnv;
        }
      } catch {
        // Try the next shell grammar.
      }
    }
  } finally {
    rmSync(snapshotDir, { recursive: true, force: true });
  }

  return lastShellEnv ? { ...lastShellEnv } : { ...process.env };
}

function patchExecOptions(options) {
  if (!options || typeof options !== "object") return options;

  const patched = { ...options };
  const sandboxEnv = patched.env && isContextModeTempDir(patched.env.TMPDIR);
  const sandboxCwd = isContextModeTempDir(patched.cwd);

  if (sandboxCwd) {
    patched.cwd = projectRoot;
  }

  if (sandboxEnv || sandboxCwd) {
    patched.env = getShellEnv();
  }

  return patched;
}

function patchSpawnArgs(args) {
  if (args.length < 3) return args;
  return [args[0], args[1], patchExecOptions(args[2])];
}

childProcess.spawn = function spawnNoSandbox(...args) {
  return originalSpawn.apply(this, patchSpawnArgs(args));
};

childProcess.execFileSync = function execFileSyncNoSandbox(command, args, options) {
  return originalExecFileSync.call(this, command, args, patchExecOptions(options));
};

childProcess.execSync = function execSyncNoSandbox(command, options) {
  return originalExecSync.call(this, command, patchExecOptions(options));
};

childProcess.spawnSync = function spawnSyncNoSandbox(...args) {
  return originalSpawnSync.apply(this, patchSpawnArgs(args));
};

syncBuiltinESMExports();
