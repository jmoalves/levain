import {
    assert,
    assertEquals,
    assertMatch,
    assertNotEquals,
    assertRejects
} from "https://deno.land/std/assert/mod.ts";
import * as path from "https://deno.land/std/path/mod.ts";
import {ensureDirSync} from "https://deno.land/std/fs/mod.ts";

import Config from "../config.ts";
import FileSystemPackage from "../package/file_system_package.ts";
import {assertArrayEqualsInAnyOrder} from '../test/more_asserts.ts';

import FileSystemRepository from "./file_system_repository.ts";

const rootDir = '.';
Deno.test('FileSystemRepository should have a name', () => {
    const repo = getRepo(rootDir)

    assertEquals(repo.name, 'FileSystemRepo')
})
Deno.test('FileSystemRepository should have a rootDir', () => {
    const repo: FileSystemRepository = getRepo(rootDir)

    assertEquals(repo.rootDir, rootDir)
})
Deno.test('FileSystemRepository should have a absoluteURI', () => {
    const repo = getRepo(rootDir)

    assertNotEquals(repo.absoluteURI, rootDir)
    assertMatch(repo.absoluteURI || '', /\w+/)
})
Deno.test('FileSystemRepository.describe should include absoluteURI and rootDir when different', () => {
    const repo = getRepo(rootDir)
    assertMatch(
        repo.describe(), 
        RegExp(
            `FileSystemRepo (${(repo.absoluteURI)} .* ${rootDir})`
            .replaceAll('\\', '\\\\')
            .replaceAll('(', '\\(')
            .replaceAll(')', '\\)')
        )
    )
})
Deno.test('FileSystemRepository.describe should not repeat absoluteURI when equal to rootDir', () => {
    const absoluteURI = path.resolve(rootDir)
    const repo = getRepo(absoluteURI)

    assertEquals(repo.describe(), `FileSystemRepo (${absoluteURI})`)
})
Deno.test({
    name: 'FileSystemRepository should throw an error when root folder does not exist',
    fn: async () => {

        await assertRejects(
            async () => {
                await getInitedRepo('thisFolderDoesNotExist')
            },
            Error,
            'addRepo - dir not found: thisFolderDoesNotExist',
        )
    },
})
//
// List
//
Deno.test({
    name: 'FileSystemRepository should list packages from an empty dir',
    fn: async () => {
        const emptyRepo = 'testdata/file_system_repo/empty'
        ensureDirSync(emptyRepo)
        const repo = await getInitedRepo(emptyRepo)
        const packagesFound = repo.listPackages()
        assertEquals([], packagesFound)
    },
})
Deno.test('FileSystemRepository should list .yml and .yaml packages, and include subfolder', async () => {
    const repo = await getInitedRepo()

    const packages = repo.listPackages()

    const packageNames = packages.map(pkg => pkg.name)
    assertArrayEqualsInAnyOrder(packageNames, ['amazingYml', 'awesomeYaml', 'beatifulLevain', 'insideSubfolder'])
})
Deno.test('FileSystemRepository should optionally list only root', async () => {
    const repo = await getInitedRepo(undefined, true)

    const packages = repo.listPackages()

    const packageNames = packages.map(pkg => pkg.name)
    assertArrayEqualsInAnyOrder(packageNames, ['amazingYml', 'awesomeYaml', 'beatifulLevain'])
})

Deno.test('FileSystemRepository should ignore node_modules', async () => {
    const repo = await getInitedRepo()

    const packages = repo.listPackages()

    const packageNames = packages.map(pkg => pkg.name)
    assert(!packageNames.includes('hidden-by-folder'))
})

Deno.test('FileSystemRepository should list FileSystemPackages', async () => {
    const repo = await getInitedRepo()

    const packages = repo.listPackages()

    assertNotEquals(0, packages?.length, 'packages should not be empty')
    packages.forEach(pkg => assert(pkg instanceof FileSystemPackage))
})

//
// resolvePackage
//
Deno.test('FileSystemRepository should resolve package by name', async () => {
    const repo = await getInitedRepo()

    const pkg = repo.resolvePackage('amazingYml')

    assert(pkg instanceof FileSystemPackage)
    assertEquals(pkg.name, 'amazingYml')
})

Deno.test('FileSystemRepository should resolve package that does not exists as undefined', async () => {
    const repo = await getInitedRepo()

    const pkg = repo.resolvePackage('--this-package-does-not-exist--')

    assertEquals(pkg, undefined)
})

async function getInitedRepo(rootDir?: string, rootDirOnly?: boolean): Promise<FileSystemRepository> {
    const repo = getRepo(rootDir, rootDirOnly)
    await repo.init()
    return repo
}

function getRepo(rootDir: string = './testdata/file_system_repo/testRepo', rootOnly: boolean = false): FileSystemRepository {
    const config = new Config();
    return new FileSystemRepository(config, rootDir, rootOnly)
}
