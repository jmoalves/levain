import {assertEquals} from "https://deno.land/std/assert/mod.ts";

import {Powershell} from "./powershell.ts";
import OsUtils from "./os_utils.ts";

if (OsUtils.isWindows()) {
    Deno.test({
        name: 'Powershell should run a command',
        async fn() {
            const powershellCommand = 'return \'Hello Powershell\'';

            const result = await Powershell.run(powershellCommand, true)

            assertEquals(result, 'Hello Powershell')
        }
    });

    Deno.test({
        name: 'Powershell should run a file',
        async fn() {
            const script = OsUtils.getScriptUri('helloWorld.ps1')

            const result = await Powershell.run(script, true)

            assertEquals(result, 'Hello, powershell scripts!')
        }
    })
}
