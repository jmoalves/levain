import {assertEquals} from "https://deno.land/std/testing/asserts.ts";

import Config from "../config.ts";

import CacheRepository from "./cache_repository.ts";
import MockRepository from "./mock_repository.ts";
import Repository from "./repository.ts";

Deno.test('CacheRepository should have a name', async () => {
    const repo = await getRepo()

    assertEquals(repo.name, 'cacheRepo for mockRepo')
})

Deno.test('CacheRepository should list packages from cached repo', async () => {
    const repo = await getRepo()

    const packages = repo.listPackages()
    const packageNames = packages.map(pkg => pkg.name)

    assertEquals(packageNames, ['aPackage', 'anotherPackage'])
})

Deno.test('CacheRepository should resolve package by name', async () => {
    // Given
    const repo = await getRepo()
    // When
    const pkg = repo.resolvePackage('anotherPackage')
    // Then
    assertEquals(pkg?.name, 'anotherPackage')
})

async function getRepo(): Promise<Repository> {
    let repo = new CacheRepository(new Config([]), new MockRepository())
    await repo.init()
    return repo
}
