import { assertEquals, assertMatch } from "@std/assert";

import Config from "../config.ts";
import TestHelper from "../test/test_helper.ts";
import LogFormatterFactory from "./log_formatter_factory.ts";

Deno.test("should hide passwords", () => {
  const config = new Config([]);
  config.password = "123456";
  const formatter = LogFormatterFactory.getHidePasswordFormatter(config);
  const logRecord = TestHelper.logRecord(`My password is ${config.password}.`);

  const logLine = formatter(logRecord);

  assertEquals(logLine, "My password is ******.");
});

Deno.test("should hide all occurrences of password in the same log line", () => {
  const config = new Config([]);
  config.password = "s3cr3t";
  const formatter = LogFormatterFactory.getHidePasswordFormatter(config);
  const logRecord = TestHelper.logRecord(`cmd=["--pass","${config.password}"], args=["--pass","${config.password}"]`);

  const logLine = formatter(logRecord);

  assertEquals(logLine, `cmd=["--pass","******"], args=["--pass","******"]`);
});

Deno.test("should add datetime and level, and hide password", () => {
  const config = new Config([]);
  config.password = "123456";
  const formatter = LogFormatterFactory.getFormatterWithDatetimeAndLevel(config);
  const logRecord = TestHelper.logRecord(`My password is ${config.password}.`);

  const logLine = formatter(logRecord);

  assertMatch(logLine, /\d{8}-\d{6} INFO My password is \*\*\*\*\*\*./);
});

Deno.test("should hide password when config provider is populated after formatter creation", () => {
  let lateConfig: Config | undefined = undefined;
  const consoleFormatter = LogFormatterFactory.getHidePasswordFormatter(() => lateConfig);
  const fileFormatter = LogFormatterFactory.getFormatterWithDatetimeAndLevel(() => lateConfig);

  assertEquals(consoleFormatter(TestHelper.logRecord("before config")), "before config");

  lateConfig = new Config([]);
  lateConfig.password = "late-s3cr3t";

  assertEquals(
    consoleFormatter(TestHelper.logRecord("token=late-s3cr3t again=late-s3cr3t")),
    "token=****** again=******",
  );
  assertMatch(
    fileFormatter(TestHelper.logRecord("token=late-s3cr3t")),
    /\d{8}-\d{6} INFO token=\*\*\*\*\*\*/,
  );
});
