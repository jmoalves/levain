import * as path from "@std/path";
import { assert, assertEquals, assertRejects } from "@std/assert";

import TestHelper from "../lib/test/test_helper.ts";
import ActionFactory from "./action_factory.ts";
import BackupFile from "./backup_file.ts";

Deno.test("BackupFile should be registered in ActionFactory", () => {
  const action = new ActionFactory().get("backupFile", TestHelper.getConfig());
  assert(action instanceof BackupFile);
});

Deno.test("BackupFile should require exactly one file parameter", async () => {
  const action = new BackupFile(TestHelper.getConfig());

  await assertRejects(
    async () => await action.execute(undefined, []),
    "You must inform the file to backup",
  );
  await assertRejects(
    async () => await action.execute(undefined, ["a.txt", "b.txt"]),
    "You must inform the file to backup",
  );
});

Deno.test("BackupFile should create a backup copy next to the target file", async () => {
  const dir = TestHelper.getNewTempDir();
  const target = path.join(dir, "config.ini");
  await Deno.writeTextFile(target, "key=value\n");

  const action = new BackupFile(TestHelper.getConfig());
  await action.execute(undefined, [target]);

  const entries = [...Deno.readDirSync(dir)].map((e) => e.name).sort();
  assertEquals(entries.length, 2, "directory should contain original file plus one backup");
  const backupName = entries.find((name) => name !== "config.ini");
  assert(backupName, "backup file should exist");
  assertEquals(await Deno.readTextFile(path.join(dir, backupName)), "key=value\n");
});
