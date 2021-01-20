import TestHelper from "../lib/test/test_helper.ts";
import TestLogger from "../lib/logger/test_logger.ts";
import {assertArrayEndsWith} from "../lib/test/more_asserts.ts";

import Echo from "./echo.ts";

Deno.test('should show a text', async () => {
    const testLogger = await TestLogger.setup()
    const config = TestHelper.getConfig()
    const action = new Echo(config)

    await action.execute(TestHelper.mockPackage(), ['Hello', 'world!'])

    assertArrayEndsWith<string>(testLogger.messages, [
        'INFO ECHO Hello world!'
    ])
})
