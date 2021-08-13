import {assertEquals} from "https://deno.land/std/testing/asserts.ts";
import {OsShell} from "./os_shell.ts";

Deno.test('OsShell.adjustArgs should add quotation marks around parameters with spaces', () => {
    const args = ['noSpaces', 'with spaces']

    const adjustedArgs = OsShell.adjustArgs(args)

    const expectedArgs = ['noSpaces', '"with spaces"']
    assertEquals(adjustedArgs, expectedArgs)
})
