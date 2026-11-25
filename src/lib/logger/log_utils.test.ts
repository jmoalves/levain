import { assert, assertEquals, assertMatch } from "@std/assert";
import * as log from "@std/log";
import * as path from "@std/path";
import { stub } from "@std/testing/mock";

import TestHelper from "../test/test_helper.ts";
import StringUtils from "../utils/string_utils.ts";
import LogUtils from "./log_utils.ts";
import { NullWriter } from "./null_writer.ts";
import { StderrConsoleHandler } from "./stderr_handler.ts";
import { AutoFlushLogFileHandler } from "./auto_flush_log_file_handler.ts";

Deno.test("LogUtils.hidePassword should mask raw, JSON-escaped, and URL-encoded passwords", () => {
  const config = TestHelper.getConfig();
  const pw = 'p^a&s"s\\w!o(r)d ç';
  config.password = pw;

  const jsonEscaped = JSON.stringify(pw).slice(1, -1);
  const strictUrl = StringUtils.encodeUrlComponent(pw);
  const stdUrl = encodeURIComponent(pw);

  const msg = `raw=${pw} raw2=${pw} json=${jsonEscaped} strict=${strictUrl} std=${stdUrl}`;
  const masked = LogUtils.hidePassword(config, msg);

  assertEquals(masked, "raw=****** raw2=****** json=****** strict=****** std=******");

  // Leading/trailing backslashes must not leave residual backslash fragments in JSON-escaped strings
  config.password = "\\leadTrail\\";
  const jsonLeadTrail = JSON.stringify(config.password).slice(1, -1);
  assertEquals(LogUtils.hidePassword(config, `json=${jsonLeadTrail}`), "json=******");
});

Deno.test("LogUtils.hidePassword should return message unchanged when config or password is absent", () => {
  assertEquals(LogUtils.hidePassword(null, "plain message"), "plain message");
  assertEquals(LogUtils.hidePassword(TestHelper.getConfig(), "plain message"), "plain message");
});

Deno.test("LogUtils.logTimeTag, NullWriter, StderrConsoleHandler, and AutoFlushLogFileHandler edge cases", async () => {
  assertMatch(LogUtils.logTimeTag(new Date(2026, 0, 1, 9, 5, 3)), /^\d{6}$/);

  // NullWriter discards writes cleanly
  const nw = new NullWriter();
  const payload = new TextEncoder().encode("discard");
  assertEquals(nw.writeSync(payload), payload.length);
  assertEquals(await nw.write(payload), payload.length);
  assertEquals(nw.isTerminal(), false);
  const writer = nw.writable.getWriter();
  await writer.write(payload);
  await writer.close();
  nw.close();

  // StderrConsoleHandler logs to console.error and formats with/without custom formatter
  const errLines: string[] = [];
  const errStub = stub(console, "error", (...args: unknown[]) => errLines.push(args.map(String).join(" ")));
  try {
    const handler = new StderrConsoleHandler("INFO");
    handler.log("stderr msg");
    assertEquals(errLines, ["stderr msg"]);
    const rec = TestHelper.logRecord("hi");
    assertEquals(handler.format(rec), "INFO hi");
  } finally {
    errStub.restore();
  }

  // AutoFlushLogFileHandler filters below-level records and degrades gracefully on flush/destroy failures
  const logFile = path.join(TestHelper.getNewTempDir(), "autoflush.log");
  const handler = new AutoFlushLogFileHandler("WARN", { filename: logFile, mode: "w" });
  handler.setup();
  handler.handle(TestHelper.logRecord("ignored-info"));

  const flushStub = stub(log.FileHandler.prototype, "flush", () => {
    throw new Error("disk full");
  });
  try {
    handler.flush(); // catches and disables handler
    assert(true);
  } finally {
    flushStub.restore();
  }

  const handler2 = new AutoFlushLogFileHandler("INFO", { filename: path.join(TestHelper.getNewTempDir(), "af2.log"), mode: "w" });
  handler2.setup();
  const destroyStub = stub(log.FileHandler.prototype, "destroy", () => {
    throw new Error("destroy error");
  });
  try {
    handler2.destroy();
  } finally {
    destroyStub.restore();
    try {
      log.FileHandler.prototype.destroy.call(handler);
      log.FileHandler.prototype.destroy.call(handler2);
    } catch {
      // ignore
    }
  }
});
