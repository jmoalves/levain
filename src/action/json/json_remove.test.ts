import { assert, assertRejects } from "@std/assert";

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

Deno.test("JsonRemove currently throws not implemented yet", async () => {
  const action = new JsonRemove(TestHelper.getConfig());
  const pkg = TestHelper.mockPackage();

  // TODO(phase-4.5): Implement jsonRemove to delete the specified JSON property.
  await assertRejects(
    async () => await action.execute(pkg, ["config.json", "obsoleteKey"]),
    "not implemented yet",
  );
});
