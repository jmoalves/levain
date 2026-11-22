import { assert, assertEquals, assertRejects } from "@std/assert";

import TestHelper from "../lib/test/test_helper.ts";
import ActionFactory from "./action_factory.ts";
import DefaultPackage from "./defaultPackage.ts";

Deno.test("DefaultPackage should be registered in ActionFactory", () => {
  const action = new ActionFactory().get("defaultPackage", TestHelper.getConfig());
  assert(action instanceof DefaultPackage);
});

Deno.test("DefaultPackage should require exactly one package argument", async () => {
  const action = new DefaultPackage(TestHelper.getConfig());

  await assertRejects(
    async () => await action.execute(undefined, []),
    "You must inform one package",
  );
  await assertRejects(
    async () => await action.execute(undefined, ["pkgA", "pkgB"]),
    "You must inform one package",
  );
});

Deno.test("DefaultPackage should set config.defaultPackage", async () => {
  const config = TestHelper.getConfig();
  const action = new DefaultPackage(config);

  await action.execute(undefined, ["custom-default"]);
  assertEquals(config.defaultPackage, "custom-default");
});
