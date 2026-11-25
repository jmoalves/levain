import * as path from "@std/path";
import { assertEquals, assertRejects } from "@std/assert";
import { stub } from "@std/testing/mock";
import HttpUtils from "./http_utils.ts";

//
// resolve
//
Deno.test("HttpUtils.resolve should resolve file paths", () => {
  assertEquals(HttpUtils.resolve("."), path.resolve("."));
});
Deno.test("HttpUtils.resolve should not change urls", () => {
  assertEquals(HttpUtils.resolve("http://google.com"), "http://google.com");
  assertEquals(HttpUtils.resolve("https://example.org/file.zip"), "https://example.org/file.zip");
  assertEquals(HttpUtils.resolve("http://localhost:8080/repo"), "http://localhost:8080/repo");
});

Deno.test("HttpUtils.isUrl should accept valid http/https/ftp URLs and reject file paths or malformed inputs", () => {
  assertEquals(HttpUtils.isUrl("https://example.org/a.zip"), true);
  assertEquals(HttpUtils.isUrl("ftp://files.example.org/pub"), true);
  assertEquals(HttpUtils.isUrl("http://localhost/test"), true);
  assertEquals(HttpUtils.isUrl("http://[::1]:8080/repo.zip"), true);
  assertEquals(HttpUtils.isUrl("https://intranet-host/repo.zip"), true);
  assertEquals(HttpUtils.isUrl(""), false);
  assertEquals(HttpUtils.isUrl("http:example.org"), false);
  assertEquals(HttpUtils.isUrl("http://[::invalid"), false);
  assertEquals(HttpUtils.isUrl("https://example.org/with space"), false);
  assertEquals(HttpUtils.isUrl("file:///tmp/test.zip"), false);
  assertEquals(HttpUtils.isUrl("./local/path"), false);
  assertEquals(HttpUtils.isUrl("C:\\Windows\\System32"), false);
});

//
// get
//
Deno.test("HttpUtils.get should reject tries <= 0", async () => {
  await assertRejects(() => HttpUtils.get("https://example.org", 0), Error, "Invalid value for tries");
});

Deno.test("HttpUtils.get should return response and clear timeout on success", async () => {
  const fetchStub = stub(
    globalThis,
    "fetch",
    () => Promise.resolve(new Response("ok", { status: 200 })),
  );
  try {
    const resp = await HttpUtils.get("https://example.org/ok", 1);
    assertEquals(resp.status, 200);
    assertEquals(await resp.text(), "ok");
  } finally {
    fetchStub.restore();
  }
});

Deno.test("HttpUtils.get should clear timeout without leaking timer when fetch fails on final attempt", async () => {
  const fetchStub = stub(
    globalThis,
    "fetch",
    () => Promise.reject(new Error("network down")),
  );
  try {
    await assertRejects(() => HttpUtils.get("https://example.org/fail", 1), Error, "network down");
    assertEquals(fetchStub.calls.length, 1);
  } finally {
    fetchStub.restore();
  }
});
