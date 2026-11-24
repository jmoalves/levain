import { assert, assertEquals, assertRejects } from "@std/assert";
import { stub } from "@std/testing/mock";
import * as path from "@std/path";
import TestHelper from "../../lib/test/test_helper.ts";
import MavenCopyAction from "./maven_copy.ts";
import ActionFactory from "../action_factory.ts";
import { assertFileEmpty, assertFileNotEmpty } from "../../lib/test/more_asserts.ts";
import { FileUtils } from "../../lib/fs/file_utils.ts";
import OsUtils from "../../lib/os/os_utils.ts";
import GeneralPaths from "../../lib/paths/general_paths.ts";

Deno.test("MavenCopyAction should be obtainable with action factory", () => {
  const action = getMavenCopyAction();
  assert(action instanceof MavenCopyAction);
});

Deno.test("MavenCopyAction should throw exception when arguments are not provided", async () => {
  const action = getMavenCopyAction();
  await assertRejects(
    async () => {
      await action.execute(TestHelper.mockPackage(), []);
    },
    Error,
    "Invalid arguments.\n  Usage: mavenCopy [--ifNotExists] [coordinates] [destination]\n  Example: mavenCopy com.example:sample-artifact:1.0.0:jar c:\\temp",
  );
});

Deno.test("MavenCopyAction should reject malformed Maven coordinates, path traversal, and file destinations", async () => {
  const action = getMavenCopyAction();
  const tempDir = TestHelper.getNewTempDir();
  const tempFile = TestHelper.getNewTempFile();

  for (
    const badCoord of [
      "onlyGroup:onlyArtifact",
      "com.example:lib:1.0:",
      "com.example:..:1.0:jar",
      "com.example:lib:1.0:jar:cls:extra",
      "com.example:lib:1.0&calc",
    ]
  ) {
    await assertRejects(
      async () => {
        await action.execute(TestHelper.mockPackage(), [badCoord, tempDir]);
      },
      Error,
      `Invalid Maven coordinates: ${badCoord}`,
    );
  }

  await assertRejects(
    async () => {
      await action.execute(TestHelper.mockPackage(), ["--ifNotExists", "com.example:lib:1.0:jar", tempFile]);
    },
    Error,
    "Destination path is not a directory",
  );
});

Deno.test("MavenCopyAction --ifNotExists should skip Maven when artifact exists in destination dir and fetch when absent", async () => {
  const tempDir = TestHelper.getNewTempDir();
  const runCalls: string[][] = [];
  const mvnStub = stub(GeneralPaths, "mvnCliPath", () => "/mock/mvn");
  const runStub = stub(OsUtils, "runAndLog", (cmd: string | string[]) => {
    runCalls.push(Array.isArray(cmd) ? cmd : [cmd]);
    return Promise.resolve("");
  });

  try {
    const action = getMavenCopyAction();

    // Artifact not in tempDir yet -> should check mvn -version and run mvn dependency:copy
    await action.execute(TestHelper.mockPackage(), [
      "--ifNotExists",
      "com.example:demo-lib:2.1.0:jar",
      tempDir,
    ]);
    assertEquals(runCalls.filter((cmd) => cmd.includes("dependency:copy")).length, 1);
    const callsAfterFirstFetch = runCalls.length;

    // Create the expected JAR -> --ifNotExists should skip Maven completely (no -version or dependency:copy)
    await FileUtils.createEmptyFile(path.join(tempDir, "demo-lib-2.1.0.jar"));
    await action.execute(TestHelper.mockPackage(), [
      "--ifNotExists",
      "com.example:demo-lib:2.1.0:jar",
      tempDir,
    ]);
    assertEquals(runCalls.length, callsAfterFirstFetch);

    // Classifier variant not yet present -> should call mvn
    await action.execute(TestHelper.mockPackage(), [
      "--ifNotExists",
      "com.example:demo-lib:2.1.0:jar:sources",
      tempDir,
    ]);
    assertEquals(runCalls.filter((cmd) => cmd.includes("dependency:copy")).length, 2);
    const callsAfterSecondFetch = runCalls.length;

    // Create classifier JAR -> should skip
    await FileUtils.createEmptyFile(path.join(tempDir, "demo-lib-2.1.0-sources.jar"));
    await action.execute(TestHelper.mockPackage(), [
      "--ifNotExists",
      "com.example:demo-lib:2.1.0:jar:sources",
      tempDir,
    ]);
    assertEquals(runCalls.length, callsAfterSecondFetch);
  } finally {
    runStub.restore();
    mvnStub.restore();
  }
});

Deno.test("MavenCopyAction should fetch and copy Maven artifact", async () => {
  if (Deno.env.get("M2_HOME")) {
    const tempDir = TestHelper.getNewTempDir();
    const dstFile = path.resolve(tempDir, "kotlin-stdlib-2.1.21.jar");
    const coordinates = "org.jetbrains.kotlin:kotlin-stdlib:2.1.21:jar";

    const action = getMavenCopyAction();
    await action.execute(TestHelper.mockPackage(), [
      coordinates,
      tempDir,
    ]);

    const stat = await Deno.stat(dstFile);
    assert(stat.isFile);
    await assertFileNotEmpty(dstFile);
  }
});

Deno.test("MavenCopyAction should overwrite existing artifact", async () => {
  if (Deno.env.get("M2_HOME")) {
    const tempDir = TestHelper.getNewTempDir();
    const dstFile = path.resolve(tempDir, "kotlin-stdlib-2.1.21.jar");
    await FileUtils.createEmptyFile(dstFile);
    await assertFileEmpty(dstFile);

    const coordinates = "org.jetbrains.kotlin:kotlin-stdlib:2.1.21:jar";

    const action = getMavenCopyAction();
    await action.execute(TestHelper.mockPackage(), [
      coordinates,
      tempDir,
    ]);

    const stat = await Deno.stat(dstFile);
    assert(stat.isFile);
    await assertFileNotEmpty(dstFile);
  }
});

function getMavenCopyAction() {
  const config = TestHelper.getConfig();
  const factory = new ActionFactory();
  return factory.get("mavenCopy", config);
}
