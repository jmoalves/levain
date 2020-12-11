import Registry from './registry.ts';
import {assertEquals, assertThrows,} from "https://deno.land/std/testing/asserts.ts";
import TestHelper from '../test/test_helper.ts';
import {ensureDirSync} from "https://deno.land/std/fs/mod.ts";
import FileSystemPackage from '../package/file_system_package.ts';

Deno.test('should start empty', () => {
    const registry = getNewTempRegistry()
    try {
        ensureDirSync(registry.rootDir)

        assertEquals(registry.length, 0)
        assertEquals(registry.packages, [])
    } finally {
        Deno.removeSync(registry.rootDir)
    }
})

//
// addPackage
//
Deno.test('should throw when package file does not exist', () => {
    const registry = getNewTempRegistry()
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
Deno.test('should add package', () => {
    const registry = getNewTempRegistry()
    try {
        ensureDirSync(registry.rootDir)
        const pkg = TestHelper.getTestFilePackage()
        assertEquals(registry.length, 0)

        registry.add(pkg)
 
        const pkgNames = registry.packages
            .map(it => (it as FileSystemPackage).fileName);
        assertEquals(pkgNames, [pkg.fileName])
    } finally {
        Deno.removeSync(registry.rootDir, {recursive: true})
    }
})

function getNewTempRegistry(): Registry {
    return new Registry(
        TestHelper.getConfig(),
        Deno.makeTempDirSync()
    );
}
