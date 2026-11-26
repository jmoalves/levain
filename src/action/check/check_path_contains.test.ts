import * as path from "@std/path";
import { assertEquals, assertRejects } from "@std/assert";
import { stub } from "@std/testing/mock";

import t from "../../lib/i18n.ts";
import OsUtils from "../../lib/os/os_utils.ts";
import TestHelper from "../../lib/test/test_helper.ts";
import ActionFactory from "../action_factory.ts";
import CheckPathContains from "./check_path_contains.ts";

Deno.test("CheckPathContains should be registered in ActionFactory and require at least one dir", async () => {
  const config = TestHelper.getConfig();
  const action = new ActionFactory().get("checkPathContains", config);
  const pkg = TestHelper.mockPackage();

  await assertRejects(
    () => action.execute(pkg, []),
    Error,
    t("action.check_path_contains.missingArgs"),
  );
});

Deno.test("CheckPathContains matches entries from session addPath and OS PATH (including Windows case-insensitivity and quotes)", async () => {
  const dir1 = TestHelper.getNewTempDir();
  const dir2 = TestHelper.getNewTempDir();
  const pkg = TestHelper.mockPackage();

  // 1. Found in session addpath.path (with trailing separator normalized)
  const config1 = TestHelper.getConfig();
  config1.context.action = { addpath: { path: [`${dir1}${path.SEPARATOR}`, ""] } };
  await new CheckPathContains(config1).execute(pkg, [dir1]);

  // 2. Found in OS PATH (including quoted entry) on POSIX and case-insensitively on Windows
  const config2 = TestHelper.getConfig();
  const envStub = stub(Deno.env, "get", (key: string) =>
    key === "PATH" ? `"${dir2}"${path.DELIMITER}` : undefined
  );
  try {
    const posixStub = stub(OsUtils, "isWindows", () => false);
    try {
      await new CheckPathContains(config2).execute(undefined, ["/nonexistent-a", dir2]);
    } finally {
      posixStub.restore();
    }

    const winStub = stub(OsUtils, "isWindows", () => true);
    try {
      await new CheckPathContains(config2).execute(pkg, [dir2.toUpperCase()]);
    } finally {
      winStub.restore();
    }
  } finally {
    envStub.restore();
  }

  assertEquals(CheckPathContains.normalizeEntry('  ""  ', false), "");
});

Deno.test("CheckPathContains throws clear errors when single or multiple dirs are missing from PATH", async () => {
  const config = TestHelper.getConfig();
  const pkg = TestHelper.mockPackage();
  const action = new CheckPathContains(config);
  const missingA = path.join(TestHelper.getNewTempDir(), "not-in-path-a");
  const missingB = path.join(TestHelper.getNewTempDir(), "not-in-path-b");

  const envStub = stub(Deno.env, "get", () => undefined);
  try {
    await assertRejects(
      () => action.execute(pkg, [missingA]),
      Error,
      t("action.check_path_contains.notFound", { dir: missingA }),
    );
    await assertRejects(
      () => action.execute(pkg, [missingA, missingB]),
      Error,
      t("action.check_path_contains.noneFound", { dirs: `${missingA}, ${missingB}` }),
    );
  } finally {
    envStub.restore();
  }
});
