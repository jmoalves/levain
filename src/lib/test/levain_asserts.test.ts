import MockRepository from "../repository/mock_repository.ts";
import LevainAsserts from "./levain_asserts.ts";
import {assertThrows,} from "https://deno.land/std/assert/mod.ts";

Deno.test('LevainAsserts.assertPackageNames should sort packages', async () => {
    const repo = new MockRepository()
    await repo.init()
    const packages = repo.listPackages()

    const expectedPackageNames = ['aPackage', 'anotherPackage',]
    LevainAsserts.assertPackageNames(packages, expectedPackageNames)
})
Deno.test('LevainAsserts.assertContainsPackageNames should assert a package name is in a list', async () => {
    const repo = new MockRepository()
    await repo.init()
    const packages = repo.listPackages()

    const expectedPackageNames = ['aPackage']
    LevainAsserts.assertContainsPackageNames(packages, expectedPackageNames)
})
Deno.test('LevainAsserts.assertContainsPackageNames should fail if a package name is not in a list', async () => {
    const repo = new MockRepository()
    await repo.init()
    const packages = repo.listPackages()

    const expectedPackageNames = ['aPackage', 'thisPackageDoesNotExist']

    assertThrows(
        () => {
            LevainAsserts.assertContainsPackageNames(packages, expectedPackageNames)
        },
        Error,
    )
})
