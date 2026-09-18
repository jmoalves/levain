import { assert } from "@std/assert";
import { existsSync } from "@std/fs";
import * as log from "@std/log";
import HomePaths from "./home_paths.ts";
import OsUtils from "../os/os_utils.ts";

Deno.test({
  name: "HomePaths should know where is the home folder",
  fn: () => {
    const path = HomePaths.homedir();
    log.info(`HomePaths.homedir() ${path}`);
    assert(path);
    assert(existsSync(path));
  },
});

if (OsUtils.isWindows()) {
  Deno.test({
    name: "HomePaths.desktopDir should know the desktop folder",
    fn: () => {
      const desktopDir = HomePaths.desktopDir;
      assert(desktopDir);
      assert(existsSync(desktopDir), `Could not find desktop folder ${desktopDir}`);
    },
  });

  Deno.test({
    name: "HomePaths.startMenuDir should know the start menu folder",
    fn: () => {
      const startMenuDir = HomePaths.startMenuDir;
      assert(startMenuDir);
      assert(existsSync(startMenuDir), `Could not find start menu folder ${startMenuDir}`);
    },
  });

  Deno.test({
    name: "HomePaths.startupDir should know the startup folder",
    fn: () => {
      const startupDir = HomePaths.startupDir;
      assert(startupDir);
      assert(existsSync(startupDir), `Could not find start menu folder ${startupDir}`);
    },
  });
}