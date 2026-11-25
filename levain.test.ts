import { assertEquals } from "@std/assert";
import { stub } from "@std/testing/mock";

import { assertFind } from "./src/lib/test/more_asserts.ts";
import CliUtil from "./src/lib/cli_util.ts";
import TestHelper from "./src/lib/test/test_helper.ts";
import ConsoleAndFileLogger from "./src/lib/logger/console_and_file_logger.ts";
import OsUtils from "./src/lib/os/os_utils.ts";
import RepositoryManager from "./src/lib/repository/repository_manager.ts";

import Levain from "./levain.ts";
import LevainCli from "./src/levain_cli.ts";

Deno.test("should create a unique temp log by default (no shared home log)", async () => {
  let logger;
  try {
    const levain = new Levain();
    logger = await levain.runLevinWithLog();

    assertEquals(levain.error, false);
    const logFiles = logger?.logFiles || [];
    assertEquals(logFiles.length, 1);
    assertFind(logFiles, (it) => /levain-.*\.log$/.test(it), `expected unique temp log in ${logFiles}`);
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
    assertEquals(logFiles.length, 2);
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
    assertEquals(logFiles.length, 2);
    assertFind(
      logFiles,
      (it) => it.includes(extraLogDir),
      `didn\'t use extra log dir ${extraLogDir}`,
    );
  } finally {
    await logger?.close();
  }
});

Deno.test("should report CLI validation error cleanly without creating logs or initializing repos", async () => {
  const prevTestMode = CliUtil.testMode;
  const prevConfig = ConsoleAndFileLogger.config;
  const sanitizeStub = stub(OsUtils, "sanitizeUserPath", () => Promise.resolve());
  const repoInitStub = stub(RepositoryManager.prototype, "init", () => Promise.resolve([]));
  const errorLines: string[] = [];
  const errStub = stub(console, "error", (...args: unknown[]) => {
    errorLines.push(args.map(String).join(" "));
  });
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
    assertEquals(logger, undefined, "CLI validation errors must not overwrite ~/levain.log");
    assertEquals(repoInitStub.calls.length, 0, "unknown commands must fail before initializing repositories");
    assertEquals(errorLines.length, 2);
  } finally {
    errStub.restore();
    repoInitStub.restore();
    sanitizeStub.restore();
    ConsoleAndFileLogger.config = prevConfig;
    CliUtil.testMode = prevTestMode;
    await logger?.close();
  }
});

Deno.test("should handle --version immediately without creating logs or initializing repos", async () => {
  const repoInitStub = stub(RepositoryManager.prototype, "init", () => Promise.resolve([]));
  const logStub = stub(console, "log", () => {});

  try {
    const levain = new Levain();
    const logger = await levain.runLevinWithLog(["--version"]);
    assertEquals(levain.error, false);
    assertEquals(logger, undefined);
    assertEquals(repoInitStub.calls.length, 0);
  } finally {
    logStub.restore();
    repoInitStub.restore();
  }
});

Deno.test("should NOT prompt Hit ENTER on runtime errors unless --wait-after-end is explicitly passed", async () => {
  const prevTestMode = CliUtil.testMode;
  const origPrompt = globalThis.prompt;
  const execStub = stub(LevainCli.prototype, "execute", () => Promise.reject(new Error("boom")));
  let promptCalls = 0;
  let logger;

  try {
    CliUtil.testMode = false;
    globalThis.prompt = () => {
      promptCalls++;
      return "";
    };

    const levain = new Levain();
    logger = await levain.runLevinWithLog(["actions"]);
    assertEquals(levain.error, true);
    assertEquals(promptCalls, 0);
  } finally {
    execStub.restore();
    globalThis.prompt = origPrompt;
    CliUtil.testMode = prevTestMode;
    await logger?.close();
  }
});
