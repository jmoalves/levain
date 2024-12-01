import {assertEquals,} from "jsr:@std/assert";

import TestHelper from '../test/test_helper.ts';

//
// skipRegistry
//
Deno.test('should not skipRegistry if not declared', () => {
    const pkg = TestHelper.getTestPkg('')

    assertEquals(pkg.skipRegistry(), false)
})
Deno.test('should skipRegistry', () => {
    const pkg = TestHelper.getTestPkg(
        'levain.pkg.skipRegistry: true'
    )

    assertEquals(pkg.skipRegistry(), true)
})
Deno.test('should not skipRegistry', () => {
    const pkg = TestHelper.getTestPkg(
        'levain.pkg.skipRegistry: false'
    )

    assertEquals(pkg.skipRegistry(), false)
})
//
// skipInstallDir
//
Deno.test('should not skipInstallDir if not declared', () => {
    const pkg = TestHelper.getTestPkg('')

    assertEquals(pkg.skipInstallDir(), false)
})
Deno.test('should skipInstallDir', () => {
    const pkg = TestHelper.getTestPkg(
        'levain.pkg.skipInstallDir: true'
    )

    assertEquals(pkg.skipInstallDir(), true)
})
Deno.test('should not skipInstallDir', () => {
    const pkg = TestHelper.getTestPkg(
        'levain.pkg.skipInstallDir: false'
    )

    assertEquals(pkg.skipInstallDir(), false)
})

