import * as path from "@std/path";
import { existsSync } from "@std/fs";
import { assert, assertRejects } from "@std/assert";

import FileSystemPackage from "../../lib/package/file_system_package.ts";
import TestHelper from "../../lib/test/test_helper.ts";
import ActionFactory from "../action_factory.ts";
import Mkdir from "./mkdir.ts";

Deno.test("Mkdir should be registered in ActionFactory", () => {
  const action = new ActionFactory().get("mkdir", TestHelper.getConfig());
  assert(action instanceof Mkdir);
});

Deno.test("Mkdir should require exactly one directory argument", async () => {
  const action = new Mkdir(TestHelper.getConfig());

  await assertRejects(
    async () => await action.execute(undefined, []),
    "Action - mkdir - You should inform a single directory",
  );
  await assertRejects(
    async () => await action.execute(undefined, ["dir1", "dir2"]),
    "Action - mkdir - You should inform a single directory",
  );
});

Deno.test("Mkdir should create directories recursively, be idempotent, and resolve relative to pkg.baseDir", async () => {
  const config = TestHelper.getConfig();
  const baseDir = TestHelper.getNewTempDir();
  const pkg = new FileSystemPackage(config, "mkdir-pkg", baseDir, "mkdir-pkg.levain.yaml", "version: 1.0.0\n");
  const action = new Mkdir(config);

  // Relative to pkg.baseDir
  await action.execute(pkg, ["nested/sub/dir"]);
  const created = path.join(baseDir, "nested", "sub", "dir");
  assert(existsSync(created), "nested directory should be created");

  // Calling again is idempotent
  await action.execute(pkg, ["nested/sub/dir"]);
  assert(existsSync(created));

  // Absolute path with pkg=undefined and --compact
  const compactTarget = path.join(baseDir, "compacted");
  await action.execute(undefined, ["--compact", compactTarget]);
  assert(existsSync(compactTarget), "--compact should create directory on all platforms");
});

Deno.test("Mkdir should throw when target path already exists as a file", async () => {
  const tempFile = TestHelper.getNewTempFile();
  const action = new Mkdir(TestHelper.getConfig());

  await assertRejects(
    async () => await action.execute(undefined, [tempFile]),
    "already exists and it is not a directory",
  );
});
