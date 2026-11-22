import { assert, assertEquals } from "@std/assert";

import { FileError, fileError, isNotFoundFileError } from "./error_utils.ts";

Deno.test("FileError should set name and preserve cause", () => {
  const root = new Error("root cause");
  const err = new FileError("custom message", { cause: root });

  assertEquals(err.name, "FileError");
  assertEquals(err.message, "custom message");
  assertEquals(err.cause, root);
});

Deno.test("fileError should wrap Error and non-Error values into FileError", () => {
  const original = new Deno.errors.NotFound("missing file");
  const wrapped = fileError(original, "/tmp/demo.txt", "reading");

  assert(wrapped instanceof FileError);
  assertEquals(wrapped.cause, original);
  assert(wrapped.message.includes("/tmp/demo.txt"));
  assert(wrapped.message.includes("reading"));

  const wrappedString = fileError("raw failure", "/tmp/demo.txt", "opening");
  assert(wrappedString instanceof FileError);
  assert(wrappedString.cause instanceof Error);
  assertEquals(wrappedString.cause.message, "raw failure");
});

Deno.test("isNotFoundFileError should detect NotFound directly and inside FileError cause", () => {
  const notFound = new Deno.errors.NotFound("nope");
  const wrappedNotFound = fileError(notFound, "/tmp/a", "open");
  const otherErr = new Error("other");
  const wrappedOther = fileError(otherErr, "/tmp/a", "open");

  assertEquals(isNotFoundFileError(notFound), true);
  assertEquals(isNotFoundFileError(wrappedNotFound), true);
  assertEquals(isNotFoundFileError(otherErr), false);
  assertEquals(isNotFoundFileError(wrappedOther), false);
  assertEquals(isNotFoundFileError("NotFound"), false);
  assertEquals(isNotFoundFileError(null), false);
});
