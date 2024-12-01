import {ensureDirSync} from "jsr:@std/fs";
import {assertEquals, assertRejects,} from "jsr:@std/assert";

import TestHelper from '../test/test_helper.ts';
import FileSystemPackage from '../package/file_system_package.ts';

Deno.test('Registry should start empty', async () => {
    const registry = await TestHelper.getNewInitedTempRegistry()
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
Deno.test('Registry should throw when package file does not exist', async () => {
    const registry = await TestHelper.getNewInitedTempRegistry()
    try {
        ensureDirSync(registry.rootDir)
        const pkg = TestHelper.getTestFilePackage('fileThatDoesNotExist.levain.yaml')
        await assertRejects(
            async () => {
                await registry.add(pkg)
            },
            Error,
            `Cannot find package ${pkg.fullPath}`,
        )
    } finally {
        Deno.removeSync(registry.rootDir)
    }
})

Deno.test('Registry should add package', async () => {

    const registry = await TestHelper.getNewInitedTempRegistry()

    try {
        ensureDirSync(registry.rootDir)
        const pkg = TestHelper.getTestFilePackage()
        assertEquals(registry.size(), 0)

        await registry.add(pkg)

        const pkgNames = registry.listPackages()
            .map(it => (it as FileSystemPackage).fileName);
        assertEquals(pkgNames, [pkg.fileName])
    } finally {
        Deno.removeSync(registry.rootDir, {recursive: true})
    }
})

Deno.test('Registry should remove package', async () => {
    const registry = await TestHelper.getNewInitedTempRegistry()
    try {
        ensureDirSync(registry.rootDir)
        const pkg = TestHelper.getTestFilePackage()
        await registry.add(pkg)
        assertEquals(registry.size(), 1)

        await registry.remove(pkg.name)
        assertEquals(registry.size(), 0)
    } finally {
        Deno.removeSync(registry.rootDir, {recursive: true})
    }
})
