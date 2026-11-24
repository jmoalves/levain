import {
  assert,
  assertEquals,
  assertMatch,
  assertNotEquals,
  assertNotMatch,
  assertRejects,
} from "@std/assert";
import { stub } from "@std/testing/mock";
import * as path from "@std/path";

import OsUtils from "./os_utils.ts";
import { assertGreaterThan, assertPathExists } from "../test/more_asserts.ts";
import TestHelper from "../test/test_helper.ts";
import DirUtils from "../fs/dir_utils.ts";
import HomePaths from "../paths/home_paths.ts";

Deno.test("OsUtils should know the users login", () => {
  assertNotEquals(OsUtils.login, undefined);
});

Deno.test("OsUtils should know if we are running in Windows", () => {
  const os = Deno.build.os;
  const shouldBeWindows = os === "windows";
  assertEquals(OsUtils.isWindows(), shouldBeWindows);
});

Deno.test("OsUtils should know if we are running in Posix", () => {
  const os: string = Deno.build.os;
  const shouldBePosix = ["linux", "darwin"].includes(os);
  assertEquals(OsUtils.isPosix(), shouldBePosix);
});

Deno.test("OsUtils should know if we are running in macOS", () => {
  const os = Deno.build.os;
  const shouldBeMacOs = os === "darwin";
  assertEquals(OsUtils.isMacOs(), shouldBeMacOs);
});

Deno.test("OsUtils should know if we are running in Linux", () => {
  const os = Deno.build.os;
  const shouldBeLinux = os === "linux";
  assertEquals(OsUtils.isLinux(), shouldBeLinux);
});

if (OsUtils.isWindows()) {
  Deno.test("OsUtils.createShortcut should create a shortcut/symlink to a file", async () => {
    // Given that I have an empty dir
    const tempDir = TestHelper.getNewTempDir();
    // And a file
    const aFile = TestHelper.getNewTempFile();
    const aFileName = path.basename(aFile);

    // When I create a symlink to the file in the empty dir
    await OsUtils.createShortcut(aFile, tempDir);

    // Then the new symlink should exist
    assertPathExists(path.join(tempDir, `${aFileName}.lnk`));
  });

  Deno.test({
    name: "OsUtils.addToDesktop should create a shortcut to a file",
    fn: async () => {
      const aFile = TestHelper.getNewTempFile();
      const aFileName = path.basename(aFile);
      const dir = HomePaths.desktopDir;
      const shortcut = path.resolve(dir, `${aFileName}.lnk`);
      OsUtils.removeFile(shortcut);

      try {
        await OsUtils.addToDesktop(aFile);
        assertPathExists(shortcut);
      } finally {
        OsUtils.removeFile(shortcut);
      }
    },
  });

  Deno.test({
    name: "OsUtils.addToStartup should create a shortcut to a file",
    fn: async () => {
      const aFile = TestHelper.getNewTempFile();
      const aFileName = path.basename(aFile);
      const dir = HomePaths.startupDir;
      const shortcut = path.resolve(dir, `${aFileName}.lnk`);
      OsUtils.removeFile(shortcut);

      try {
        await OsUtils.addToStartup(aFile);
        assertPathExists(shortcut);
      } finally {
        OsUtils.removeFile(shortcut);
      }
    },
  });

  Deno.test({
    name: "OsUtils.addToStartMenu should create a shortcut to a file",
    fn: async () => {
      const aFile = TestHelper.getNewTempFile();
      const aFileName = path.basename(aFile);
      const dir = HomePaths.startMenuDir;
      const shortcut = path.resolve(dir, `${aFileName}.lnk`);
      OsUtils.removeFile(shortcut);

      try {
        await OsUtils.addToStartMenu(aFile);
        assertPathExists(shortcut);
      } finally {
        OsUtils.removeFile(shortcut);
      }
    },
  });

  Deno.test({
    name: "OsUtils.addToStartMenu should create a shortcut to a file in a group",
    fn: async () => {
      const aFile = TestHelper.getNewTempFile();
      const aFileName = path.basename(aFile);
      const aGroup = `levain-test-${crypto.randomUUID().slice(0, 8)}`;
      const dir = HomePaths.startMenuDir;
      const groupDir = path.resolve(dir, aGroup);
      const shortcut = path.resolve(groupDir, `${aFileName}.lnk`);
      OsUtils.removeDir(groupDir);

      try {
        await OsUtils.addToStartMenu(aFile, aGroup);
        assertPathExists(shortcut);
      } finally {
        OsUtils.removeDir(groupDir);
      }
    },
  });
}

Deno.test("OsUtils.resolvePath should resolve a string", () => {
  // Given an unresolved string path
  const unresolvedPath = "abc/123";
  // When I resolve the path
  const resolvedPath = OsUtils.resolvePath(unresolvedPath);
  // It should end with my path
  assertMatch(resolvedPath, /abc[\/\\]+123/);
});

Deno.test("OsUtils.resolvePath should resolve a string array", () => {
  // Given an unresolved string array path
  const unresolvedPath = ["abc", "123"];
  // When I resolve the path
  const resolvedPath = OsUtils.resolvePath(unresolvedPath);
  // It should end with my path
  assertMatch(resolvedPath, /abc[\/\\]+123/);
});

if (OsUtils.isWindows()) {
  Deno.test({
    name: "OsUtils.getUserPath should get path",
    async fn() {
      const path = await OsUtils.getUserPath();
      assertGreaterThan(path?.length, 3); // userPath for github runner is pretty small
    },
  });

  Deno.test({
    name: "OsUtils.sanitizePathString should remove invalid chars",
    fn() {
      const path = 'C:\\src\\dev-env\\levain";"C:\\Program Files (x86)\\Common Files\\Oracle\\Java\\javapath"';
      const sanitizedPath = OsUtils.sanitizePathString(path);
      assertEquals(
        sanitizedPath,
        "C:\\src\\dev-env\\levain;C:\\Program Files (x86)\\Common Files\\Oracle\\Java\\javapath",
      );
    },
  });

  Deno.test({
    name: "OsUtils.sanitizePathArray should remove invalid chars",
    fn() {
      const pathArray = [
        '%USERPROFILE%\\AppData\\Local\\Microsoft\\WindowsApps"',
        '"C:\\Program Files\\Docker\\Docker\\resources\\bin"',
      ];
      const sanitizedPathArray = OsUtils.sanitizePathArray(pathArray);
      assertEquals(sanitizedPathArray, [
        "%USERPROFILE%\\AppData\\Local\\Microsoft\\WindowsApps",
        "C:\\Program Files\\Docker\\Docker\\resources\\bin",
      ]);
    },
  });

  Deno.test("OsUtils.addPathPermanent should set path permanently", async () => {
    const folder = TestHelper.getNewTempDir();
    try {
      await OsUtils.removePathPermanent(folder);
      assert(
        !await OsUtils.isInUserPath(folder),
        `Shouldn't have the folder ${folder} in path - ${await OsUtils.getUserPath()}`,
      );

      await OsUtils.addPathPermanent(folder);

      assert(
        await OsUtils.isInUserPath(folder),
        `Should have the folder ${folder} in path - ${await OsUtils.getUserPath()}`,
      );
    } finally {
      await OsUtils.removePathPermanent(folder);
    }
  });
}
//
// runAndLog
//
const getCurrentDirCommand = OsUtils.isWindows() ? "cmd /u /c echo %cd%" : "pwd";
Deno.test("OsUtils.runAndLog should not insert unicode zeros in stdout", async () => {
  const stdout = await OsUtils.runAndLog(getCurrentDirCommand);
  // deno-lint-ignore no-control-regex
  assertNotMatch(stdout, /\u0000/);
});
Deno.test("OsUtils.runAndLog should execute and return stdout", async () => {
  const stdout = await OsUtils.runAndLog(getCurrentDirCommand);

  const normalizedPath = DirUtils.normalizePath(stdout.trim());
  assertEquals(normalizedPath.toLowerCase(), DirUtils.normalizePath(Deno.cwd()).toLowerCase());
});
Deno.test({
  name: "OsUtils.runAndLog should accept a workDir",
  async fn() {
    const stdout = await OsUtils.runAndLog(getCurrentDirCommand, TestHelper.getTestDataPath());
    const pathInOutput = stdout.replaceAll(/[\r\n]/gm, "");
    const normalizedPath = DirUtils.normalizePath(pathInOutput);
    assertMatch(normalizedPath, /[\\\/]+testdata/);
  },
});

Deno.test("OsUtils.sanitizeUserPath should skip setUserPath when PATH has no changes", async () => {
  const isWinStub = stub(OsUtils, "isWindows", () => true);
  const getStub = stub(OsUtils, "getUserPath", () => Promise.resolve(["C:\\Windows", "C:\\Tools"]));
  const setStub = stub(OsUtils, "setUserPath", () => Promise.resolve(""));

  try {
    await OsUtils.sanitizeUserPath();
    assertEquals(setStub.calls.length, 0);
  } finally {
    setStub.restore();
    getStub.restore();
    isWinStub.restore();
  }
});

Deno.test("OsUtils.sanitizeUserPath should call setUserPath when PATH contains quotes", async () => {
  const isWinStub = stub(OsUtils, "isWindows", () => true);
  const getStub = stub(OsUtils, "getUserPath", () => Promise.resolve(['"C:\\Tools"', "C:\\Windows"]));
  const setStub = stub(OsUtils, "setUserPath", () => Promise.resolve(""));

  try {
    await OsUtils.sanitizeUserPath();
    assertEquals(setStub.calls.length, 1);
    assertEquals(setStub.calls[0].args, [["C:\\Tools", "C:\\Windows"]]);
  } finally {
    setStub.restore();
    getStub.restore();
    isWinStub.restore();
  }
});

Deno.test("OsUtils.setEnvPermanent should pass argv array to setx and validate variable names", async () => {
  const onlyWinStub = stub(OsUtils, "onlyInWindows", () => {});
  const setEnvStub = stub(OsUtils, "setEnv", () => {});
  const runStub = stub(OsUtils, "runAndLog", () => Promise.resolve(""));

  try {
    await OsUtils.setEnvPermanent("MY_APP_DIR", "C:\\Program Files\\My App");
    assertEquals(setEnvStub.calls.length, 1);
    assertEquals(setEnvStub.calls[0].args, ["MY_APP_DIR", "C:\\Program Files\\My App"]);
    assertEquals(runStub.calls.length, 1);
    assertEquals(runStub.calls[0].args, [["setx", "MY_APP_DIR", "C:\\Program Files\\My App"]]);

    await assertRejects(
      async () => await OsUtils.setEnvPermanent("/M", "evil"),
      Error,
      "Invalid environment variable name",
    );
    await assertRejects(
      async () => await OsUtils.setEnvPermanent("BAD=KEY", "val"),
      Error,
      "Invalid environment variable name",
    );
    await assertRejects(
      async () => await OsUtils.setEnvPermanent("GOOD_KEY", "bad\0val"),
      Error,
      "must not contain NUL",
    );
  } finally {
    runStub.restore();
    setEnvStub.restore();
    onlyWinStub.restore();
  }
});

if (OsUtils.isWindows()) {
  Deno.test("OsUtils.setEnvPermanent should persist dash-prefixed values via PowerShell fallback", async () => {
    const varName = `LEVAIN_TEST_PS_ENV_${crypto.randomUUID().replaceAll("-", "").slice(0, 8)}`;
    const expectedVal = "-Xmx2g -Dflag=/c/tools";

    try {
      await OsUtils.setEnvPermanent(varName, expectedVal);
      assertEquals(Deno.env.get(varName), expectedVal);

      const readBack = await OsUtils.runAndLog([
        "powershell",
        "-NoProfile",
        "-NonInteractive",
        "-Command",
        `[Environment]::GetEnvironmentVariable('${varName}', 'User')`,
      ]);
      assertEquals(readBack.trim(), expectedVal);
    } finally {
      Deno.env.delete(varName);
      await OsUtils.runAndLog([
        "powershell",
        "-NoProfile",
        "-NonInteractive",
        "-Command",
        `[Environment]::SetEnvironmentVariable('${varName}', $null, 'User')`,
      ]).catch(() => {});
    }
  });
}
