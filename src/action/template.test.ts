import { assert, assertFalse, assertStringIncludes } from "@std/assert";
import * as path from "@std/path";

import TestHelper from "../lib/test/test_helper.ts";

import ActionFactory from "./action_factory.ts";
import Template from "./template.ts";

Deno.test("Template should replace vars without logging secrets or rendered content", async () => {
  const logger = await TestHelper.setupTestLogger();
  const config = TestHelper.getConfig();
  const factory = new ActionFactory();
  const action = factory.get("template", config);

  assert(action instanceof Template);

  const outDir = TestHelper.getNewTempDir();
  const dstFile = path.join(outDir, "result.txt");
  const secretValue = "MySecret\\Value/123";

  await action.execute(TestHelper.mockPackage(), [
    "--doubleBackslash",
    "--replace=/@@USERNAME@@/g",
    `--with=${secretValue}`,
    "--replace=/@@CREDENTIALS@@/g",
    "--with=Password:\ndasjdhakjdhaskjdhakjh\nshdkjahsdkjsahdkaj\nasjhdkasjhdaksjh",
    "--replace=/Password:.*/g",
    "--with=",
    "../testdata/template/source.txt",
    dstFile,
  ]);

  const rendered = Deno.readTextFileSync(dstFile);
  assertStringIncludes(rendered, "MySecret\\\\Value\\\\123");
  assertFalse(rendered.includes("@@USERNAME@@"));

  const allLogs = logger.messages.join("\n");
  assert(logger.messages.length > 0);
  assertFalse(allLogs.includes(secretValue));
  assertFalse(allLogs.includes("MySecret\\\\Value\\\\123"));
  assertFalse(allLogs.includes("END OF FILE"));
});
