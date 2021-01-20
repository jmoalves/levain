import {assert, assertThrows} from "https://deno.land/std/testing/asserts.ts";

import TestHelper from "../lib/test/test_helper.ts";
import {assertDirCount} from "../lib/test/more_asserts.ts";
import MathUtil from "../lib/math_util.ts";

import CommandFactory from "./command_factory.ts";
import CleanCommand from "./clean.ts";

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


Deno.test('CleanCommand should clean cache and backup', () => {
    verifyClean([], true, true)
})
Deno.test('CleanCommand --cache should only clean cache', () => {
    verifyClean(['--cache'], false, true)
})
Deno.test('CleanCommand --backup should only clean backup', () => {
    verifyClean(['--backup'], true, false)
})
Deno.test('CleanCommand --cache --backup should clean cache and backup', () => {
    verifyClean(['--backup', '--cache'], true, true)
})

function verifyClean(parameters: any[], shouldCleanBackupDir: boolean, shouldCleanCacheDir: boolean) {
    const config = TestHelper.getConfig()

    const backupDirCount = MathUtil.randomInt(10);
    const backupDir = TestHelper.getNewTempDir()
    TestHelper.addRandomFilesToDir(backupDir, backupDirCount)
    config.levainBackupDir = backupDir
    assertDirCount(backupDir, backupDirCount)

    const cacheDirCount = MathUtil.randomInt(10);
    const cacheDir = TestHelper.getNewTempDir()
    TestHelper.addRandomFilesToDir(cacheDir, cacheDirCount)
    config.levainCacheDir = cacheDir
    assertDirCount(cacheDir, cacheDirCount)


    const command = new CleanCommand(config)
    command.execute(parameters)


    if (shouldCleanBackupDir) {
        assertDirCount(backupDir, 0, 'should clean backupDir')
    } else {
        assertDirCount(backupDir, backupDirCount, 'should keep backupDir')
    }

    if (shouldCleanCacheDir) {
        assertDirCount(cacheDir, 0, 'should clean cacheDir')
    } else {
        assertDirCount(cacheDir, cacheDirCount, 'should keep cacheDir')
    }
}