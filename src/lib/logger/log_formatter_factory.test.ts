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

Deno.test("should add datetime and level, and hide password", () => {
  const config = new Config([]);
  config.password = "123456";
  const formatter = LogFormatterFactory.getFormatterWithDatetimeAndLevel(config);
  const logRecord = TestHelper.logRecord(`My password is ${config.password}.`);

  const logLine = formatter(logRecord);

  assertMatch(logLine, /\d{8}-\d{6} INFO My password is \*\*\*\*\*\*./);
});
