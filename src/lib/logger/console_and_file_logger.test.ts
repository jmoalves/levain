import { assertEquals, assertFalse, assertStringIncludes } from "@std/assert";
import * as log from "@std/log";

import Config from "../config.ts";
import ConsoleFeedback from "../utils/console_feedback.ts";
import ConsoleAndFileLogger from "./console_and_file_logger.ts";

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

    const cfg = new Config([]);
    cfg.password = "TopSecret#42";
    ConsoleAndFileLogger.config = cfg;

    log.info(`Connecting with TopSecret#42 and TopSecret#42`);
    logger.flush();

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
    feedback.start("Start TopSecret#42");
    feedback.reset("Done TopSecret#42");

    const fileContent = Deno.readTextFileSync(logFile);
    assertFalse(fileContent.includes("TopSecret#42"));
    assertStringIncludes(fileContent, "Connecting with ****** and ******");

    const feedbackOutput = writtenChunks.join("");
    assertFalse(feedbackOutput.includes("TopSecret#42"));
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
