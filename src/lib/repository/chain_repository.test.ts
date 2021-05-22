import {assertEquals} from "https://deno.land/std/testing/asserts.ts";

import Config from "../config.ts";
import {MockPackage} from "../package/mock_package.ts";

import ChainRepository from "./chain_repository.ts";
import MockRepository from "./mock_repository.ts";
import VersionNumber from "../utils/version_number.ts";
import Repository from "./repository.ts";

Deno.test('ChainRepository should have a name', async () => {
    const repo = await getRepo()

    assertEquals(repo.name, 'chainRepo for mockRepo1, mockRepo2')
})

Deno.test('ChainRepository should list packages from repos', async () => {
    const repo = await getRepo()

    const packages = repo.listPackages()

    const packageNames = packages.map(pkg => pkg.name)
    assertEquals(packageNames, ['package 1', 'package 2', 'package 3'])

    const packageVersions = packages.map(pkg => pkg?.version?.versionNumber)
    assertEquals(packageVersions, ['1.0.0', '2.0.0', '3.0.0'])
})

Deno.test('ChainRepository should resolve package by name', async () => {
    // Given
    const repo = await getRepo()
    // When
    const pkg = repo.resolvePackage('package 2')
    // Then
    assertEquals(pkg?.name, 'package 2')
    assertEquals(pkg?.version.versionNumber, '2.0.0')
})

Deno.test('ChainRepository should resolve package that only exists in second repository', async () => {
    // Given
    const repo = await getRepo()
    // When
    const pkg = repo.resolvePackage('package 3')
    // Then
    assertEquals(pkg?.name, 'package 3')
    assertEquals(pkg?.version.versionNumber, '3.0.0')
})

async function getRepo(): Promise<Repository> {
    const repoMock1 = new MockRepository('mockRepo1', [
        new MockPackage('package 1', new VersionNumber('1.0.0')),
        new MockPackage('package 2', new VersionNumber('2.0.0')),
    ])
    const repoMock2 = new MockRepository('mockRepo2', [
        new MockPackage('package 2', new VersionNumber('2.2.2')),
        new MockPackage('package 3', new VersionNumber('3.0.0')),
    ])
    const repo = new ChainRepository(new Config([]), [repoMock1, repoMock2])
    await repo.init()
    return repo
}
