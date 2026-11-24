import * as path from "@std/path";
import { assertEquals, assertRejects } from "@std/assert";

import { UnTar } from "./untar_extractor.ts";
import TestHelper from "../test/test_helper.ts";
import OsUtils from "../os/os_utils.ts";

if (!OsUtils.isWindows()) {
  Deno.test("UnTar.extractImpl should reject non-Windows platforms", async () => {
    const extractor = new UnTar(TestHelper.getConfig());
    await assertRejects(
      async () => await extractor.extractImpl("archive.tar.gz", TestHelper.getNewTempDir()),
      Error,
      `${OsUtils.getOs()} not supported`,
    );
  });
}

if (OsUtils.isWindows()) {
  Deno.test("UnTar.extractImpl should extract a .tar.gz archive with spaces in source and destination paths", async () => {
    const baseDir = TestHelper.getNewTempDir();
    const srcContentDir = path.join(baseDir, "src content");
    const archiveDir = path.join(baseDir, "archive dir");
    const dstDir = path.join(baseDir, "extract dest");
    await Deno.mkdir(path.join(srcContentDir, "nested"), { recursive: true });
    await Deno.mkdir(archiveDir, { recursive: true });
    await Deno.mkdir(dstDir, { recursive: true });
    await Deno.writeTextFile(path.join(srcContentDir, "nested", "hello.txt"), "hello-untar");

    const tarGzPath = path.join(archiveDir, "my archive.tar.gz");
    const tarCmd = await new Deno.Command("tar", {
      args: ["-czf", tarGzPath, "-C", srcContentDir, "nested"],
    }).output();
    assertEquals(tarCmd.success, true, new TextDecoder().decode(tarCmd.stderr));

    const extractor = new UnTar(TestHelper.getConfig());
    await extractor.extractImpl(tarGzPath, dstDir);

    assertEquals(await Deno.readTextFile(path.join(dstDir, "nested", "hello.txt")), "hello-untar");
  });
}
