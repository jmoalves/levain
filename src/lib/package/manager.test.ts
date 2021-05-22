import {assertEquals} from "https://deno.land/std/testing/asserts.ts";

import PackageManager from "./manager.ts";
import TestHelper from "../test/test_helper.ts";
import MockRepository from "../repository/mock_repository.ts";
import {MockPackage} from "./mock_package.ts";
import VersionNumber from "../utils/version_number.ts";

Deno.test('Managers should resolve empty packages list', () => {
    // Given
    const config = TestHelper.getConfig()
    const manager = new PackageManager(config)
    // When
    const resolvedPackages = manager.resolvePackages([])
    // Then
    assertEquals(resolvedPackages, [])
})

Deno.test('Managers should resolve packages without dependencies', () => {
    // Given
    const config = getConfigWithMockRepo()
    const manager = new PackageManager(config)
    // When
    const resolvedPackages = manager.resolvePackages(['package without dependencies'])
    // Then
    let packageNames = resolvedPackages?.map(it => it.name)
    assertEquals(packageNames, ['package without dependencies'])
})

Deno.test('Managers should resolve packages with 1 dependency', () => {
    // Given
    const config = getConfigWithMockRepo()
    const manager = new PackageManager(config)
    // When
    const resolvedPackages = manager.resolvePackages(['package with a dependency'])
    // Then
    let packageNames = resolvedPackages?.map(it => it.name)
    assertEquals(packageNames, ['a dependency', 'package with a dependency',])
})

Deno.test('Managers should resolve packages with a transitive dependency', () => {
    // Given
    const config = getConfigWithMockRepo()
    const manager = new PackageManager(config)
    // When
    const resolvedPackages = manager.resolvePackages(['package with a transitive dependency'])
    // Then
    let packageNames = resolvedPackages?.map(it => it.name)
    assertEquals(packageNames, ['transitive dependency', 'dependency with transitive', 'package with a transitive dependency',])
})

function getConfigWithMockRepo() {
    const config = TestHelper.getConfig();
    const repoMock = new MockRepository('mockRepo1', [
        new MockPackage('package without dependencies', new VersionNumber('1.0.0')),

        new MockPackage('package with a dependency', new VersionNumber('2.0.0'), 'mockPath',
            ['a dependency']
        ),
        new MockPackage('a dependency', new VersionNumber('2.0.0')),

        new MockPackage('package with a transitive dependency', new VersionNumber('2.0.0'), 'mockPath',
            ['dependency with transitive']
        ),
        new MockPackage('dependency with transitive', new VersionNumber('2.0.0'), 'mockPath',
            ['transitive dependency']),
        new MockPackage('transitive dependency', new VersionNumber('2.0.0')),
    ])
    config.repositoryManager.repository = repoMock
    return config
}

