import * as log from "@std/log";
import * as path from "@std/path";
import { ensureDirSync } from "@std/fs";
import process from "node:process";

import t from "../i18n.ts";
import OsUtils from "../os/os_utils.ts";

export interface LockMetadata {
  pid: number;
  command: string;
  startedAt: string;
  hostname?: string;
  token: string;
}

export interface AcquireLockOptions {
  command: string;
  waitTimeoutMs?: number;
  pollIntervalMs?: number;
  staleCorruptAgeMs?: number;
  isPidAlive?: (pid: number) => boolean;
}

export class InstanceLockError extends Error {
  constructor(message: string) {
    super(message);
    this.name = "InstanceLockError";
  }
}

interface ActiveLockEntry {
  count: number;
  token: string;
  lockPath: string;
}

export class InstanceLock {
  public static readonly DEFAULT_WAIT_TIMEOUT_MS = 5000;
  public static readonly DEFAULT_POLL_INTERVAL_MS = 200;
  public static readonly DEFAULT_STALE_CORRUPT_AGE_MS = 2000;

  // Tracks lock files currently held by this process so nested flows
  // (e.g. `shell` -> `install` -> `maybeAutoClean` -> `clean`) are re-entrant.
  private static readonly activeInProcess = new Map<string, ActiveLockEntry>();

  private released = false;

  private constructor(
    public readonly lockPath: string,
    private readonly mapKey: string,
  ) {}

  private static keyFor(resolvedPath: string): string {
    return OsUtils.isWindows() ? resolvedPath.toLowerCase() : resolvedPath;
  }

  static async acquire(lockPath: string, options: AcquireLockOptions): Promise<InstanceLock> {
    const resolvedPath = path.resolve(lockPath);
    const mapKey = InstanceLock.keyFor(resolvedPath);
    const active = InstanceLock.activeInProcess.get(mapKey);
    if (active) {
      active.count++;
      return new InstanceLock(resolvedPath, mapKey);
    }

    ensureDirSync(path.dirname(resolvedPath));

    const waitTimeoutMs = options.waitTimeoutMs ?? InstanceLock.DEFAULT_WAIT_TIMEOUT_MS;
    const pollIntervalMs = options.pollIntervalMs ?? InstanceLock.DEFAULT_POLL_INTERVAL_MS;
    const staleCorruptAgeMs = options.staleCorruptAgeMs ?? InstanceLock.DEFAULT_STALE_CORRUPT_AGE_MS;
    const checkAlive = options.isPidAlive ?? InstanceLock.isPidAlive;

    const token = crypto.randomUUID();
    const currentHost = OsUtils.hostname;
    const metadata: LockMetadata = {
      pid: Deno.pid,
      command: options.command,
      startedAt: new Date().toISOString(),
      hostname: currentHost,
      token,
    };

    const deadline = Date.now() + waitTimeoutMs;
    let lastHolder: LockMetadata | undefined;

    while (true) {
      if (InstanceLock.tryCreateExclusive(resolvedPath, metadata)) {
        InstanceLock.activeInProcess.set(mapKey, { count: 1, token, lockPath: resolvedPath });
        log.debug(`Acquired instance lock: ${resolvedPath} (pid=${metadata.pid}, cmd=${metadata.command})`);
        return new InstanceLock(resolvedPath, mapKey);
      }

      const existing = InstanceLock.tryReadMetadata(resolvedPath);
      if (existing === "missing") {
        // Released concurrently between createNew and read -> retry immediately while within deadline
        if (Date.now() < deadline) {
          continue;
        }
      } else if (existing === "corrupt") {
        if (InstanceLock.isOlderThan(resolvedPath, staleCorruptAgeMs)) {
          log.warn(t("lib.fs.instance_lock.removingCorrupt", { lockPath: resolvedPath }));
          if (InstanceLock.tryRemoveFile(resolvedPath) && Date.now() < deadline) {
            continue;
          }
        }
      } else if (existing !== "unreadable") {
        lastHolder = existing;
        const sameHost = !existing.hostname ||
          (currentHost !== undefined && existing.hostname.toLowerCase() === currentHost.toLowerCase());

        if (sameHost && !checkAlive(existing.pid)) {
          log.warn(
            t("lib.fs.instance_lock.removingStale", {
              pid: existing.pid,
              command: existing.command,
              lockPath: resolvedPath,
            }),
          );
          if (InstanceLock.removeIfTokenMatches(resolvedPath, existing.token) && Date.now() < deadline) {
            continue;
          }
        }
      }

      const remaining = deadline - Date.now();
      if (remaining <= 0) {
        const pidText = lastHolder ? String(lastHolder.pid) : "unknown";
        const cmdText = lastHolder?.command || "unknown";
        const startedText = lastHolder?.startedAt || "unknown";
        throw new InstanceLockError(
          t("lib.fs.instance_lock.busy", {
            pid: pidText,
            command: cmdText,
            startedAt: startedText,
            lockPath: resolvedPath,
          }),
        );
      }

      await new Promise((resolve) => setTimeout(resolve, Math.min(pollIntervalMs, remaining)));
    }
  }

  release(): void {
    if (this.released) {
      return;
    }
    this.released = true;

    const entry = InstanceLock.activeInProcess.get(this.mapKey);
    if (!entry) {
      return;
    }
    if (entry.count > 1) {
      entry.count--;
      return;
    }

    InstanceLock.activeInProcess.delete(this.mapKey);
    InstanceLock.removeIfTokenMatches(entry.lockPath, entry.token);
    log.debug(`Released instance lock: ${entry.lockPath}`);
  }

  /** Releases all locks currently held by this process (e.g. before `Deno.exit(42)` self-upgrade). */
  static releaseAll(): void {
    for (const entry of InstanceLock.activeInProcess.values()) {
      InstanceLock.removeIfTokenMatches(entry.lockPath, entry.token);
      log.debug(`Released instance lock: ${entry.lockPath}`);
    }
    InstanceLock.activeInProcess.clear();
  }

  static isPidAlive(pid: number): boolean {
    if (!Number.isInteger(pid) || pid <= 0) {
      return false;
    }
    if (pid === Deno.pid) {
      return true;
    }

    try {
      process.kill(pid, 0);
      return true;
    } catch (err) {
      const code = (err as { code?: string })?.code;
      if (code === "ESRCH") {
        return false;
      }
      // EPERM means the process exists under another user; fail closed on unknown errors
      return true;
    }
  }

  private static tryCreateExclusive(lockPath: string, metadata: LockMetadata): boolean {
    let file: Deno.FsFile;
    try {
      file = Deno.openSync(lockPath, { createNew: true, write: true });
    } catch (err) {
      if (err instanceof Deno.errors.AlreadyExists) {
        return false;
      }
      throw err;
    }

    try {
      const payload = new TextEncoder().encode(JSON.stringify(metadata, null, 2) + "\n");
      let written = 0;
      while (written < payload.length) {
        written += file.writeSync(payload.subarray(written));
      }
    } catch (err) {
      try {
        file.close();
      } catch {
        // ignore close error
      }
      InstanceLock.tryRemoveFile(lockPath);
      throw err;
    }

    file.close();
    return true;
  }

  private static tryReadMetadata(lockPath: string): LockMetadata | "missing" | "corrupt" | "unreadable" {
    let raw: string;
    try {
      raw = Deno.readTextFileSync(lockPath);
    } catch (err) {
      if (err instanceof Deno.errors.NotFound) {
        return "missing";
      }
      return "unreadable";
    }

    try {
      const parsed = JSON.parse(raw);
      if (
        typeof parsed === "object" &&
        parsed !== null &&
        typeof parsed.pid === "number" &&
        typeof parsed.command === "string" &&
        typeof parsed.startedAt === "string" &&
        typeof parsed.token === "string"
      ) {
        return parsed as LockMetadata;
      }
      return "corrupt";
    } catch {
      return "corrupt";
    }
  }

  private static isOlderThan(filePath: string, ageMs: number): boolean {
    try {
      const stat = Deno.statSync(filePath);
      if (!stat.mtime) {
        return false;
      }
      return Date.now() - stat.mtime.getTime() >= ageMs;
    } catch {
      return false;
    }
  }

  private static removeIfTokenMatches(lockPath: string, expectedToken: string): boolean {
    const current = InstanceLock.tryReadMetadata(lockPath);
    if (current === "missing") {
      return true;
    }
    if (current === "corrupt" || current === "unreadable") {
      return false;
    }
    if (current.token !== expectedToken) {
      return false;
    }
    return InstanceLock.tryRemoveFile(lockPath);
  }

  private static tryRemoveFile(filePath: string): boolean {
    try {
      Deno.removeSync(filePath);
      return true;
    } catch (err) {
      if (err instanceof Deno.errors.NotFound) {
        return true;
      }
      log.debug(`Could not remove lock file ${filePath}: ${err}`);
      return false;
    }
  }
}
