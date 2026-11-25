import { assertEquals, assertFalse, assertStringIncludes } from "@std/assert";
import * as log from "@std/log";
import * as path from "@std/path";

import Config from "../config.ts";
import ConsoleFeedback from "../utils/console_feedback.ts";
import TestHelper from "../test/test_helper.ts";
import { AutoFlushLogFileHandler } from "./auto_flush_log_file_handler.ts";
import ConsoleAndFileLogger from "./console_and_file_logger.ts";
import LogUtils from "./log_utils.ts";

Deno.test("should setup logger with logFiles and console", async () => {
  let logger;
  try {
    const logFiles = [
      Deno.makeTempFileSync(),
      Deno.makeTempFileSync(),
    ];

    logger = await ConsoleAndFileLogger.setup(logFiles);

    assertEquals(logger?.logFiles, logFiles);
    assertEquals(Object.keys(logger?.handlers).length, 3);
  } finally {
    await logger?.close();
  }
});
Deno.test("should warn and continue when log file cannot be created", async () => {
  let logger;
  try {
    const logFiles = [
      `/path-that-does-not-exist/log-today.log`,
    ];

    logger = await ConsoleAndFileLogger.setup(logFiles);

    assertEquals(logger?.logFiles, []);
    assertEquals(Object.keys(logger?.handlers).length, 1);
  } finally {
    await logger?.close();
  }
});

Deno.test("should mask passwords in file logs and ConsoleFeedback even when config is assigned after setup", async () => {
  const prevConfig = ConsoleAndFileLogger.config;
  const prevOut = ConsoleFeedback.OUT;
  const prevSanitize = ConsoleFeedback.sanitize;
  const logFile = Deno.makeTempFileSync();
  let logger;

  try {
    ConsoleAndFileLogger.config = undefined;
    logger = await ConsoleAndFileLogger.setup([logFile], true);

    const writtenChunks: string[] = [];
    const decoder = new TextDecoder();
    ConsoleFeedback.OUT = {
      isTerminal: () => false,
      writeSync: (p: Uint8Array) => {
        writtenChunks.push(decoder.decode(p));
        return p.length;
      },
    } as typeof Deno.stdout;

    const feedback = new ConsoleFeedback();
    // Exercise sanitize before config is assigned (null fallback)
    feedback.start("Before config");

    const cfg = new Config([]);
    cfg.password = "TopSecret#42";
    ConsoleAndFileLogger.config = cfg;

    log.info(`Connecting with TopSecret#42 and TopSecret#42`);
    log.warn(`Warn with TopSecret#42`);
    LogUtils.flushLogFiles();

    // Exercise console handler formatter directly for both omitLog=true and omitLog=false
    const omittedConsoleLine = logger.handlers["console"].format(TestHelper.logRecord("console TopSecret#42"));
    assertFalse(omittedConsoleLine.includes("TopSecret#42"));
    assertStringIncludes(omittedConsoleLine, "console ******");
    const regularConsoleHandler = logger.getConsoleHandler(false);
    const regularConsoleLine = regularConsoleHandler.format(TestHelper.logRecord("console TopSecret#42"));
    assertFalse(regularConsoleLine.includes("TopSecret#42"));
    assertStringIncludes(regularConsoleLine, "console ******");

    feedback.start("Start TopSecret#42");
    feedback.reset("Done TopSecret#42");

    const fileContent = Deno.readTextFileSync(logFile);
    assertFalse(fileContent.includes("TopSecret#42"));
    assertStringIncludes(fileContent, "Connecting with ****** and ******");

    const feedbackOutput = writtenChunks.join("");
    assertFalse(feedbackOutput.includes("TopSecret#42"));
    assertStringIncludes(feedbackOutput, "Before config");
    assertStringIncludes(feedbackOutput, "Start ******");
    assertStringIncludes(feedbackOutput, "Done ******");
  } finally {
    ConsoleAndFileLogger.config = prevConfig;
    ConsoleFeedback.OUT = prevOut;
    ConsoleFeedback.sanitize = prevSanitize;
    await logger?.close();
    try {
      Deno.removeSync(logFile);
    } catch {
      // ignore temp cleanup error
    }
  }
});

Deno.test("ConsoleFeedback.show should throttle terminal writes and suppress interleaved spinners during concurrent operations", () => {
  const prevOut = ConsoleFeedback.OUT;
  const written: string[] = [];
  const decoder = new TextDecoder();

  try {
    ConsoleFeedback.OUT = {
      isTerminal: () => true,
      writeSync: (p: Uint8Array) => {
        written.push(decoder.decode(p));
        return p.length;
      },
    } as typeof Deno.stdout;

    const feedback = new ConsoleFeedback();
    for (let i = 0; i < 20; i++) {
      feedback.show();
    }
    assertEquals(written.length, 1);

    // Concurrent feedback instances suppress interleaved spinners and omit leading \r on reset
    written.length = 0;
    const fb1 = new ConsoleFeedback();
    const fb2 = new ConsoleFeedback();
    fb1.start("Scan A");
    fb2.start("Scan B");
    fb1.show();
    fb2.show();
    fb2.reset("Done B");
    fb1.reset("Done A");
    const output = written.join("");
    assertStringIncludes(output, "Done B\r\n");
    assertStringIncludes(output, "Done A\r\n");
    assertFalse(output.includes("\rDone B"));
  } finally {
    ConsoleFeedback.OUT = prevOut;
  }
});

Deno.test("AutoFlushLogFileHandler should degrade gracefully when log file cannot be opened", () => {
  // Missing parent dir fails deterministically in setup() on all OSes; handler must disable cleanly instead of crashing
  const missingParentLog = path.join(TestHelper.getNewTempDir(), "nonexistent-parent", "cannot-open.log");
  const handler = new AutoFlushLogFileHandler("DEBUG", { filename: missingParentLog, mode: "w" });
  handler.setup();
  handler.log("ignored");
  handler.handle(TestHelper.logRecord("ignored"));
  handler.flush();
  handler.destroy();
});

Deno.test("should setup logger in errors-only console mode to keep stdout clean while formatting errors with password masking", async () => {
  const prevConfig = ConsoleAndFileLogger.config;
  const prevOut = ConsoleFeedback.OUT;
  const logFile = Deno.makeTempFileSync();
  let logger;

  try {
    const cfg = new Config([]);
    cfg.password = "HiddenPass#7";
    ConsoleAndFileLogger.config = cfg;

    logger = await ConsoleAndFileLogger.setup([logFile], "errors-only");
    const consoleHandler = logger.handlers["console"];
    assertEquals(consoleHandler.levelName, "ERROR");

    const formatted = consoleHandler.format(TestHelper.logRecord("failed with HiddenPass#7"));
    assertFalse(formatted.includes("HiddenPass#7"));
    assertStringIncludes(formatted, "failed with ******");

    // Info still goes to the file log without polluting stdout
    log.info("info-for-file-only");
    LogUtils.flushLogFiles();
    assertStringIncludes(Deno.readTextFileSync(logFile), "info-for-file-only");
  } finally {
    ConsoleAndFileLogger.config = prevConfig;
    ConsoleFeedback.OUT = prevOut;
    await logger?.close();
    try {
      Deno.removeSync(logFile);
    } catch {
      // ignore temp cleanup error
    }
  }
});
