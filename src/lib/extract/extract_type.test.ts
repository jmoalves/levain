import * as path from "https://deno.land/std/path/mod.ts";

import TestHelper from "../test/test_helper.ts";
import { assertFolderIncludes } from "../test/more_asserts.ts";
import { ExtractType } from "./extractor_factory.ts";

// create a unit test for ExtractorFactory using extractorType
Deno.test("ExtractorFactory - isTypeSupported", () => {
    const factory = new ExtractorFactory();
    assert(factory.isTypeSupported("zip"));
    assert(factory.isTypeSupported("7z"));
    assert(factory.isTypeSupported("tar.gz"));
    assert(factory.isTypeSupported("tgz"));
    assert(!factory.isTypeSupported("rar"));
    assert(!factory.isTypeSupported("exe"));
    assert(!factory.isTypeSupported("txt"));
});

// how to run this test:
// deno test --allow-read --allow-write src/lib/extract/extract_type.test.ts