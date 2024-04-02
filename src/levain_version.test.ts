import {assert} from "https://deno.land/std/assert/mod.ts";

import TestHelper from "./lib/test/test_helper.ts"
import VersionNumber from './lib/utils/version_number.ts';

import LevainVersion from "./levain_version.ts"

Deno.test('should check for HEAD version', () => {
    assert(LevainVersion.isHeadVersion(new VersionNumber("HEAD")))
    assert(LevainVersion.isHeadVersion(new VersionNumber("vHEAD")))
})
