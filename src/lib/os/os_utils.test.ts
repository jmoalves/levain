import {
  assert,
  assertEquals,
  assertMatch,
  assertNotEquals,
  assertNotMatch,
  assertRejects,
  assertThrows,
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

Deno.test("OsUtils.hostname should fall back to Deno.hostname when env vars are unset", () => {
  const envStub = stub(Deno.env, "get", () => undefined);
  const hostStub = stub(Deno, "hostname", () => "fallback-host");
  try {
    assertEquals(OsUtils.hostname, "fallback-host");
  } finally {
    hostStub.restore();
    envStub.restore();
  }

  const envStub2 = stub(Deno.env, "get", () => undefined);
  const hostFailStub = stub(Deno, "hostname", () => {
    throw new Error("no hostname");
  });
  try {
    assertEquals(OsUtils.hostname, undefined);
  } finally {
    hostFailStub.restore();
    envStub2.restore();
  }
});

Deno.test("OsUtils.createShortcut POSIX branch should target dstDir/basename and replace existing symlink", async () => {
  const dstDir = TestHelper.getNewTempDir();
  const targetFile = path.join(dstDir, "src-tool");
  const expectedLink = path.join(dstDir, "src-tool");

  let lstatCall = 0;
  const removedPaths: string[] = [];
  const symlinks: Array<[string, string]> = [];

  const isWinStub = stub(OsUtils, "isWindows", () => false);
  const lstatStub = stub(Deno, "lstatSync", () => {
    lstatCall++;
    if (lstatCall === 1) {
      throw new Deno.errors.NotFound("not found");
    }
    return { isSymlink: true } as Deno.FileInfo;
  });
  const removeStub = stub(Deno, "removeSync", (p: string | URL) => {
    removedPaths.push(String(p));
  });
  const symlinkStub = stub(Deno, "symlinkSync", (oldPath: string | URL, newPath: string | URL) => {
    symlinks.push([String(oldPath), String(newPath)]);
  });

  try {
    const link1 = await OsUtils.createShortcut(targetFile, dstDir);
    const link2 = await OsUtils.createShortcut(targetFile, dstDir);
    assertEquals(link1, expectedLink);
    assertEquals(link2, expectedLink);
    assertEquals(removedPaths, [expectedLink]);
    assertEquals(symlinks, [[targetFile, expectedLink], [targetFile, expectedLink]]);
  } finally {
    symlinkStub.restore();
    removeStub.restore();
    lstatStub.restore();
    isWinStub.restore();
  }
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

Deno.test("OsUtils.parseUserPathRegistryJson should parse Unicode Registry JSON and fail closed on invalid payloads", () => {
  assertEquals(
    OsUtils.parseUserPathRegistryJson(
      '{"exists":true,"type":"ExpandString","value":"%USERPROFILE%\\\\bin;C:\\\\Users\\\\Jo\\u00e3o\\\\Program Files\\\\Tool"}\r\n',
    ),
    {
      exists: true,
      type: "ExpandString",
      value: "%USERPROFILE%\\bin;C:\\Users\\João\\Program Files\\Tool",
    },
  );

  assertEquals(
    OsUtils.parseUserPathRegistryJson('{"exists":true,"type":"String","value":"C:\\\\Tools"}'),
    {
      exists: true,
      type: "String",
      value: "C:\\Tools",
    },
  );

  assertEquals(
    OsUtils.parseUserPathRegistryJson('{"exists":false,"value":""}'),
    {
      exists: false,
      type: "ExpandString",
      value: "",
    },
  );

  assertThrows(() => OsUtils.parseUserPathRegistryJson(""), Error, "Empty response");
  assertThrows(() => OsUtils.parseUserPathRegistryJson("not json"), Error, "Invalid JSON");
  assertThrows(() => OsUtils.parseUserPathRegistryJson('{"exists":"yes"}'), Error, "Unexpected response shape");
});

Deno.test("OsUtils.addPathPermanent and setUserPath should reject control characters and separators", async () => {
  const onlyWinStub = stub(OsUtils, "onlyInWindows", () => {});
  try {
    await assertRejects(
      async () => await OsUtils.addPathPermanent("C:\\good;C:\\injected"),
      Error,
      "Invalid PATH entry",
    );
    await assertRejects(
      async () => await OsUtils.addPathPermanent("C:\\bad\npath"),
      Error,
      "Invalid PATH entry",
    );
    await assertRejects(
      async () => await OsUtils.setUserPath(["C:\\ok", "C:\\bad\0path"]),
      Error,
      "Invalid PATH entry",
    );
  } finally {
    onlyWinStub.restore();
  }
});

Deno.test("OsUtils.windowsSystemToolPath should resolve under SystemRoot/System32", () => {
  const envStub = stub(Deno.env, "get", (key: string) => (key === "SystemRoot" ? "C:\\WinCustom" : undefined));
  try {
    assertEquals(
      OsUtils.windowsSystemToolPath("tar.exe"),
      path.join("C:\\WinCustom", "System32", "tar.exe"),
    );
  } finally {
    envStub.restore();
  }
});

Deno.test("OsUtils.findInPath should locate binaries on absolute PATH entries and reject unsafe extensions or relative dirs", () => {
  const dir1 = TestHelper.getNewTempDir();
  const dir2 = TestHelper.getNewTempDir();
  const nonExecFile = path.join(dir1, "mytool");
  const execFile = path.join(dir2, "mytool");
  Deno.writeTextFileSync(nonExecFile, "#!/bin/sh\n");
  Deno.writeTextFileSync(execFile, "#!/bin/sh\n");
  if (!OsUtils.isWindows()) {
    Deno.chmodSync(nonExecFile, 0o644);
    Deno.chmodSync(execFile, 0o755);
  }

  const winNoExt = path.join(dir1, "wintool");
  const winVbs = path.join(dir1, "wintool.VBS");
  const winBat = path.join(dir1, "wintool.BAT");
  const winExe = path.join(dir2, "wintool.EXE");
  Deno.writeTextFileSync(winNoExt, "");
  Deno.writeTextFileSync(winVbs, "");
  Deno.writeTextFileSync(winBat, "");
  Deno.writeTextFileSync(winExe, "");

  const envMap: Record<string, string | undefined> = {
    PATH: `.${path.DELIMITER}relative/dir${path.DELIMITER}"${dir1}"${path.DELIMITER}${dir2}`,
    PATHEXT: ".VBS;.BAT;.EXE;.CMD",
  };
  const envStub = stub(Deno.env, "get", (key: string) => envMap[key]);
  const isWinStub = stub(OsUtils, "isWindows", () => false);

  try {
    assertEquals(OsUtils.findInPath(""), undefined);
    // Relative "." must not match files in CWD (e.g. deno.json)
    assertEquals(OsUtils.findInPath("deno.json"), undefined);
    // On POSIX, non-executable file in dir1 is skipped and executable in dir2 is returned;
    // on Windows (where NTFS has no POSIX exec bits), dir1 matches first.
    const expectedPosix = Deno.build.os === "windows" ? nonExecFile : execFile;
    assertEquals(OsUtils.findInPath("mytool"), expectedPosix);
    assertEquals(OsUtils.findInPath("does-not-exist-xyz"), undefined);

    envMap.PATH = "";
    assertEquals(OsUtils.findInPath("mytool"), undefined);
  } finally {
    isWinStub.restore();
    envStub.restore();
  }

  // Simulate Windows PATHEXT lookup: .VBS and extensionless files must be skipped
  envMap.PATH = `"${dir1}"${path.DELIMITER}"${dir2}"`;
  const envStub2 = stub(Deno.env, "get", (key: string) => envMap[key]);
  const isWinStub2 = stub(OsUtils, "isWindows", () => true);
  try {
    // Default allowed extensions skip .VBS and extensionless, matching .BAT before .EXE per PATHEXT
    assertEquals(OsUtils.findInPath("wintool"), winBat);
    // Restricting to [".EXE", ".COM"] skips .BAT and resolves .EXE
    assertEquals(OsUtils.findInPath("wintool", [".EXE", ".COM"]), winExe);
    // Explicit extension works directly
    assertEquals(OsUtils.findInPath("wintool.EXE"), winExe);
    // Extensionless-only file is NOT matched on Windows
    assertEquals(OsUtils.findInPath("mytool"), undefined);
  } finally {
    isWinStub2.restore();
    envStub2.restore();
  }
});

if (!OsUtils.isWindows()) {
  Deno.test("OsUtils.createShortcut on POSIX should create and replace a symlink inside the destination directory", async () => {
    const dstDir = TestHelper.getNewTempDir();
    const targetFile = TestHelper.getNewTempFile();
    const expectedLink = path.join(dstDir, path.basename(targetFile));

    const firstLink = await OsUtils.createShortcut(targetFile, dstDir);
    assertEquals(firstLink, expectedLink);
    assertEquals(Deno.lstatSync(expectedLink).isSymlink, true);

    // Calling createShortcut again replaces the existing symlink cleanly without EEXIST
    const secondLink = await OsUtils.createShortcut(targetFile, dstDir);
    assertEquals(secondLink, expectedLink);
    assertEquals(Deno.readLinkSync(expectedLink), targetFile);
  });
}

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
