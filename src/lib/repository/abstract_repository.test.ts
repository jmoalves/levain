import {assertEquals} from "https://deno.land/std/testing/asserts.ts";

import AbstractRepository from "./abstract_repository.ts";
import Package from '../package/package.ts';

class TestRepository extends AbstractRepository {
    get name(): string {
        return 'TestRepository'
    }

    listPackages(): Array<Package> {
        console.log("packages()")
        return []
    }

    get absoluteURI(): string {
        return 'URI'
    }

    async init(): Promise<void> {
        return
    }

    invalidatePackages(): void {
    }

    readPackages(): Array<Package> {
        return []
    }

    resolvePackage(packageName: string): Package | undefined {
        return undefined
    }
}

Deno.test('AbstractRepository - packages must work', async () => {
    const repo = new TestRepository();
    assertEquals(repo.listPackages(), [])
})
