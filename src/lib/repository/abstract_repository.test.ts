import MockRepository from "./mock_repository.ts";
import LevainAsserts from "../test/levain_asserts.ts";
import {assertEquals, assertThrows} from "https://deno.land/std/assert/mod.ts";


Deno.test('AbstractRepository.listPackages should return a list of packages', async () => {
    const repo = new MockRepository()
    await repo.init()
    const packages = repo.listPackages()

    const expectedPackageNames = ['aPackage', 'anotherPackage',]
    LevainAsserts.assertPackageNames(packages, expectedPackageNames)
})
Deno.test('AbstractRepository should throw error when listing before init', () => {
    const repo = new MockRepository()
    assertThrows(
        () => {
            repo.listPackages()
        },
        Error,
        'Please init repository MockRepo (mockURI-MockRepo) before listing packages'
    )
})
Deno.test('AbstractRepository.initialized should reflect if packages are valid', async () => {
    const repo = new MockRepository()
    assertEquals(repo.initialized(), false)

    await repo.init()
    assertEquals(repo.initialized(), true)
})
