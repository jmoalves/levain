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

Deno.test("Template should preserve $$, $&, $1 literally in replacements and support multi-flag regexes", async () => {
  const dir = TestHelper.getNewTempDir();
  const srcFile = path.join(dir, "in.txt");
  const dstFile = path.join(dir, "out.txt");
  await Deno.writeTextFile(srcFile, "pw=TOKEN token=TOKEN raw=LITERAL");

  const config = TestHelper.getConfig();
  const action = new Template(config);
  const specialPw = "a$$b$&c$1d$`e$'f^&";

  await action.execute(undefined, [
    "--replace=/token/gi",
    `--with=${specialPw}`,
    "--replace=LITERAL",
    `--with=${specialPw}`,
    srcFile,
    dstFile,
  ]);

  const rendered = Deno.readTextFileSync(dstFile);
  assert(
    rendered === `pw=${specialPw} ${specialPw}=${specialPw} raw=${specialPw}`,
    `unexpected rendered output: ${rendered}`,
  );
});
