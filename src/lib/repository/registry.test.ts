import {ensureDirSync} from "https://deno.land/std/fs/mod.ts";
import {assertEquals, assertThrows,} from "https://deno.land/std/testing/asserts.ts";

import TestHelper from '../test/test_helper.ts';
import FileSystemPackage from '../package/file_system_package.ts';

Deno.test('Registry should start empty', () => {
    const registry = TestHelper.getNewTempRegistry()
    try {
        ensureDirSync(registry.rootDir)

        assertEquals(registry.size(), 0)
        assertEquals(registry.listPackages(), [])
    } finally {
        Deno.removeSync(registry.rootDir)
    }
})
//
// addPackage
//
Deno.test('Registry should throw when package file does not exist', () => {
    const registry = TestHelper.getNewTempRegistry()
    try {
        ensureDirSync(registry.rootDir)
        const pkg = TestHelper.getTestFilePackage('fileThatDoesNotExist.levain.yaml')
        assertThrows(
            () => {
                registry.add(pkg)
            },
            Error,
            `Cannot find package ${pkg.fullPath}`,
        )
    } finally {
        Deno.removeSync(registry.rootDir)
    }
})

Deno.test('Registry should add package', () => {

    const registry = TestHelper.getNewTempRegistry()
    try {
        ensureDirSync(registry.rootDir)
        const pkg = TestHelper.getTestFilePackage()
        assertEquals(registry.size(), 0)

        registry.add(pkg)

        const pkgNames = registry.listPackages()
            .map(it => (it as FileSystemPackage).fileName);
        assertEquals(pkgNames, [pkg.fileName])
    } finally {
        Deno.removeSync(registry.rootDir, {recursive: true})
    }
})

Deno.test('Registry should remove package', () => {
    const registry = TestHelper.getNewTempRegistry()
    try {
        ensureDirSync(registry.rootDir)
        const pkg = TestHelper.getTestFilePackage()
        registry.add(pkg)
        assertEquals(registry.size(), 1)

        registry.remove(pkg.name)
        assertEquals(registry.size(), 0)
    } finally {
        Deno.removeSync(registry.rootDir, {recursive: true})
    }
})
