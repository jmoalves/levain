import TestHelper from "../../lib/test/test_helper.ts";
import ActionFactory from "../action_factory.ts";
import {assert, assertThrowsAsync} from "https://deno.land/std/testing/asserts.ts";
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
    await assertThrowsAsync(
        async () => {
            await action.execute(undefined, [])
        },
        Error,
        'You must inform the process name',
    )
});
