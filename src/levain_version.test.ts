import { assert } from "@std/assert";

import VersionNumber from "./lib/utils/version_number.ts";

import LevainVersion from "./levain_version.ts";

Deno.test("should check for HEAD version", () => {
  assert(LevainVersion.isHeadVersion(new VersionNumber("HEAD")));
  assert(LevainVersion.isHeadVersion(new VersionNumber("vHEAD")));
});
