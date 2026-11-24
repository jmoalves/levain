import * as path from "@std/path";
import { assert, assertEquals, assertRejects } from "@std/assert";

import JsonUtils from "../../lib/utils/json_utils.ts";
import TestHelper from "../../lib/test/test_helper.ts";
import ActionFactory from "../action_factory.ts";
import JsonRemove from "./json_remove.ts";

Deno.test("JsonRemove should be registered in ActionFactory", () => {
  const action = new ActionFactory().get("jsonRemove", TestHelper.getConfig());
  assert(action instanceof JsonRemove);
});

Deno.test("JsonRemove should reject unknown flags via parseArgs", async () => {
  const action = new JsonRemove(TestHelper.getConfig());
  const pkg = TestHelper.mockPackage();

  await assertRejects(
    async () => await action.execute(pkg, ["--unknownFlag"]),
    Error,
    "ERROR: Unknown option --unknownFlag",
  );
});

Deno.test("JsonRemove should require filename and property parameters", async () => {
  const action = new JsonRemove(TestHelper.getConfig());
  const pkg = TestHelper.mockPackage();

  await assertRejects(
    async () => await action.execute(pkg, ["only-filename.json"]),
    Error,
    "Missing parameters. jsonRemove filename property",
  );
});

Deno.test("JsonRemove should be a no-op when target file does not exist", async () => {
  const action = new JsonRemove(TestHelper.getConfig());
  const pkg = TestHelper.mockPackage();
  const missingFile = path.join(TestHelper.getNewTempDir(), "does-not-exist.json");

  await action.execute(pkg, [missingFile, "obsoleteKey"]);
});

Deno.test("JsonRemove should remove top-level, dash-prefixed, nested, and array properties from JSON file", async () => {
  const action = new JsonRemove(TestHelper.getConfig());
  const pkg = TestHelper.mockPackage();
  const file = path.join(TestHelper.getNewTempDir(), "config.json");
  JsonUtils.save(file, {
    obsoleteKey: "remove-me",
    "-dashKey": "remove-dash",
    keep: "yes",
    nested: { a: 1, b: 2, list: ["x", "y"] },
  });

  await action.execute(pkg, [file, "obsoleteKey"]);
  await action.execute(pkg, [file, "-dashKey"]);
  await action.execute(pkg, [file, "[nested][a]"]);
  await action.execute(pkg, [file, "[nested][list][0]"]);
  await action.execute(pkg, [file, "nonExistentKey"]);

  assertEquals(JsonUtils.load(file), {
    keep: "yes",
    nested: { b: 2, list: ["y"] },
  });
});
