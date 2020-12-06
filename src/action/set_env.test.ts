import {assertEquals, assertThrows, fail} from "https://deno.land/std/testing/asserts.ts";
import SetEnv from "./set_env.ts";
import FakeHelper from "../lib/test/fake_helper.ts";
import Action from "./action.ts";

Deno.test('should tell you which params are expected', () => {
    try {
        const config = FakeHelper.getConfig();
        const action: Action = new SetEnv(config)
        const mockPackage = FakeHelper.mockPackage()

        action.execute(mockPackage, [])

        fail()
    } catch (err) {
        assertEquals(err, "You must inform the var and the value")
    }
})
Deno.test('should setEnv in config', () => {
    const config = FakeHelper.getConfig();
    const action: Action = new SetEnv(config)
    const mockPackage = FakeHelper.mockPackage()

    const envKey = 'my_env_var';
    const envValue = 'value';
    action.execute(mockPackage, [envKey, envValue])

    assertEquals(config.context.action.setEnv.env[envKey], envValue)
})
Deno.test('should throw expection on unexpected param', () => {
    assertThrows(
        () => {
            const config = FakeHelper.getConfig();
            const action: Action = new SetEnv(config)
            const mockPackage = FakeHelper.mockPackage()

            action.execute(mockPackage, ['--this-option-does-not-exist'])
        },
        Error,
        "Unknown option --this-option-does-not-exist",
    )
})
Deno.test('should allow --permanent option', () => {
    const config = FakeHelper.getConfig();
    const action: Action = new SetEnv(config)
    const mockPackage = FakeHelper.mockPackage()

    const envKey = 'my_env_var';
    const envValue = 'myValue';
    action.execute(mockPackage, ['--permanent', envKey, envValue])

    assertEquals(config.context.action.setEnv.env[envKey], envValue)
})