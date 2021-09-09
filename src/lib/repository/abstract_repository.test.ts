import MockRepository from "./mock_repository.ts";
import LevainAsserts from "../test/levain_asserts.ts";
import {assertThrows} from "https://deno.land/std/testing/asserts.ts";


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
        'Please init repository mockRepo before listing packages'
    )
})
