import { assert } from "@std/assert";

import TestHelper from "../test/test_helper.ts";
import FileReader from "./file_reader.ts";
import HttpReader from "./http_reader.ts";
import ReaderFactory from "./reader_factory.ts";

Deno.test("ReaderFactory.readerFor should return HttpReader for http and https URLs", () => {
  assert(ReaderFactory.readerFor("http://example.org/file.zip") instanceof HttpReader);
  assert(ReaderFactory.readerFor("https://example.org/file.zip") instanceof HttpReader);
});

Deno.test("ReaderFactory.readerFor should return FileReader for local paths", () => {
  const tempFile = TestHelper.getNewTempFile();
  assert(ReaderFactory.readerFor(tempFile) instanceof FileReader);
});
