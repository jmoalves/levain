import MockRepository from "./mock_repository.ts";
import {MockPackage} from "../package/mock_package.ts";
import VersionNumber from "../utils/version_number.ts";

import {assertEquals} from "https://deno.land/std/testing/asserts.ts";
import Repositories from "./repositories.ts";

const repoMock1 = new MockRepository('mockRepo1', [
    new MockPackage('package 1', new VersionNumber('1.0.0')),
    new MockPackage('package 2', new VersionNumber('2.0.0')),
])
const repoMock2 = new MockRepository('mockRepo2', [
    new MockPackage('package 2', new VersionNumber('2.2.2')),
    new MockPackage('package 3', new VersionNumber('3.0.0')),
])

Deno.test('Repositories.uniqueRepositories should remove duplicate repositories', () => {
    const repositories = new Repositories()
    repositories.regular = repoMock1
    repositories.installed = repoMock2
    repositories.currentDir = repoMock1

    const uniqueRepos = repositories.uniqueRepositories()
    const uniqueRepoNames = uniqueRepos.map(repositories => repositories.name)
    assertEquals(uniqueRepoNames, ['mockRepo1', 'mockRepo2'])
})
Deno.test('Repositories.describe should humanize repositories', () => {
    const repositories = new Repositories()
    repositories.regular = repoMock1
    repositories.installed = repoMock2
    repositories.currentDir = repoMock1
    
    assertEquals(
        repositories.describe(),
        'currentDir: mockRepo1 for mockURI mockRepo1\n' +
        'installed: mockRepo2 for mockURI mockRepo2\n' +
        'regular: mockRepo1 for mockURI mockRepo1\n'
    )
})
