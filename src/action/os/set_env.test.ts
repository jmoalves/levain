import {assertEquals, assertRejects, fail} from "https://deno.land/std/assert/mod.ts";

import TestHelper from "../../lib/test/test_helper.ts";
import OsUtils from "../../lib/os/os_utils.ts";

import Action from "../action.ts";
import SetEnv from "./set_env.ts";

Deno.test('SetEnv should tell you which params are expected', async () => {
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
Deno.test('SetEnv should setEnv in config', async () => {
    const config = TestHelper.getConfig();
    const action: Action = new SetEnv(config)
    const mockPackage = TestHelper.mockPackage()

    const envKey = 'my_env_var';
    const envValue = 'value';
    await action.execute(mockPackage, [envKey, envValue])

    assertEquals(config.context.action.setEnv.env[envKey], envValue)
})
Deno.test('SetEnv should throw exception on unexpected param', async () => {
    await assertRejects(
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
Deno.test('SetEnv should allow --permanent option', async () => {
    const config = TestHelper.getConfig();
    const action: Action = new SetEnv(config)
    const mockPackage = TestHelper.mockPackage()
    const envKey = 'levain-test-env-permanent';
    const envValue = 'myValue';

    if (OsUtils.isWindows()) {
        await action.execute(mockPackage, ['--permanent', envKey, envValue])

        assertEquals(config.context.action.setEnv.env[envKey], envValue)
    } else {
        await assertRejects(
            async () => {
                await action.execute(mockPackage, ['--permanent', envKey, envValue])
            },
            Error,
            `${OsUtils.getOs()} not supported`
        )
    }
})
