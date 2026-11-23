import { assertEquals } from "@std/assert";

import TestHelper from "../test/test_helper.ts";
import StringUtils from "../utils/string_utils.ts";
import LogUtils from "./log_utils.ts";

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
