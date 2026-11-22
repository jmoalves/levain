import * as path from "@std/path";
import { assert, assertEquals, assertRejects } from "@std/assert";

import TestHelper from "../lib/test/test_helper.ts";
import ActionFactory from "./action_factory.ts";
import Inspect from "./inspect.ts";

Deno.test("Inspect should be registered in ActionFactory", () => {
  const action = new ActionFactory().get("inspect", TestHelper.getConfig());
  assert(action instanceof Inspect);
});

Deno.test("Inspect should validate required flags, counts, file argument, and regex syntax", async () => {
  const action = new Inspect(TestHelper.getConfig());

  await assertRejects(
    async () => await action.execute(undefined, ["--saveVar=V", "file.txt"]),
    "What do you need to search?",
  );
  await assertRejects(
    async () => await action.execute(undefined, ["--regExp=/abc/", "file.txt"]),
    "Where should we put the result?",
  );
  await assertRejects(
    async () => await action.execute(undefined, ["--regExp=/a/", "--regExp=/b/", "--saveVar=V1", "file.txt"]),
    "There is a mismatch between --regExp and --saveVar",
  );
  await assertRejects(
    async () => await action.execute(undefined, ["--regExp=/a/", "--saveVar=V1"]),
    "Inform the source file",
  );
  await assertRejects(
    async () => await action.execute(undefined, ["--regExp=plainText", "--saveVar=V1", "file.txt"]),
    "You must use regExps - plainText",
  );
});

Deno.test("Inspect should extract capture groups and full matches into config vars", async () => {
  const dir = TestHelper.getNewTempDir();
  const srcFile = path.join(dir, "metadata.txt");
  await Deno.writeTextFile(srcFile, "version=3.14.1\nSTATUS_READY\n");

  const config = TestHelper.getConfig();
  const action = new Inspect(config);

  await action.execute(undefined, [
    "--regExp=/version=([0-9.]+)/",
    "--saveVar=APP_VER",
    "--regExp=/status_ready/i",
    "--saveVar=APP_STATUS",
    srcFile,
  ]);

  assertEquals(config.getVar("APP_VER"), "3.14.1");
  assertEquals(config.getVar("APP_STATUS"), "STATUS_READY");
});

Deno.test("Inspect should throw when regex does not match file content", async () => {
  const dir = TestHelper.getNewTempDir();
  const srcFile = path.join(dir, "empty.txt");
  await Deno.writeTextFile(srcFile, "hello world");

  const action = new Inspect(TestHelper.getConfig());
  await assertRejects(
    async () => await action.execute(undefined, ["--regExp=/missing_token/", "--saveVar=OUT", srcFile]),
    Error,
    "/missing_token/ not found",
  );
});
