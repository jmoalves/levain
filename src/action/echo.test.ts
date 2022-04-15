import TestHelper from "../lib/test/test_helper.ts";
import {assertArrayEndsWith} from "../lib/test/more_asserts.ts";

import Echo from "./echo.ts";

Deno.test('Echo should show a text', async () => {

    const testLogger = await TestHelper.setupTestLogger()
    const config = TestHelper.getConfig()
    const action = new Echo(config)

    await action.execute(TestHelper.mockPackage(), ['Hello', 'world!'])

    assertArrayEndsWith<string>(testLogger.messages, [
        'DEBUG ECHO Hello world!'
    ])

})
