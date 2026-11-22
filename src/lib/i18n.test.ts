import { assertEquals, assertFalse } from "@std/assert";

import t from "./i18n.ts";

Deno.test("i18n should not HTML-escape paths, URLs, or quotes in interpolated values", () => {
  const filePath = `/tmp/dir/"quoted"/'single'/file.zip`;
  const rendered = t("lib.fs.file_utils.throwIfNotExistsError", { filePath });

  assertFalse(rendered.includes("&#x2F;"), `Unexpected HTML entity in: ${rendered}`);
  assertFalse(rendered.includes("&quot;"), `Unexpected HTML entity in: ${rendered}`);
  assertFalse(rendered.includes("&#39;"), `Unexpected HTML entity in: ${rendered}`);
  assertEquals(rendered.includes(filePath), true);
});
