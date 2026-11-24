import * as path from "@std/path";
import { existsSync } from "@std/fs";
import { assert, assertThrows } from "@std/assert";
import { stub } from "@std/testing/mock";

import TestHelper from "../lib/test/test_helper.ts";
import { assertDirCount, assertPathDoesNotExist } from "../lib/test/more_asserts.ts";
import DateUtils from "../lib/utils/date_utils.ts";
import MathUtil from "../lib/utils/math_util.ts";

import CommandFactory from "./command_factory.ts";
import CleanCommand from "./clean.ts";

Deno.test("CleanCommand should be in command factory", () => {
  const commandFactory = new CommandFactory();
  const config = TestHelper.getConfig();

  const command = commandFactory.get("clean", config);

  assert(command instanceof CleanCommand, "should be an instance of CleanCommand");
});
Deno.test("CleanCommand should identify unknown option", () => {
  const config = TestHelper.getConfig();
  const command = new CleanCommand(config);

  assertThrows(
    () => {
      command.execute(["--this-param-does-not-exist"]);
    },
    Error,
    "ERROR: Unknown option --this-param-does-not-exist",
  );
});

Deno.test("CleanCommand with no args should clean backup and isolated temp while keeping recent cache", () => {
  verifyClean([], true, false, true);
});
Deno.test("CleanCommand --all should clean cache, backup, and isolated temp", () => {
  verifyClean(["--all"], true, true, true);
});
Deno.test("CleanCommand --cache should only clean cache", () => {
  verifyClean(["--cache"], false, true, false);
});
Deno.test("CleanCommand --backup should only clean backup", () => {
  verifyClean(["--backup"], true, false, false);
});
Deno.test("CleanCommand --cache --backup should clean cache and backup", () => {
  verifyClean(["--backup", "--cache"], true, true, false);
});
Deno.test("CleanCommand --deep with no explicit targets should default to backup, temp, and logs including today's backups", () => {
  const config = TestHelper.getConfig();
  const isolatedOsTempDir = TestHelper.getNewTempDir();
  const origEnvGet = Deno.env.get.bind(Deno.env);
  const envStub = stub(Deno.env, "get", (key: string) => {
    if (key === "TEMP" || key === "TMPDIR" || key === "TMP") {
      return isolatedOsTempDir;
    }
    return origEnvGet(key);
  });

  try {
    const backupDir = TestHelper.getNewTempDir();
    const todayBkp = path.join(backupDir, `bkp-${DateUtils.dateTag()}-120000`);
    Deno.mkdirSync(todayBkp, { recursive: true });
    Deno.writeTextFileSync(path.join(todayBkp, "a.txt"), "today");
    config.configPaths.levainBackupDir = backupDir;

    const staleTemp = path.join(isolatedOsTempDir, "levain-temp-1.tmp");
    Deno.writeTextFileSync(staleTemp, "tmp");

    const command = new CleanCommand(config);
    command.execute(["--deep"]);

    assertPathDoesNotExist(todayBkp);
    assertPathDoesNotExist(staleTemp);
    // Root OS temp dir must never be deleted even when emptied
    assert(existsSync(isolatedOsTempDir), "OS temp root directory must not be removed");
  } finally {
    envStub.restore();
  }
});
Deno.test("CleanCommand should succeed when cache, backup, and temp directories do not exist yet", () => {
  const config = TestHelper.getConfig();
  const missingRoot = path.join(TestHelper.getNewTempDir(), "not-created-yet");
  config.configPaths.levainCacheDir = path.join(missingRoot, "cache");
  config.configPaths.levainBackupDir = path.join(missingRoot, "backup");

  const isolatedOsTempDir = TestHelper.getNewTempDir();
  const origEnvGet = Deno.env.get.bind(Deno.env);
  const envStub = stub(Deno.env, "get", (key: string) => {
    if (key === "TEMP" || key === "TMPDIR" || key === "TMP") {
      return isolatedOsTempDir;
    }
    return origEnvGet(key);
  });

  try {
    new CleanCommand(config).execute([]);
    assert(existsSync(isolatedOsTempDir), "empty OS temp dir should remain intact");
  } finally {
    envStub.restore();
  }
});
Deno.test("CleanCommand --backup should preserve expired cache entries while default clean prunes them", () => {
  const config = TestHelper.getConfig();
  const cacheDir = TestHelper.getNewTempDir();
  const oldCachedFile = path.join(cacheDir, "old-installer.zip");
  Deno.writeTextFileSync(oldCachedFile, "old-binary");
  const fortyDaysAgo = new Date(Date.now() - 40 * 24 * 60 * 60 * 1000);
  Deno.utimeSync(oldCachedFile, fortyDaysAgo, fortyDaysAgo);
  config.configPaths.levainCacheDir = cacheDir;

  const backupDir = TestHelper.getNewTempDir();
  config.configPaths.levainBackupDir = backupDir;

  const isolatedOsTempDir = TestHelper.getNewTempDir();
  const origEnvGet = Deno.env.get.bind(Deno.env);
  const envStub = stub(Deno.env, "get", (key: string) => {
    if (key === "TEMP" || key === "TMPDIR" || key === "TMP") {
      return isolatedOsTempDir;
    }
    return origEnvGet(key);
  });

  try {
    new CleanCommand(config).execute(["--backup"]);
    assert(existsSync(oldCachedFile), "--backup must not prune cache files");

    new CleanCommand(config).execute([]);
    assertPathDoesNotExist(oldCachedFile);
  } finally {
    envStub.restore();
  }
});

function verifyClean(
  parameters: string[],
  shouldCleanBackupDir: boolean,
  shouldCleanCacheDir: boolean,
  shouldCleanOsTempDir: boolean,
) {
  const config = TestHelper.getConfig();
  const isolatedOsTempDir = TestHelper.getNewTempDir();
  // Keep an unrelated file in the mock OS temp dir so cleanOsTempDir does not remove the root dir itself
  const unrelatedTempFile = path.join(isolatedOsTempDir, "unrelated.txt");
  Deno.writeTextFileSync(unrelatedTempFile, "keep");
  const staleTempEntry = path.join(isolatedOsTempDir, "levain-temp-stale.tmp");
  Deno.writeTextFileSync(staleTempEntry, "stale");
  const oldLogFile = path.join(isolatedOsTempDir, "levain-20200101-000000.log");
  Deno.writeTextFileSync(oldLogFile, "old log");

  // Isolate GeneralPaths.tempDir so CleanCommand never deletes other parallel tests' /tmp/levain-test-* dirs
  const origEnvGet = Deno.env.get.bind(Deno.env);
  const envStub = stub(Deno.env, "get", (key: string) => {
    if (key === "TEMP" || key === "TMPDIR" || key === "TMP") {
      return isolatedOsTempDir;
    }
    return origEnvGet(key);
  });

  try {
    const backupDirCount = 1 + MathUtil.randomInt(9);
    const backupDir = TestHelper.getNewTempDir();
    TestHelper.addRandomFilesToDir(backupDir, backupDirCount);
    config.configPaths.levainBackupDir = backupDir;
    assertDirCount(backupDir, backupDirCount);

    const cacheDirCount = 1 + MathUtil.randomInt(9);
    const cacheDir = TestHelper.getNewTempDir();
    TestHelper.addRandomFilesToDir(cacheDir, cacheDirCount);
    config.configPaths.levainCacheDir = cacheDir;
    assertDirCount(cacheDir, cacheDirCount);

    const command = new CleanCommand(config);
    command.execute(parameters);

    if (shouldCleanBackupDir) {
      assertPathDoesNotExist(backupDir);
    } else {
      assertDirCount(backupDir, backupDirCount, "should keep backupDir");
    }

    if (shouldCleanCacheDir) {
      assertPathDoesNotExist(cacheDir);
    } else {
      assertDirCount(cacheDir, cacheDirCount, "should keep cacheDir");
    }

    if (shouldCleanOsTempDir) {
      assertPathDoesNotExist(staleTempEntry);
      assertPathDoesNotExist(oldLogFile);
    }
    assert(Deno.statSync(unrelatedTempFile).isFile, "should never delete unrelated OS temp files");
  } finally {
    envStub.restore();
  }
}
