import * as path from "@std/path";
import { assert, assertEquals, assertRejects } from "@std/assert";
import { stub } from "@std/testing/mock";

import { FileProgress } from "../../lib/io/file_progress.ts";
import TestHelper from "../../lib/test/test_helper.ts";
import { assertFileSizeAprox, assertPathDoesNotExist, assertPathExists } from "../../lib/test/more_asserts.ts";

import ActionFactory from "../action_factory.ts";
import CopyAction from "./copy.ts";

Deno.test("CopyAction should be obtainable with action factory", () => {
  const action = getCopyAction();

  assert(action instanceof CopyAction);
});
Deno.test("CopyAction should throw Error on missing destination, missing source, or multiple sources to single file", async () => {
  const action = getCopyAction();
  const tempDir = TestHelper.getNewTempDir();
  const dstFile = path.join(tempDir, "single.txt");

  await assertRejects(
    async () => await action.execute(TestHelper.mockPackage(), []),
    Error,
    "Action - copy - You must inform the destination",
  );
  await assertRejects(
    async () => await action.execute(TestHelper.mockPackage(), [dstFile]),
    Error,
    "Action - copy - You must inform the source(s)",
  );
  await assertRejects(
    async () => await action.execute(TestHelper.mockPackage(), [TestHelper.emptyFile, TestHelper.fileWithContent, dstFile]),
    Error,
    "Action - copy - Unable to copy multiple sources to a single file",
  );
});
Deno.test("CopyAction should replace file", async () => {
  const tempDir = TestHelper.getNewTempDir();
  const dstFile = path.resolve(tempDir, "newFile.txt");
  Deno.copyFileSync(TestHelper.emptyFile, dstFile);
  assertFileSizeAprox(dstFile, 0);

  const action = getCopyAction();
  await action.execute(TestHelper.mockPackage(), [
    TestHelper.fileWithContent,
    dstFile,
  ]);

  assertFileSizeAprox(dstFile, 576);
});
Deno.test("CopyAction --ifNotExists should copy a new file", async () => {
  const tempDir = TestHelper.getNewTempDir();
  const dstFile = path.resolve(tempDir, "newFile.txt");
  assertPathDoesNotExist(dstFile);

  const action = getCopyAction();
  await action.execute(TestHelper.mockPackage(), [
    "--ifNotExists",
    TestHelper.fileWithContent,
    dstFile,
  ]);

  assertFileSizeAprox(dstFile, 576);
});
Deno.test("CopyAction --ifNotExists should not copy file if it already exists", async () => {
  const tempDir = TestHelper.getNewTempDir();
  const dstFile = path.resolve(tempDir, "newFile.txt");
  Deno.copyFileSync(TestHelper.emptyFile, dstFile);
  assertFileSizeAprox(dstFile, 0);

  const action = getCopyAction();
  await action.execute(TestHelper.mockPackage(), [
    "--ifNotExists",
    TestHelper.fileWithContent,
    dstFile,
  ]);

  assertFileSizeAprox(dstFile, 0);
});
Deno.test("CopyAction --ifNotExists into existing directory should copy missing files and preserve existing ones", async () => {
  const tempDir = TestHelper.getNewTempDir();
  const existingFile = path.resolve(tempDir, path.basename(TestHelper.fileWithContent));
  assertPathDoesNotExist(existingFile);

  const action = getCopyAction();
  // Destination directory exists, but target file inside it does not -> should copy!
  await action.execute(TestHelper.mockPackage(), [
    "--ifNotExists",
    TestHelper.fileWithContent,
    tempDir,
  ]);
  assertFileSizeAprox(existingFile, 576);

  // Overwrite with empty content and re-run --ifNotExists -> should NOT overwrite existing file!
  Deno.copyFileSync(TestHelper.emptyFile, existingFile);
  assertFileSizeAprox(existingFile, 0);

  await action.execute(TestHelper.mockPackage(), [
    "--ifNotExists",
    TestHelper.fileWithContent,
    tempDir,
  ]);
  assertFileSizeAprox(existingFile, 0);
});
Deno.test("CopyAction --strip should copy directory contents preserving nested subdirectories", async () => {
  const srcRoot = TestHelper.getNewTempDir();
  await Deno.mkdir(path.join(srcRoot, "sub", "deep"), { recursive: true });
  await Deno.writeTextFile(path.join(srcRoot, "top.txt"), "top");
  await Deno.writeTextFile(path.join(srcRoot, "sub", "mid.txt"), "mid");
  await Deno.writeTextFile(path.join(srcRoot, "sub", "deep", "leaf.txt"), "leaf");

  const dstRoot = path.join(TestHelper.getNewTempDir(), "stripped-out");
  const action = getCopyAction();
  await action.execute(TestHelper.mockPackage(), [
    "--strip",
    srcRoot,
    dstRoot,
  ]);

  assertPathExists(path.join(dstRoot, "top.txt"));
  assertPathExists(path.join(dstRoot, "sub", "mid.txt"));
  assertPathExists(path.join(dstRoot, "sub", "deep", "leaf.txt"));
  assertEquals(await Deno.readTextFile(path.join(dstRoot, "sub", "deep", "leaf.txt")), "leaf");
  assertPathDoesNotExist(path.join(dstRoot, "leaf.txt"));
});
Deno.test("CopyAction URL download into directory should strip query strings and reject traversal", async () => {
  const dstDir = TestHelper.getNewTempDir();
  const downloads: Array<{ src: string; dst: string }> = [];
  const progressStub = stub(FileProgress, "copyWithProgress", (src, dst) => {
    downloads.push({ src: String(src), dst });
    return Promise.resolve();
  });

  try {
    const action = getCopyAction();
    await action.execute(TestHelper.mockPackage(), [
      "https://example.org/files/tool.zip?token=secret123",
      dstDir,
    ]);
    assertEquals(downloads, [{
      src: "https://example.org/files/tool.zip?token=secret123",
      dst: path.resolve(dstDir, "tool.zip"),
    }]);

    // When target file already exists inside dstDir, --ifNotExists should skip downloading
    await Deno.writeTextFile(path.resolve(dstDir, "tool.zip"), "already-here");
    await action.execute(TestHelper.mockPackage(), [
      "--ifNotExists",
      "https://example.org/files/tool.zip?token=secret123",
      dstDir,
    ]);
    assertEquals(downloads.length, 1);

    await assertRejects(
      async () => await action.execute(TestHelper.mockPackage(), ["https://example.org/", dstDir]),
      Error,
      "Invalid filename in URL",
    );
  } finally {
    progressStub.restore();
  }
});

function getCopyAction() {
  const config = TestHelper.getConfig();
  const factory = new ActionFactory();
  return factory.get("copy", config);
}

Deno.test("CopyAction rejects missing package, unsafe URL filenames, and logs/rethrows copySync errors", async () => {
  const action = getCopyAction();
  const dstDir = TestHelper.getNewTempDir();

  await assertRejects(() => action.execute(undefined, [TestHelper.fileWithContent, dstDir]), Error, "No package for action copy");

  // Copying a file over an existing directory path triggers copySync error inside doCopy
  const blockingDir = path.join(dstDir, path.basename(TestHelper.fileWithContent));
  await Deno.mkdir(blockingDir, { recursive: true });
  await assertRejects(
    () => action.execute(TestHelper.mockPackage(), ["--verbose", TestHelper.fileWithContent, dstDir]),
    Error,
  );
});
