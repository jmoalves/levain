import * as path from "@std/path";
import { assert, assertThrows } from "@std/assert";
import { stub } from "@std/testing/mock";

import TestHelper from "../lib/test/test_helper.ts";
import { assertDirCount, assertPathDoesNotExist } from "../lib/test/more_asserts.ts";
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
