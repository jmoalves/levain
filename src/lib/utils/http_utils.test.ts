import * as path from "@std/path";
import { assertEquals } from "@std/assert";
import HttpUtils from "./http_utils.ts";

//
// resolve
//
Deno.test("HttpUtils.resolve should resolve file paths", () => {
  assertEquals(HttpUtils.resolve("."), path.resolve("."));
});
Deno.test("HttpUtils.resolve should not change urls", () => {
  assertEquals(HttpUtils.resolve("http://google.com"), "http://google.com");
});
