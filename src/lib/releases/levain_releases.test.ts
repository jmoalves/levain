import { assert, assertEquals, assertFalse, assertRejects, assertThrows } from "@std/assert";
import { stub } from "@std/testing/mock";
import { existsSync } from "@std/fs";
import * as path from "@std/path";

import LevainReleases from "./levain_releases.ts";
import HttpUtils from "../utils/http_utils.ts";
import FileCache from "../fs/file_cache.ts";
import TestHelper from "../test/test_helper.ts";

Deno.test("LevainReleases - check release tag ", () => {
  assert(LevainReleases.isValidReleaseTag("v0.30.0"), "Check failed");
  assert(!LevainReleases.isValidReleaseTag(), "Check failed");
  assert(!LevainReleases.isValidReleaseTag("vHEAD"), "Check failed");
  assert(LevainReleases.isValidReleaseTag("v0.0.0"), "Check failed");
  assert(!LevainReleases.isValidReleaseTag("v0.5"), "Check failed");
  assert(LevainReleases.isValidReleaseTag("v1.15.250"), "Check failed");
});

Deno.test("LevainReleases.parseSha256 parses sha256sum format and rejects invalid content", () => {
  const validHex = "a".repeat(64);
  assertEquals(LevainReleases.parseSha256(`${validHex.toUpperCase()}  levain-v1.0.0-windows-x86_64.zip\n`), validHex);
  assertThrows(() => LevainReleases.parseSha256("not-a-hash"), Error, "Invalid SHA-256");
  assertThrows(() => LevainReleases.parseSha256(""), Error, "Invalid SHA-256");
});

Deno.test("LevainReleases.verifyFileSha256 validates matching checksum and rejects mismatch", async () => {
  const tempDir = TestHelper.getNewTempDir();
  const filePath = path.join(tempDir, "release.zip");
  await Deno.writeTextFile(filePath, "levain-release-payload");

  const expected = await LevainReleases.computeFileSha256(filePath);
  await LevainReleases.verifyFileSha256(filePath, `${expected}  release.zip\n`);

  const wrong = "0".repeat(64);
  await assertRejects(
    async () => {
      await LevainReleases.verifyFileSha256(filePath, `${wrong}  release.zip\n`);
    },
    Error,
    "SHA-256 checksum mismatch",
  );
});

Deno.test("LevainReleases.latest returns undefined on 404 without caching error JSON", async () => {
  LevainReleases.resetCache();
  const getStub = stub(
    HttpUtils,
    "get",
    () => Promise.resolve(new Response(JSON.stringify({ message: "Not Found" }), { status: 404 })),
  );

  try {
    const releases = new LevainReleases(TestHelper.getConfig());
    assertEquals(await releases.latest(), undefined);
    // Second call uses cached not-found state without throwing or returning error JSON
    assertEquals(await releases.latest(), undefined);
    assertEquals(getStub.calls.length, 1);
  } finally {
    getStub.restore();
    LevainReleases.resetCache();
  }
});

Deno.test("LevainReleases.latest rejects on non-404 HTTP errors", async () => {
  LevainReleases.resetCache();
  const getStub = stub(
    HttpUtils,
    "get",
    () => Promise.resolve(new Response("rate limit", { status: 403 })),
  );

  try {
    const releases = new LevainReleases(TestHelper.getConfig());
    await assertRejects(() => releases.latest(), Error, "HTTP 403");
  } finally {
    getStub.restore();
    LevainReleases.resetCache();
  }
});

Deno.test("LevainReleases.fetchExpectedSha256 fetches checksum and rejects HTTP errors", async () => {
  const validHex = "b".repeat(64);
  const getStub = stub(
    HttpUtils,
    "get",
    (url: string) => {
      if (url.endsWith("ok.zip.sha256")) {
        return Promise.resolve(new Response(`${validHex}  ok.zip\n`, { status: 200 }));
      }
      return Promise.resolve(new Response("missing", { status: 404 }));
    },
  );

  try {
    const releases = new LevainReleases(TestHelper.getConfig());
    const text = await releases.fetchExpectedSha256("https://example.org/ok.zip");
    assertEquals(LevainReleases.parseSha256(text), validHex);

    await assertRejects(
      () => releases.fetchExpectedSha256("https://example.org/missing.zip"),
      Error,
      "HTTP 404",
    );
  } finally {
    getStub.restore();
  }
});

Deno.test("LevainReleases.prepareNewRelease removes tampered cached zip and aborts on checksum mismatch", async () => {
  LevainReleases.resetCache();
  const tempDir = TestHelper.getNewTempDir();
  const fakeZip = path.join(tempDir, "levain-v99.99.99-windows-x86_64.zip");
  await Deno.writeTextFile(fakeZip, "tampered-content");

  const getStub = stub(
    HttpUtils,
    "get",
    (url: string) => {
      if (url.endsWith("/latest")) {
        return Promise.resolve(new Response(JSON.stringify({ tag_name: "v99.99.99" }), { status: 200 }));
      }
      if (url.endsWith(".sha256")) {
        return Promise.resolve(new Response(`${"f".repeat(64)}  levain-v99.99.99-windows-x86_64.zip\n`, { status: 200 }));
      }
      return Promise.resolve(new Response("unexpected", { status: 500 }));
    },
  );
  const cacheStub = stub(FileCache.prototype, "get", () => Promise.resolve(fakeZip));

  try {
    const config = TestHelper.getConfig();
    const releases = new LevainReleases(config);
    await releases.prepareNewRelease();
    assertFalse(existsSync(fakeZip));
  } finally {
    cacheStub.restore();
    getStub.restore();
    LevainReleases.resetCache();
  }
});
