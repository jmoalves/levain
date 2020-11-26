import {assert, assertEquals} from "https://deno.land/std/testing/asserts.ts";
import Config from "../config.ts";
import FileSystemRepository from "./file_system_repository.ts";
import FileSystemPackage from "../package/file_system_package.ts";
import {OsShell} from '../shellUtils.ts';
import {assertArrayIncludesElements} from '../assert_utils.ts';

Deno.test('should have a name', () => {
    const repo = new FileSystemRepository(new Config([]), '.')

    assertEquals(repo.name, 'fileSystemRepo for .')
})

//
// List
//
Deno.test('should list packages when root folder does not exist', () => {
    const repo = getTestRepo('thisFolderDoesNotExist')

    assertEquals(repo.packages, [])
})

Deno.test('should list .yml and .yaml packages, and include subfolder', () => {
    const repo = getTestRepo()

    const packages = repo.packages

    const packageNames = packages.map(pkg => pkg.name)
    assertEquals(packageNames, ['amazingYml', 'awesomeYaml', 'insideSubfolder'])
})

Deno.test('should ignore node_modules', () => {
    const repo = getTestRepo()

    const packages = repo.packages

    const packageNames = packages.map(pkg => pkg.name)
    assert(!packageNames.includes('hidden-by-folder'))
})

Deno.test('should list FileSystemPackages', () => {
    const repo = getTestRepo()

    const packages = repo.packages
    packages.forEach(pkg => assert(pkg instanceof FileSystemPackage))
})

if (OsShell.isWindows()) {
    const networkRootDir: string = '\\\\bndes.net\\bndes\\Grupos\\AmbienteDesenvolvedor\\bnd-levain-pkg';
    Deno.test('should list network packages', () => {
        const repo = getTestRepo(networkRootDir)

        const packages = repo.packages

        const packageNames = packages.map(pkg => pkg.name)
        assertArrayIncludesElements<string>(packageNames, ['bje-config', 'bndes-java-env'])
    })

    Deno.test('should crawl windows network packages', () => {
        const repo = getTestRepo(networkRootDir)

        const packages = repo.crawlPackages(networkRootDir, {})

        const packageNames = packages.map(pkg => pkg.name)

        assertArrayIncludesElements(packageNames, ['bje-config', 'bndes-java-env'])
    })
}
//
// resolvePackage
//
Deno.test('should resolve package by name', () => {
    const repo = getTestRepo()

    const pkg = repo.resolvePackage('amazingYml')

    assert(pkg instanceof FileSystemPackage)
    assertEquals(pkg.name, 'amazingYml')
})

Deno.test('should resolve package that does not exists as undefined', () => {
    const repo = getTestRepo()

    const pkg = repo.resolvePackage('--this-package-does-not-exist--')

    assertEquals(pkg, undefined)
})

function getTestRepo(rootDir: string = './testdata/testRepo') {
    return new FileSystemRepository(new Config([]), rootDir)
}
