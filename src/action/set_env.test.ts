import {assertEquals, assertThrowsAsync, fail} from "https://deno.land/std/testing/asserts.ts";
import SetEnv from "./set_env.ts";
import TestHelper from "../lib/test/test_helper.ts";
import Action from "./action.ts";
import OsUtils from "../lib/os_utils.ts";

Deno.test('should tell you which params are expected', async () => {
    try {
        const config = TestHelper.getConfig();
        const action: Action = new SetEnv(config)
        const mockPackage = TestHelper.mockPackage()

        await action.execute(mockPackage, [])

        fail()
    } catch (err) {
        assertEquals(err, "You must inform the var and the value")
    }
})
Deno.test('should setEnv in config', async () => {
    const config = TestHelper.getConfig();
    const action: Action = new SetEnv(config)
    const mockPackage = TestHelper.mockPackage()

    const envKey = 'my_env_var';
    const envValue = 'value';
    await action.execute(mockPackage, [envKey, envValue])

    assertEquals(config.context.action.setEnv.env[envKey], envValue)
})
Deno.test('should throw exception on unexpected param', async () => {
    await assertThrowsAsync(
        async () => {
            const config = TestHelper.getConfig();
            const action: Action = new SetEnv(config)
            const mockPackage = TestHelper.mockPackage()

            await action.execute(mockPackage, ['--this-option-does-not-exist'])
        },
        Error,
        "Unknown option --this-option-does-not-exist",
    )
})
Deno.test('should allow --permanent option', async () => {
    const config = TestHelper.getConfig();
    const action: Action = new SetEnv(config)
    const mockPackage = TestHelper.mockPackage()
    const envKey = 'levain-test-env-permanent';
    const envValue = 'myValue';

    if (OsUtils.isWindows()) {
        await action.execute(mockPackage, ['--permanent', envKey, envValue])

        assertEquals(config.context.action.setEnv.env[envKey], envValue)
    } else {
        await assertThrowsAsync(
            async () => {
                await action.execute(mockPackage, ['--permanent', envKey, envValue])
            },
            Error,
            'darwin not supported'
        )
    }
})
