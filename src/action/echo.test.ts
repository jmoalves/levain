import Echo from "./echo.ts";
import TestHelper from "../lib/test/test_helper.ts";
import TestLogger from "../lib/logger/test_logger.ts";
import {assertEquals} from "https://deno.land/std/testing/asserts.ts";

Deno.test('should show a text', async () => {
    const testLogger = await TestLogger.setup()
    const config = TestHelper.getConfig()
    const action = new Echo(config)

    await action.execute(TestHelper.mockPackage(), ['Hello', 'world!'])

    assertEquals(testLogger.messages, [
        // TODO Remove the fist two lines?
        "INFO DEFAULT levainHome=/Users/rafaelwalter/levain",
        "INFO LOAD /Users/rafaelwalter/levain/.levain/config.json",
        // This is what I expected...
        'INFO ECHO Hello, world!'
    ])
})
