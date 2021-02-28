import * as log from "https://deno.land/std/log/mod.ts";

export default class VersionNumber {
    // https://semver.org/#is-there-a-suggested-regular-expression-regex-to-check-a-semver-string
    private static readonly VER_REGEXP = /^(0|[1-9]\d*)\.(0|[1-9]\d*)\.(0|[1-9]\d*)(?:-((?:0|[1-9]\d*|\d*[a-zA-Z-][0-9a-zA-Z-]*)(?:\.(?:0|[1-9]\d*|\d*[a-zA-Z-][0-9a-zA-Z-]*))*))?(?:\+([0-9a-zA-Z-]+(?:\.[0-9a-zA-Z-]+)*))?$/

    public static isValid(strVersion: string): boolean {
        try {
            new VersionNumber(strVersion)
        } catch (error) {
            return false
        }

        return true
    }

    public readonly version: string
    public readonly major: number
    public readonly minor: number
    public readonly patch: number
    public readonly prerelease: string|undefined
    public readonly build: string|undefined

    constructor(strVersion: string) {
        const matches = strVersion.match(VersionNumber.VER_REGEXP)

        if (matches == null) {
            throw new Error(`Invalid version number - ${strVersion}`)
        }

        this.version = matches[0]
        this.major = Number.parseInt(matches[1])
        this.minor = Number.parseInt(matches[2])
        this.patch = Number.parseInt(matches[3])
        this.prerelease = matches[4]
        this.build = matches[5]
    }

    public static readonly OLDER = -1;
    public static readonly SAME = 0;
    public static readonly NEWER = 1;

    // SemVer - 11. Precedence - https://semver.org/#spec-item-11
    isOlderThan(other:VersionNumber): boolean {
        return this.compareTo(other) == VersionNumber.OLDER
    }

    isSameAs(other:VersionNumber): boolean {
        return this.compareTo(other) == VersionNumber.SAME
    }

    isNewerThan(other:VersionNumber): boolean {
        return this.compareTo(other) == VersionNumber.NEWER
    }

    compareTo(other: VersionNumber): number {
        const versionCompare = this.chainCompareTo(
            this, other, ['major', 'minor', 'patch']
        )

        // Is versionCompare enough?
        if (versionCompare != 0) {
            return versionCompare
        }

        return this.comparePrereleases(this.prerelease, other.prerelease)
    }

    private chainCompareTo(p1: any, p2: any, properties: string[]): number {
        for (const property of properties) {
            if (p1[property] < p2[property]) {
                return VersionNumber.OLDER
            }

            if (p1[property] > p2[property]) {
                return VersionNumber.NEWER
            }
        }

        return VersionNumber.SAME
    }

    private comparePrereleases(mine: string|undefined, other: string|undefined) : number {
        if (!mine && !other) {
            return VersionNumber.SAME
        }

        if (!mine && other) {
            return VersionNumber.NEWER
        }

        if (mine && !other) {
            return VersionNumber.OLDER
        }

        // We must compare the prereleases
        let myComponents = mine!.split('.')
        let otherComponents = other!.split('.')

        return this.chainCompareComponents(myComponents, otherComponents)
    }

    private chainCompareComponents(mine: string[], other: string[]): number {
        for (let i = 0; i < mine.length; i++) {
            if (i > other.length) {
                // 11.4.4. A larger set of pre-release fields has a higher precedence than a smaller set, if all of the preceding identifiers are equal.
                return VersionNumber.NEWER
            }

            function isNumeric(s: string): boolean {
                return s.match(/^d+$/) != null
            }

            const myComp = mine[i]
            const otherComp = other[i]

            if (isNumeric(myComp)) {
                const myNum = Number(myComp)
                if (isNumeric(otherComp)) {
                    const otherNum = Number(otherComp)
                    // 11.4.1. Identifiers consisting of only digits are compared numerically.
                    if (myNum > otherNum) {
                        return VersionNumber.NEWER
                    } else if (myNum < otherNum) {
                        return VersionNumber.NEWER
                    }
                } else {
                    // 11.4.3. Numeric identifiers always have lower precedence than non-numeric identifiers.
                    return VersionNumber.OLDER
                }
            } else {
                if (isNumeric(otherComp)) {
                    // 11.4.3. Numeric identifiers always have lower precedence than non-numeric identifiers.
                    return VersionNumber.NEWER
                }

                const compCompare = myComp.localeCompare(otherComp)
                if (compCompare != 0) {
                    return compCompare
                }
            }
        }

        if (other.length > mine.length) {
            // 11.4.4. A larger set of pre-release fields has a higher precedence than a smaller set, if all of the preceding identifiers are equal.
            return VersionNumber.OLDER
        }

        return VersionNumber.SAME
    }
}
