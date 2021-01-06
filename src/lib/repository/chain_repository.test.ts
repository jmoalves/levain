import {assertEquals} from "https://deno.land/std/testing/asserts.ts";

import Config from "../config.ts";
import ChainRepository from "./chain_repository.ts";
import MockRepository from "./mock_repository.ts";
import {MockPackage} from "../package/mock_package.ts";

Deno.test('chainRepo should have a name', async () => {
    const repo = await getTestRepo()

    assertEquals(repo.name, 'chainRepo for mockRepo1, mockRepo2')
})

Deno.test('chainRepo should list packages from repos', async () => {
    const repo = await getTestRepo()

    const packages = repo.packages
    const packageNames = packages.map(pkg => pkg.name)

    assertEquals(packageNames, ['package 1', 'package 2', 'package 3'])
})

async function getTestRepo() {
    const repoMock1 = new MockRepository('mockRepo1', [
        new MockPackage('package 1', '1.0.0'),
        new MockPackage('package 2', '2.0.0'),
    ])
    const repoMock2 = new MockRepository('mockRepo2', [
        new MockPackage('package 2', '2.2.2'),
        new MockPackage('package 3', '3.0.0'),
    ])
    const repo = new ChainRepository(new Config([]), [repoMock1, repoMock2])
    await repo.init()
    return repo
}
