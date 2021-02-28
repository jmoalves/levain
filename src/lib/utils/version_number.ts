import * as log from "https://deno.land/std/log/mod.ts";

export default class VersionNumber {
    public static readonly VER_REGEXP = /^[0-9A-Za-z\._\-]+$/
    public static readonly COMPONENT_SEPARATOR = '-'
    public static readonly ELEMENT_SEPARATOR = '.'

    public static isValid(strVersion: string): boolean {
        try {
            new VersionNumber(strVersion)
        } catch (error) {
            return false
        }

        return true
    }


    public readonly isHEAD: boolean

    constructor(public readonly version: string) {
        const matches = version.match(VersionNumber.VER_REGEXP)
        if (matches == null) {
            throw new Error(`Invalid version number - ${version}`)
        }

        if (version == "HEAD" || version == "vHEAD") {
            this.isHEAD = true            
        } else {
            this.isHEAD = false
        }
    }

    toString(): string {
        return this.version
    }

    public static readonly OLDER = -1
    public static readonly SAME = 0
    public static readonly NEWER = 1

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
        // Compare HEAD versions
        if (this.isHEAD && other.isHEAD) {
            return VersionNumber.SAME
        }

        if (this.isHEAD && !other.isHEAD) {
            return VersionNumber.NEWER
        }

        if (!this.isHEAD && other.isHEAD) {
            return VersionNumber.OLDER
        }

        const myComponents = this.version.split(VersionNumber.COMPONENT_SEPARATOR)
        const otherComponents = other.version.split(VersionNumber.COMPONENT_SEPARATOR)

        return this.chainCompareComponents(myComponents, otherComponents)
    }

    private chainCompareComponents(mine: string[], other: string[]): number {
        // log.info(`Components = mine: ${mine} - other: ${other}`)
        for (let i = 0; i < mine.length; i++) {
            if (i >= other.length) {
                // 11.4.4. A larger set of pre-release fields has a higher precedence than a smaller set, if all of the preceding identifiers are equal.

                // However... We must check if we are dealing with de MAJOR.MINOR.PATCH component (the first one)
                if (i == 1) {
                    return VersionNumber.OLDER
                } else {
                    return VersionNumber.NEWER
                }
            }

            const myElements = mine[i].split(VersionNumber.ELEMENT_SEPARATOR)
            const otherElements = other[i].split(VersionNumber.ELEMENT_SEPARATOR)
            const elementCompare = this.chainCompareElements(myElements, otherElements)

            if (elementCompare != VersionNumber.SAME) {
                return elementCompare
            }
        }

        if (other.length > mine.length) {
            // 11.4.4. A larger set of pre-release fields has a higher precedence than a smaller set, if all of the preceding identifiers are equal.

            // However... We must check if we are dealing with de MAJOR.MINOR.PATCH component (the first one)
            if (mine.length == 1) {
                return VersionNumber.NEWER
            } else {
                return VersionNumber.OLDER
            }
        }

        return VersionNumber.SAME        
    }

    private chainCompareElements(mine: string[], other: string[]): number {
        // log.info(`Elements = mine: ${mine} - other: ${other}`)
        for (let i = 0; i < mine.length; i++) {
            if (i >= other.length) {
                // 11.4.4. A larger set of pre-release fields has a higher precedence than a smaller set, if all of the preceding identifiers are equal.
                return VersionNumber.NEWER
            }

            function isNumeric(s: string): boolean {
                return s.match(/^\d+$/) != null
            }

            const myComp = mine[i]
            const otherComp = other[i]

            // log.info(`Element = mine: ${myComp} - other: ${otherComp}`)
            if (isNumeric(myComp)) {
                const myNum = Number(myComp)
                if (isNumeric(otherComp)) {
                    const otherNum = Number(otherComp)
                    // 11.4.1. Identifiers consisting of only digits are compared numerically.
                    // log.info(`Element[NUM] = mine: ${myComp} - other: ${otherComp}`)
                    if (myNum > otherNum) {
                        return VersionNumber.NEWER
                    } else if (myNum < otherNum) {
                        return VersionNumber.OLDER
                    }
                } else {
                    // log.info(`Element[MY-NUM] = mine: ${myComp} - other: ${otherComp}`)
                    // 11.4.3. Numeric identifiers always have lower precedence than non-numeric identifiers.
                    return VersionNumber.OLDER
                }
            } else {
                if (isNumeric(otherComp)) {
                    // log.info(`Element[OTHER-NUM] = mine: ${myComp} - other: ${otherComp}`)
                    // 11.4.3. Numeric identifiers always have lower precedence than non-numeric identifiers.
                    return VersionNumber.NEWER
                }

                // log.info(`Element[STR] = mine: ${myComp} - other: ${otherComp}`)
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
