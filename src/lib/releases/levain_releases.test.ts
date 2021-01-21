import {assert} from "https://deno.land/std/testing/asserts.ts";

import LevainReleases from "./levain_releases.ts";

Deno.test('LevainReleases - check release tag ', async () => {
    assert(LevainReleases.isValidReleaseTag('v0.30.0'), 'Check failed')
    assert(!LevainReleases.isValidReleaseTag(), 'Check failed')
    assert(!LevainReleases.isValidReleaseTag('vHEAD'), 'Check failed')
    assert(LevainReleases.isValidReleaseTag('v0.0.0'), 'Check failed')
    assert(!LevainReleases.isValidReleaseTag('v0.5'), 'Check failed')
    assert(LevainReleases.isValidReleaseTag('v1.15.250'), 'Check failed')
})
