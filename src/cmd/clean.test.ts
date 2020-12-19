import CommandFactory from "./command_factory.ts";
import TestHelper from "../lib/test/test_helper.ts";
import {assert, assertThrows} from "https://deno.land/std/testing/asserts.ts";
import CleanCommand from "./clean.ts";
import {assertDirCount} from "../lib/test/more_asserts.ts";

Deno.test('CleanCommand should be in command factory', () => {
    const commandFactory = new CommandFactory()
    const config = TestHelper.getConfig();

    const command = commandFactory.get('clean', config)

    assert(command instanceof CleanCommand, 'should be an instance of CleanCommand')
})
Deno.test('CleanCommand should identify unknown option', () => {
    const config = TestHelper.getConfig()
    const command = new CleanCommand(config)

    assertThrows(
        () => {
            command.execute(['--this-param-does-not-exist'])
        },
        Error,
        'ERROR: Unknown option --this-param-does-not-exist',
    )
})
Deno.test('CleanCommand should clean cache', () => {
    const cacheDir = TestHelper.getNewTempDir()
    TestHelper.addRandomFilesToDir(cacheDir, 3)
    assertDirCount(cacheDir, 3)

    const config = TestHelper.getConfig()
    config.levainCacheDir = cacheDir
    const command = new CleanCommand(config)

    command.execute([])

    assertDirCount(cacheDir, 0)
})
