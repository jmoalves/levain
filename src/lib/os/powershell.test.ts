import { assertEquals } from "@std/assert";
import * as path from "@std/path";

import { Powershell } from "./powershell.ts";
import OsUtils from "./os_utils.ts";
import TestHelper from "../test/test_helper.ts";

if (OsUtils.isWindows()) {
  Deno.test({
    name: "Powershell should run a command",
    async fn() {
      const powershellCommand = "return 'Hello Powershell'";

      const result = await Powershell.run(powershellCommand, true);

      assertEquals(result, "Hello Powershell");
    },
  });

  Deno.test({
    name: "Powershell should run a file",
    async fn() {
      const tempDir = TestHelper.getNewTempDir();
      const script = path.join(tempDir, "helloWorld.ps1");
      await Deno.writeTextFile(script, 'Write-Output "Hello, powershell scripts!"\n');

      const result = await Powershell.run(script, true);

      assertEquals(result, "Hello, powershell scripts!");
    },
  });
}
