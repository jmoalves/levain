import {assert, assertEquals} from "jsr:@std/assert";

import VersionNumber from './version_number.ts';

// CHECK HERE - https://semver.org/#is-there-a-suggested-regular-expression-regex-to-check-a-semver-string

Deno.test('VersionNumber - valid version numbers - X.Y....', () => {
    assert(VersionNumber.isValid("1.0.1"))
})

Deno.test('VersionNumber - valid version numbers - X.Y-with-text', () => {
    assert(VersionNumber.isValid("1.0.0-SNAPSHOT"))
    assert(VersionNumber.isValid("1.0.0-GA"))
    assert(VersionNumber.isValid("1.0.0-RC"))

    assert(VersionNumber.isValid("1.0.0-my-version-number"))

    assert(VersionNumber.isValid("1.0.0-20210228"))
    assert(VersionNumber.isValid("1.0.0-20210228-151400"))

    assert(VersionNumber.isValid("1.0.0-20210228-151400-some-other-text"))

    assert(VersionNumber.isValid("0"))
    assert(VersionNumber.isValid("1"))
    assert(VersionNumber.isValid("0.0"))
    assert(VersionNumber.isValid("0.1"))
    assert(VersionNumber.isValid("1.0"))
    assert(VersionNumber.isValid("1.0.0.1"))
    assert(VersionNumber.isValid("1.0.0.0.1"))
    assert(VersionNumber.isValid("01.0.1"))
    assert(VersionNumber.isValid("00.0.00"))
    assert(VersionNumber.isValid("1.0.01"))
    assert(VersionNumber.isValid("00000001"))
    assert(VersionNumber.isValid("20210228"))
    assert(VersionNumber.isValid("20210228-151400"))
    assert(VersionNumber.isValid("20210228-151400-some-other-text"))
    assert(VersionNumber.isValid("some-text"))
    assert(VersionNumber.isValid("1.0.0-my_version_number"))
})

function versionNumber(text: string): VersionNumber {
    return new VersionNumber(text)    
}

Deno.test('VersionNumber - compare', () => {
    assertEquals(versionNumber("10.0.1").compareTo(versionNumber("10.0.1")), VersionNumber.SAME)
    assertEquals(versionNumber("10.0.1").compareTo(versionNumber("9.1.2")), VersionNumber.NEWER)
    assertEquals(versionNumber("10.0.1.1").compareTo(versionNumber("10.0.1")), VersionNumber.NEWER)
    assertEquals(versionNumber("10.0.0.1").compareTo(versionNumber("10.0.1")), VersionNumber.OLDER)
    assertEquals(versionNumber("9.1.2").compareTo(versionNumber("10.0.1")), VersionNumber.OLDER)
    assertEquals(versionNumber("10.0.1").compareTo(versionNumber("10.0.1-beta.2")), VersionNumber.NEWER)
    assertEquals(versionNumber("10.0.1-beta.2").compareTo(versionNumber("10.0.1-beta.1")), VersionNumber.NEWER)
    assertEquals(versionNumber("10.0.1-beta.2").compareTo(versionNumber("10.0.1-alpha.3")), VersionNumber.NEWER)

    assert(versionNumber("10.0.1").isSameAs(versionNumber("10.0.1")))
    assert(versionNumber("10.0.1").isNewerThan(versionNumber("9.1.2")))
    assert(versionNumber("9.1.2").isOlderThan(versionNumber("10.0.1")))
})
