import Package from "../package/package.ts";
import {assertEquals} from "https://deno.land/std/assert/mod.ts";
import {assertArrayIncludesElements} from "./more_asserts.ts";

export default class LevainAsserts {

    static assertPackageNames(packages: Array<Package>, expectedPackageNames: string[]): void {
        const packageNames = packages.map(pkg => pkg.name).sort()
        const sortedExpectedPackageNames = expectedPackageNames.sort()
        assertEquals(packageNames, sortedExpectedPackageNames)
    }

    static assertContainsPackageNames(packages: Array<Package>, expectedPackageNames: string[]): void {
        const packageNames = packages.map(pkg => pkg.name).sort()
        assertArrayIncludesElements(packageNames, expectedPackageNames)
    }
}
