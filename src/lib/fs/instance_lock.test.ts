import * as path from "@std/path";
import { assert, assertEquals, assertFalse, assertRejects } from "@std/assert";
import { existsSync } from "@std/fs";

import TestHelper from "../test/test_helper.ts";
import OsUtils from "../os/os_utils.ts";
import { InstanceLock, InstanceLockError } from "./instance_lock.ts";

Deno.test("InstanceLock should acquire, allow same-process re-entrancy, and release cleanly", async () => {
  const dir = TestHelper.getNewTempDir();
  const lockPath = path.join(dir, ".levain", "levain.lock");

  const outer = await InstanceLock.acquire(lockPath, { command: "install" });
  assert(existsSync(lockPath));

  const meta = JSON.parse(Deno.readTextFileSync(lockPath));
  assertEquals(meta.pid, Deno.pid);
  assertEquals(meta.command, "install");
  assert(typeof meta.token === "string" && meta.token.length > 0);

  // Nested acquisition in the same process succeeds immediately
  const inner = await InstanceLock.acquire(lockPath, { command: "clean" });
  inner.release();
  // Lock file stays held until the outermost owner releases it
  assert(existsSync(lockPath));

  outer.release();
  assertFalse(existsSync(lockPath));
  // Double release is a safe no-op
  outer.release();
});

Deno.test("InstanceLock should fail fast with InstanceLockError when held by another active process", async () => {
  const dir = TestHelper.getNewTempDir();
  const lockPath = path.join(dir, "levain.lock");

  Deno.writeTextFileSync(
    lockPath,
    JSON.stringify({
      pid: 987654,
      command: "update",
      startedAt: "2026-11-25T10:00:00.000Z",
      hostname: OsUtils.hostname,
      token: "other-token",
    }),
  );

  await assertRejects(
    async () => {
      await InstanceLock.acquire(lockPath, {
        command: "install",
        waitTimeoutMs: 60,
        pollIntervalMs: 20,
        isPidAlive: () => true,
      });
    },
    InstanceLockError,
    "987654",
  );
  // Active lock must remain untouched
  assert(existsSync(lockPath));
});

Deno.test("InstanceLock should wait briefly and succeed when concurrent holder releases lock", async () => {
  const dir = TestHelper.getNewTempDir();
  const lockPath = path.join(dir, "levain.lock");

  Deno.writeTextFileSync(
    lockPath,
    JSON.stringify({
      pid: 987654,
      command: "clean",
      startedAt: "2026-11-25T10:00:00.000Z",
      hostname: OsUtils.hostname,
      token: "short-lived-token",
    }),
  );

  const timer = setTimeout(() => {
    try {
      Deno.removeSync(lockPath);
    } catch {
      // ignore
    }
  }, 40);

  try {
    const lock = await InstanceLock.acquire(lockPath, {
      command: "install",
      waitTimeoutMs: 1000,
      pollIntervalMs: 15,
      isPidAlive: () => true,
    });
    try {
      assert(existsSync(lockPath));
      const meta = JSON.parse(Deno.readTextFileSync(lockPath));
      assertEquals(meta.command, "install");
    } finally {
      lock.release();
    }
  } finally {
    clearTimeout(timer);
  }
});

Deno.test("InstanceLock should recover stale locks from dead processes on the same host", async () => {
  const dir = TestHelper.getNewTempDir();
  const lockPath = path.join(dir, "levain.lock");

  Deno.writeTextFileSync(
    lockPath,
    JSON.stringify({
      pid: 444444,
      command: "install",
      startedAt: "2026-11-25T09:00:00.000Z",
      hostname: OsUtils.hostname,
      token: "dead-token",
    }),
  );

  const lock = await InstanceLock.acquire(lockPath, {
    command: "update",
    waitTimeoutMs: 200,
    pollIntervalMs: 20,
    isPidAlive: () => false,
  });
  try {
    const meta = JSON.parse(Deno.readTextFileSync(lockPath));
    assertEquals(meta.pid, Deno.pid);
    assertEquals(meta.command, "update");
  } finally {
    lock.release();
  }
  assertFalse(existsSync(lockPath));
});

Deno.test("InstanceLock should not steal lock owned by a different hostname", async () => {
  const dir = TestHelper.getNewTempDir();
  const lockPath = path.join(dir, "levain.lock");

  Deno.writeTextFileSync(
    lockPath,
    JSON.stringify({
      pid: 444444,
      command: "install",
      startedAt: "2026-11-25T09:00:00.000Z",
      hostname: "definitely-another-machine-hostname",
      token: "remote-token",
    }),
  );

  await assertRejects(
    async () => {
      await InstanceLock.acquire(lockPath, {
        command: "update",
        waitTimeoutMs: 40,
        pollIntervalMs: 15,
        isPidAlive: () => false,
      });
    },
    InstanceLockError,
    "444444",
  );
});

Deno.test("InstanceLock should recover old corrupt lock files and respect token ownership on release", async () => {
  const dir = TestHelper.getNewTempDir();
  const lockPath = path.join(dir, "levain.lock");

  Deno.writeTextFileSync(lockPath, "{not valid json");

  const lock = await InstanceLock.acquire(lockPath, {
    command: "clean",
    waitTimeoutMs: 200,
    pollIntervalMs: 15,
    staleCorruptAgeMs: 0,
  });
  try {
    // Overwrite lock with a different token to prove release() will not delete someone else's lock
    Deno.writeTextFileSync(
      lockPath,
      JSON.stringify({
        pid: 12345,
        command: "other",
        startedAt: "2026-11-25T10:00:00.000Z",
        token: "different-owner-token",
      }),
    );
  } finally {
    lock.release();
  }
  assert(existsSync(lockPath));
});

Deno.test("InstanceLock should support out-of-order nested release and releaseAll", async () => {
  const dir = TestHelper.getNewTempDir();
  const lockPath = path.join(dir, ".levain", "levain.lock");

  const outer = await InstanceLock.acquire(lockPath, { command: "install" });
  const inner = await InstanceLock.acquire(lockPath, { command: "clean" });

  // Out-of-order: releasing outer before inner must still delete lock once inner releases
  outer.release();
  assert(existsSync(lockPath));
  inner.release();
  assertFalse(existsSync(lockPath));

  // releaseAll cleans up all held locks (used before Deno.exit(42) self-upgrade)
  await InstanceLock.acquire(lockPath, { command: "update" });
  assert(existsSync(lockPath));
  InstanceLock.releaseAll();
  assertFalse(existsSync(lockPath));
});

Deno.test("InstanceLock should respect deadline without spinning when lock path is an unremovable directory", async () => {
  const dir = TestHelper.getNewTempDir();
  const lockPath = path.join(dir, "levain.lock");
  // Directory at lockPath causes readTextFileSync -> "unreadable", testing bounded timeout
  Deno.mkdirSync(lockPath);

  await assertRejects(
    async () => {
      await InstanceLock.acquire(lockPath, {
        command: "install",
        waitTimeoutMs: 40,
        pollIntervalMs: 15,
      });
    },
    InstanceLockError,
  );
  assert(existsSync(lockPath));
});

Deno.test("InstanceLock.isPidAlive should detect current process, invalid PIDs, live child, and exited child", async () => {
  assertEquals(InstanceLock.isPidAlive(Deno.pid), true);
  assertEquals(InstanceLock.isPidAlive(0), false);
  assertEquals(InstanceLock.isPidAlive(-5), false);

  // Live child process -> isPidAlive returns true; after termination -> false
  const child = new Deno.Command(Deno.execPath(), {
    args: ["eval", "await new Promise((r) => setTimeout(r, 5000));"],
    stdout: "null",
    stderr: "null",
  }).spawn();
  const childPid = child.pid;
  try {
    assertEquals(InstanceLock.isPidAlive(childPid), true);
  } finally {
    try {
      child.kill();
    } catch {
      // already exited
    }
    await child.status;
  }

  assertEquals(InstanceLock.isPidAlive(childPid), false);
});
