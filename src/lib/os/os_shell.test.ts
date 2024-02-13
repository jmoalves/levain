import {assertEquals} from "https://deno.land/std/assert/mod.ts";
import {OsShell} from "./os_shell.ts";
import TestHelper from "../test/test_helper.ts";
import {PackageManagerMock} from "../package/package_manager_mock.ts";
import {assertArrayEndsWith} from "../test/more_asserts.ts";

Deno.test('OsShell.adjustArgs should add quotation marks around parameters with spaces', () => {
    const args = ['noSpaces', 'with spaces']

    const adjustedArgs = OsShell.adjustArgs(args)

    const expectedArgs = ['noSpaces', '"with spaces"']
    assertEquals(adjustedArgs, expectedArgs)
})

Deno.test('OsShell.prepareShellOptions should add quotation marks around parameters with spaces', () => {
    const config = TestHelper.getConfig()
    config.packageManager = new PackageManagerMock(config)
    const osShell = new OsShell(config, ['abc'], true)
    const args = ['noSpaces', 'with spaces']

    const shellOptions = osShell.prepareShellOptions(args)

    const expectedArgs = ['noSpaces', 'with spaces']
    assertArrayEndsWith(shellOptions.cmd, expectedArgs)
    // assertEquals(shellOptions, expectedArgs)
})
