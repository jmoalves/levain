import {assertEquals, assertRejects,} from "https://deno.land/std/testing/asserts.ts";
import * as path from "https://deno.land/std/path/mod.ts";

import Config from "../config.ts";
import ZipRepository from "./zip_repository.ts";
import LevainAsserts from "../test/levain_asserts.ts";
import Repository from "./repository.ts";

Deno.test('ZipRepository should have a name', () => {
    const repo = getRepo()

    assertEquals(repo.name, 'ZipRepo')
})
const rootUri = './testdata/zip_repository/zipRepo.zip';
Deno.test('ZipRepository should have a rootDir', () => {
    const repo = getRepo()

    assertEquals(repo.rootUrl, rootUri)
})
Deno.test('ZipRepository should have a absoluteURI', () => {
    const repo = getRepo()
    const absoluteURI = path.resolve(rootUri)

    assertEquals(repo.absoluteURI || '', absoluteURI)
})
Deno.test('ZipRepository should have a description', () => {
    const repo = getRepo()

    assertEquals(repo.describe(), `ZipRepo (${repo.absoluteURI} resolved from ./testdata/zip_repository/zipRepo.zip)`)
})
Deno.test({
    name: 'ZipRepository should throw an error when root folder does not exist',
    // only: true,
    fn: async () => {
        const absoluteURI = path.resolve('thisFolderDoesNotExist')

        await assertRejects(
            async () => {
                const repo = await getRepo('thisFolderDoesNotExist')
                await repo.init()
            },
            Error,
            `Zip not found: ${absoluteURI} resolved from thisFolderDoesNotExist`,
        )
    },
})
//
// List
//
Deno.test('ZipRepository should list packages from files system zip', async () => {
    const repo = await getInitedRepo()

    const packages = repo.listPackages()

    LevainAsserts.assertPackageNames(packages, [
        'reciepe-in-a-zip',
        'reciepe-in-a-folder-in-a-zip'
    ])
})
Deno.test('ZipRepository should list packages from a zip url', async () => {
    // FIXME is this test really working?
    const repo = await getInitedRepo('https://github.com/jmoalves/levain/tree/master/testdata/zip_repository/zipRepo.zip')

    const packages = repo.listPackages()

    LevainAsserts.assertPackageNames(packages, [
        'reciepe-in-a-zip',
        'reciepe-in-a-folder-in-a-zip'
    ])
})

async function getInitedRepo(rootDir: string = './testdata/zip_repository/zipRepo.zip'): Promise<Repository> {
    const repo = getRepo(rootDir)
    await repo.init()
    return repo
}

function getRepo(rootDir: string = rootUri) {
    return new ZipRepository(new Config([]), rootDir)
}

