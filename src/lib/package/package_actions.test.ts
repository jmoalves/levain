import { assert, assertEquals } from "@std/assert";
import { stub } from "@std/testing/mock";

import OsUtils from "../os/os_utils.ts";
import TestHelper from "../test/test_helper.ts";
import FileSystemPackage from "./file_system_package.ts";
import LevainPaths from "../paths/levain_paths.ts";
import { resolvePackageActions } from "./package_actions.ts";

Deno.test("resolvePackageActions should append .posix and OS-specific blocks after common actions", () => {
  const config = TestHelper.getConfig();
  const pkg = new FileSystemPackage(
    config,
    "multi-os",
    TestHelper.getNewTempDir(),
    "multi-os.levain.yaml",
    [
      "version: 1.0.0",
      "cmd.install:",
      "  - echo common",
      "cmd.install.posix:",
      "  - echo posix",
      "cmd.install.linux:",
      "  - echo linux",
      "cmd.install.darwin:",
      "  - echo darwin",
      "cmd.install.windows:",
      "  - echo windows",
    ].join("\n"),
  );

  const winStub = stub(OsUtils, "getOs", () => "windows");
  try {
    assertEquals(resolvePackageActions(pkg, "cmd.install"), ["echo common", "echo windows"]);
  } finally {
    winStub.restore();
  }

  const linuxStub = stub(OsUtils, "getOs", () => "linux");
  try {
    assertEquals(resolvePackageActions(pkg, "cmd.install"), ["echo common", "echo posix", "echo linux"]);
  } finally {
    linuxStub.restore();
  }

  const macStub = stub(OsUtils, "getOs", () => "darwin");
  try {
    assertEquals(resolvePackageActions(pkg, "cmd.install"), ["echo common", "echo posix", "echo darwin"]);
  } finally {
    macStub.restore();
  }
});

Deno.test("recipes/levain.levain.yaml should keep Windows registry/PATH steps under cmd.install.windows", () => {
  const config = TestHelper.getConfig();
  const yamlText = Deno.readTextFileSync(LevainPaths.levainRecipePath);
  const pkg = new FileSystemPackage(
    config,
    "levain",
    LevainPaths.levainRecipesDir,
    LevainPaths.levainRecipePath,
    yamlText,
  );

  const linuxStub = stub(OsUtils, "getOs", () => "linux");
  try {
    const linuxActions = resolvePackageActions(pkg, "cmd.install");
    assertEquals(linuxActions.filter((a) => a.includes("../../build")).length, 1);
    assert(linuxActions.every((a) => !a.includes("reg import")));
    assert(linuxActions.every((a) => !a.includes("addPath --permanent")));
  } finally {
    linuxStub.restore();
  }

  const winStub = stub(OsUtils, "getOs", () => "windows");
  try {
    const winActions = resolvePackageActions(pkg, "cmd.install");
    assertEquals(winActions.filter((a) => a.includes("../../build")).length, 1);
    assert(winActions.some((a) => a.includes("reg import")));
    assert(winActions.some((a) => a.includes("addPath --permanent")));
  } finally {
    winStub.restore();
  }
});
