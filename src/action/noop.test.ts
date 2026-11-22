import { assert } from "@std/assert";

import TestHelper from "../lib/test/test_helper.ts";
import ActionFactory from "./action_factory.ts";
import Noop from "./noop.ts";

Deno.test("saveConfig should be registered as Noop in ActionFactory", () => {
  const action = new ActionFactory().get("saveConfig", TestHelper.getConfig());
  assert(action instanceof Noop);
});

Deno.test("Noop.execute should succeed without side effects", async () => {
  const action = new Noop(TestHelper.getConfig(), "saveConfig");
  await action.execute(undefined, []);
  await action.execute(TestHelper.mockPackage(), ["ignoredArg"]);
});
