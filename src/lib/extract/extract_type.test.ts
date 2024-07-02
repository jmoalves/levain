import { ExtractorFactory } from "./extractor_factory.ts";
import { assert } from 'https://deno.land/std/assert/mod.ts';

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