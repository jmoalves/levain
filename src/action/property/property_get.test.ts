import { assert, assertEquals, assertRejects } from "@std/assert";
import * as path from "@std/path";

import TestHelper from "../../lib/test/test_helper.ts";
import ActionFactory from "../action_factory.ts";
import PropertyGetAction from "./property_get.ts";

Deno.test("PropertyGetAction should be obtainable with action factory", () => {
  const config = TestHelper.getConfig();
  const factory = new ActionFactory();
  const action = factory.get("propertyGet", config);

  assert(action instanceof PropertyGetAction);
});
Deno.test("PropertyGetAction should get value from .properties file", async () => {
  const config = TestHelper.getConfig();
  const action = new PropertyGetAction(config);

  await action.execute(TestHelper.mockPackage(), [
    "--setVar",
    "myVar",
    path.join("testdata", "properties", "person.properties"),
    "name",
  ]);

  const currentValue = config.getVar("myVar");
  assertEquals(currentValue, "John Doe");
});
Deno.test("PropertyGetAction should fall back to --default when property is missing", async () => {
  const config = TestHelper.getConfig();
  const action = new PropertyGetAction(config);

  await action.execute(TestHelper.mockPackage(), [
    "--setVar=missingWithDefault",
    "--default=fallback-value",
    path.join("testdata", "properties", "person.properties"),
    "unknown_key",
  ]);

  assertEquals(config.getVar("missingWithDefault"), "fallback-value");

  await action.execute(TestHelper.mockPackage(), [
    "--setVar=missingNoDefault",
    path.join("testdata", "properties", "person.properties"),
    "unknown_key",
  ]);

  assertEquals(config.getVar("missingNoDefault"), "");
});
Deno.test("PropertyGetAction should throw when required parameters are missing", async () => {
  const action = new PropertyGetAction(TestHelper.getConfig());

  await assertRejects(
    async () => await action.execute(TestHelper.mockPackage(), ["--setVar=myVar", "only-file.properties"]),
    Error,
    "Missing parameters",
  );
  await assertRejects(
    async () => await action.execute(TestHelper.mockPackage(), ["file.properties", "key"]),
    Error,
    "Missing parameters",
  );
});
