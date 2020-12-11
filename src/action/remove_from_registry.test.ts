import TestHelper from '../lib/test/test_helper.ts';
import {assertEquals, assertThrowsAsync,} from "https://deno.land/std/testing/asserts.ts";
import RemoveFromRegistry from './remove_from_registry.ts';
import {MockPackage} from '../lib/package/mock_package.ts';

Deno.test('should remove package from registry', async () => {
    const registry = TestHelper.getNewTempRegistry()
    const pkg = TestHelper.getTestFilePackage();
    registry.add(pkg)
    assertEquals(registry.length, 1)
    const action = new RemoveFromRegistry(registry)

    await action.execute(new MockPackage(), [pkg.name])

    assertEquals(registry.length, 0)
})
Deno.test('should throw when no package was added', async () => {
    await assertThrowsAsync(
        async () => {
            const registry = TestHelper.getNewTempRegistry()
            const action = new RemoveFromRegistry(registry)

            await action.execute(new MockPackage(), [])
        },
        Error,
        'Action - removeFromRegistry - You should inform at least one package to be removed'
    )
})
Deno.test('should remove multiple packages', async () => {
    const registry = TestHelper.getNewTempRegistry()
    const pkg = TestHelper.getTestFilePackage();
    registry.add(pkg)
    assertEquals(registry.length, 1)
    const action = new RemoveFromRegistry(registry)

    await action.execute(new MockPackage(), [pkg.name, 'package not found'])

    assertEquals(registry.length, 0)
})
