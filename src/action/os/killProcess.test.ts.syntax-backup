import TestHelper from "../../lib/test/test_helper.ts";
import ActionFactory from "../action_factory.ts";
import {assert, assertRejects} from "https://deno.land/std/assert/mod.ts";
import KillProcessAction from "./killProcess.ts";

Deno.test('KillProcessAction should be obtainable from ActionFactory', () => {
    // Given an ActionFactory
    const config = TestHelper.getConfig()
    const factory = new ActionFactory()

    // When I get killProcess
    const action = factory.get("killProcess", config)

    // Then I recieve an instance
    assert(action instanceof KillProcessAction)
});

Deno.test('KillProcessAction should require process name', async () => {
    // Given a KillProcessAction
    const action = new KillProcessAction()

    // When I execute the action without parameters
    // Then I get a message requiring a process name
    await assertRejects(
        async () => {
            await action.execute(undefined, [])
        },
        Error,
        'You must inform the process name',
    )
});
//
// if (OsUtils.isWindows()) {
//     Deno.test('KillProcessAction should kill a process', () => {
//         // Given
//         const action = new KillProcessAction()
//         const processName = 'testdata/killProcess/levainTestWaitForever.ts'
//         Deno.run(processName)
// TODO How do I give a name to a process?
//         assertProcessRunning(processName)
//         // When
//         await action.execute(undefined, [])
//         // Then
//         assertProcessNotRunning(processName)
//     })
// }
