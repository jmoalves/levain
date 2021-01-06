import {assertEquals} from "https://deno.land/std/testing/asserts.ts";
import CacheRepository from "./cache_repository.ts";
import Config from "../config.ts";
import MockRepository from "./mock_repository.ts";

Deno.test('cacheRepo should have a name', async () => {
    const repo = await getTestRepo()

    assertEquals(repo.name, 'cacheRepo for mockRepo')
})

Deno.test('cacheRepo should list packages from cached repo', async () => {
    const repo = await getTestRepo()

    const packages = repo.packages
    const packageNames = packages.map(pkg => pkg.name)

    assertEquals(packageNames, ['aPackage', 'anotherPackage'])
})

async function getTestRepo() {
    let repo = new CacheRepository(new Config([]), new MockRepository())
    await repo.init()
    return repo
}
