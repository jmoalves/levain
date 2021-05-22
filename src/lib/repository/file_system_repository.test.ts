import {assert, assertEquals, assertNotEquals, assertThrowsAsync,} from "https://deno.land/std/testing/asserts.ts";

import Config from "../config.ts";
import FileSystemPackage from "../package/file_system_package.ts";
import {assertArrayContainsInAnyOrder} from '../test/more_asserts.ts';

import FileSystemRepository from "./file_system_repository.ts";
import Repository from "./repository.ts";

Deno.test('FileSystemRepository should have a name', () => {
    const repo = new FileSystemRepository(new Config([]), '.')

    assertEquals(repo.name, 'fileSystemRepo (.)')
})

//
// List
//
Deno.test({
    name: 'FileSystemRepository should throw an error when root folder does not exist',
    // only: true,
    fn: async () => {

        await assertThrowsAsync(
            async () => {
                const repo = getRepo('thisFolderDoesNotExist')
                await repo.init()
            },
            Error,
            'addRepo - dir not found: thisFolderDoesNotExist',
        )
    },
})

Deno.test({
    name: 'FileSystemRepository should list packages from an empty dir',
    // only: true,
    fn: async () => {
        const repo = getRepo('testdata/file_system_repo/empty')
        await repo.init()
        const packagesFound = repo.listPackages()
        assertEquals([], packagesFound)
    },
})

Deno.test('FileSystemRepository should list .yml and .yaml packages, and include subfolder', () => {
    const repo = getRepo()

    const packages = repo.listPackages()

    const packageNames = packages.map(pkg => pkg.name)
    assertArrayContainsInAnyOrder(packageNames, ['amazingYml', 'awesomeYaml', 'insideSubfolder'])
})

Deno.test('FileSystemRepository should ignore node_modules', () => {
    const repo = getRepo()

    const packages = repo.listPackages()

    const packageNames = packages.map(pkg => pkg.name)
    assert(!packageNames.includes('hidden-by-folder'))
})

Deno.test('FileSystemRepository should list FileSystemPackages', () => {
    const repo = getRepo()

    const packages = repo.listPackages()

    assertNotEquals(0, packages?.length, 'packages should not be empty')
    packages.forEach(pkg => assert(pkg instanceof FileSystemPackage))
})

//
// resolvePackage
//
Deno.test('FileSystemRepository should resolve package by name', () => {
    const repo = getRepo()

    const pkg = repo.resolvePackage('amazingYml')

    assert(pkg instanceof FileSystemPackage)
    assertEquals(pkg.name, 'amazingYml')
})

Deno.test('FileSystemRepository should resolve package that does not exists as undefined', () => {
    const repo = getRepo()

    const pkg = repo.resolvePackage('--this-package-does-not-exist--')

    assertEquals(pkg, undefined)
})

function getRepo(rootDir: string = './testdata/file_system_repo/testRepo'): Repository {
    return new FileSystemRepository(new Config([]), rootDir)
}
