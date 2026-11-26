import * as path from "@std/path";
import { assertEquals, assertRejects } from "@std/assert";

import FileSystemPackage from "../../lib/package/file_system_package.ts";
import TestHelper from "../../lib/test/test_helper.ts";
import { MockPackage } from "../../lib/package/mock_package.ts";

import RemoveFromRegistry from "./remove_from_registry.ts";

Deno.test("RemoveFromRegistry should remove package from registry", async () => {
  const registry = await TestHelper.getNewInitedTempRegistry();
  const pkg = TestHelper.getTestFilePackage();
  await registry.add(pkg);
  assertEquals(registry.size(), 1);
  const action = new RemoveFromRegistry(registry);

  await action.execute(new MockPackage(), [pkg.name]);

  assertEquals(registry.size(), 0);
});
Deno.test("RemoveFromRegistry should throw when no package was passed as parameter", async () => {
  await assertRejects(
    async () => {
      const registry = await TestHelper.getNewInitedTempRegistry();
      const action = new RemoveFromRegistry(registry);

      await action.execute(new MockPackage(), []);
    },
    Error,
    "Action - removeFromRegistry - You should inform at least one package to be removed",
  );
});
Deno.test("RemoveFromRegistry should remove multiple packages", async () => {
  const registry = await TestHelper.getNewInitedTempRegistry();
  const tempRepo = TestHelper.getNewTempDir();
  const fileA = path.join(tempRepo, "pkgA.levain.yaml");
  const fileB = path.join(tempRepo, "pkgB.levain.yaml");
  await Deno.writeTextFile(fileA, "version: 1.0.0\n");
  await Deno.writeTextFile(fileB, "version: 1.0.0\n");

  const config = TestHelper.getConfig();
  const pkgA = new FileSystemPackage(config, "pkgA", tempRepo, "pkgA.levain.yaml", "version: 1.0.0\n");
  const pkgB = new FileSystemPackage(config, "pkgB", tempRepo, "pkgB.levain.yaml", "version: 1.0.0\n");
  await registry.add(pkgA);
  await registry.add(pkgB);
  assertEquals(registry.size(), 2);

  const action = new RemoveFromRegistry(registry);
  await action.execute(new MockPackage(), ["pkgA", "package not found", "pkgB"]);

  assertEquals(registry.size(), 0);
});

Deno.test("RemoveFromRegistry should reject removing reserved 'levain' package (case-insensitive) atomically", async () => {
  const registry = await TestHelper.getNewInitedTempRegistry();
  const pkg = TestHelper.getTestFilePackage();
  await registry.add(pkg);
  assertEquals(registry.size(), 1);

  const action = new RemoveFromRegistry(registry);
  await assertRejects(() => action.execute(new MockPackage(), ["levain"]), Error);
  await assertRejects(() => action.execute(new MockPackage(), [pkg.name, "LeVaIn"]), Error);

  // Atomicity: pkg must still be in registry after rejected multi-package call
  assertEquals(registry.size(), 1);
});
