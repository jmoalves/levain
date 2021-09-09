import {assertEquals, assertThrowsAsync,} from "https://deno.land/std/testing/asserts.ts";

import TestHelper from '../../lib/test/test_helper.ts';
import {MockPackage} from '../../lib/package/mock_package.ts';

import RemoveFromRegistry from './remove_from_registry.ts';

Deno.test('RemoveFromRegistry should remove package from registry', async () => {
    const registry = await TestHelper.getNewInitedTempRegistry()
    const pkg = TestHelper.getTestFilePackage();
    await registry.add(pkg)
    assertEquals(registry.size(), 1)
    const action = new RemoveFromRegistry(registry)

    await action.execute(new MockPackage(), [pkg.name])

    assertEquals(registry.size(), 0)
})
Deno.test('RemoveFromRegistry should throw when no package was passed as parameter', async () => {
    await assertThrowsAsync(
        async () => {
            const registry = await TestHelper.getNewInitedTempRegistry()
            const action = new RemoveFromRegistry(registry)

            await action.execute(new MockPackage(), [])
        },
        Error,
        'Action - removeFromRegistry - You should inform at least one package to be removed'
    )
})
Deno.test('RemoveFromRegistry should remove multiple packages', async () => {
    const registry = await TestHelper.getNewInitedTempRegistry()
    const pkg = TestHelper.getTestFilePackage();
    await registry.add(pkg)
    assertEquals(registry.size(), 1)
    const action = new RemoveFromRegistry(registry)

    await action.execute(new MockPackage(), [pkg.name, 'package not found'])

    assertEquals(registry.size(), 0)
})
