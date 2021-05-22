import {assertEquals} from "https://deno.land/std/testing/asserts.ts";

import Config from "../config.ts";

import AbstractRepository from "./abstract_repository.ts";
import Package from '../package/package.ts';

class TestRepository extends AbstractRepository {
    get name(): string {
        return 'TestRepository'
    }

    get packages(): Array<Package> {
        console.log("packages()")
        return [];
    }

    get absoluteURI(): string {
        return 'URI'
    }

    init(): void {
    }

    invalidatePackages(): void {
    }

    listPackages(): Array<Package> {
        return this.packages
    }

    resolvePackage(packageName: string): Package | undefined {
        return undefined
    }
}

Deno.test('AbstractRepository - packages must work', async () => {
    const repo = new TestRepository();
    assertEquals(repo.packages, [])
})
