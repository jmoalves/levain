import { assertEquals } from "@std/assert";
import { stub } from "@std/testing/mock";

import { assertFind } from "./src/lib/test/more_asserts.ts";
import CliUtil from "./src/lib/cli_util.ts";
import TestHelper from "./src/lib/test/test_helper.ts";
import ConsoleAndFileLogger from "./src/lib/logger/console_and_file_logger.ts";
import OsUtils from "./src/lib/os/os_utils.ts";
import RepositoryManager from "./src/lib/repository/repository_manager.ts";

import Levain from "./levain.ts";
import HomePaths from "./src/lib/paths/home_paths.ts";

Deno.test("should create a homeLog and a tempLog by default", async () => {
  let logger;
  try {
    const levain = new Levain();
    logger = await levain.runLevinWithLog();

    assertEquals(levain.error, false);
    const logFiles = logger?.logFiles || [];
    assertEquals(logFiles.length, 2);
    const expectedHomeLog = HomePaths.levainLog;
    assertFind(logFiles, (it) => it === expectedHomeLog, `couldn't find home ${expectedHomeLog} log in ${logFiles}`);
  } finally {
    await logger?.close();
  }
});

Deno.test("should add an extra log file", async () => {
  const prevTestMode = CliUtil.testMode;
  let logger;
  try {
    const extraLogFile = Deno.makeTempFileSync();
    const params = `--add-log ${extraLogFile}`;

    CliUtil.testMode = true;

    const levain = new Levain();
    logger = await levain.runLevinWithLog(params.split(" "));
    const logFiles = logger?.logFiles || [];
    assertEquals(logFiles.length, 3);
    assertFind(logFiles, (it) => it === extraLogFile, `didn\'t use extra log ${extraLogFile}`);
  } finally {
    CliUtil.testMode = prevTestMode;
    await logger?.close();
  }
});

Deno.test("should add an extra log dir", async () => {
  let logger;
  try {
    const extraLogDir = TestHelper.getNewTempDir();
    const params = `--add-log-dir ${extraLogDir}`;

    const levain = new Levain();
    logger = await levain.runLevinWithLog(params.split(" "));
    const logFiles = logger?.logFiles || [];
    assertEquals(logFiles.length, 3);
    assertFind(
      logFiles,
      (it) => it.includes(extraLogDir),
      `didn\'t use extra log dir ${extraLogDir}`,
    );
  } finally {
    await logger?.close();
  }
});

Deno.test("should mark error=true when an unknown command is executed", async () => {
  const prevTestMode = CliUtil.testMode;
  const prevConfig = ConsoleAndFileLogger.config;
  const randomStub = stub(Math, "random", () => 0);
  const sanitizeStub = stub(OsUtils, "sanitizeUserPath", () => Promise.resolve());
  const repoInitStub = stub(RepositoryManager.prototype, "init", () => Promise.resolve([]));
  const tempHome = TestHelper.getNewTempDir();
  let logger;

  try {
    CliUtil.testMode = true;
    const levain = new Levain();
    logger = await levain.runLevinWithLog([
      "--levainHome",
      tempHome,
      "--skip-levain-updates",
      "definitely-unknown-command-xyz",
    ]);
    assertEquals(levain.error, true);
  } finally {
    repoInitStub.restore();
    sanitizeStub.restore();
    randomStub.restore();
    ConsoleAndFileLogger.config = prevConfig;
    CliUtil.testMode = prevTestMode;
    await logger?.close();
  }
});
