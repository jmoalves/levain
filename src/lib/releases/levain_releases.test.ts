import { assert, assertEquals, assertFalse, assertRejects, assertThrows } from "@std/assert";
import { stub } from "@std/testing/mock";
import { existsSync } from "@std/fs";
import * as path from "@std/path";

import LevainReleases from "./levain_releases.ts";
import VersionNumber from "../utils/version_number.ts";
import DateUtils from "../utils/date_utils.ts";
import HttpUtils from "../utils/http_utils.ts";
import FileCache from "../fs/file_cache.ts";
import { ExtractorFactory } from "../extract/extractor_factory.ts";
import type { Extractor } from "../extract/extractor.ts";
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
  const releasesDir = path.join(tempDir, "releases");
  const fakeZip = path.join(tempDir, "levain-v99.99.99-windows-x86_64.zip");
  await Deno.writeTextFile(fakeZip, "tampered-content");

  // Pre-create a stale directory with the same version to confirm SHA-256 is NEVER bypassed
  const staleDir = path.join(releasesDir, "levain-99.99.99");
  await Deno.mkdir(staleDir, { recursive: true });
  await Deno.writeTextFile(path.join(staleDir, "levain.cmd"), "@echo stale");

  const getStub = stub(
    HttpUtils,
    "get",
    (url: string) => {
      if (url.endsWith("/latest")) {
        return Promise.resolve(new Response(JSON.stringify({ tag_name: "v99.99.99" }), { status: 200 }));
      }
      if (url.endsWith(".sha256")) {
        return Promise.resolve(
          new Response(`${"f".repeat(64)}  levain-v99.99.99-windows-x86_64.zip\n`, { status: 200 }),
        );
      }
      return Promise.resolve(new Response("unexpected", { status: 500 }));
    },
  );
  const cacheStub = stub(FileCache.prototype, "get", () => Promise.resolve(fakeZip));

  try {
    const config = TestHelper.getConfig();
    const releases = new LevainReleases(config);
    await releases.prepareNewRelease(releasesDir);
    assertFalse(existsSync(fakeZip));
    assertFalse(existsSync(staleDir));
    assertFalse(existsSync(path.join(releasesDir, "upgrade-target.txt")));
  } finally {
    cacheStub.restore();
    getStub.restore();
    LevainReleases.resetCache();
  }
});

Deno.test("LevainReleases.prepareNewRelease cleans old versions, verifies private copy, extracts, writes marker, and exits 42", async () => {
  LevainReleases.resetCache();
  const tempDir = TestHelper.getNewTempDir();
  const releasesDir = path.join(tempDir, "releases");
  const staleOldDir = path.join(releasesDir, "levain-1.0.2");
  await Deno.mkdir(staleOldDir, { recursive: true });
  await Deno.writeTextFile(path.join(staleOldDir, "levain.cmd"), "@echo old");

  const fakeZip = path.join(tempDir, "levain-v1.0.10-windows-x86_64.zip");
  await Deno.writeTextFile(fakeZip, "valid-release-zip-bytes");
  const expectedSha = await LevainReleases.computeFileSha256(fakeZip);

  const getStub = stub(
    HttpUtils,
    "get",
    (url: string) => {
      if (url.endsWith("/latest")) {
        return Promise.resolve(new Response(JSON.stringify({ tag_name: "v1.0.10" }), { status: 200 }));
      }
      if (url.endsWith(".sha256")) {
        return Promise.resolve(new Response(`${expectedSha}  levain-v1.0.10-windows-x86_64.zip\n`, { status: 200 }));
      }
      return Promise.resolve(new Response("unexpected", { status: 500 }));
    },
  );
  const cacheStub = stub(FileCache.prototype, "get", () => Promise.resolve(fakeZip));

  let extractedFromPath = "";
  const extractorStub = stub(
    ExtractorFactory.prototype,
    "createExtractor",
    () =>
      ({
        extract: async (_strip: boolean, src: string, dst: string) => {
          extractedFromPath = src;
          const outDir = path.join(dst, "levain-1.0.10");
          await Deno.mkdir(outDir, { recursive: true });
          await Deno.writeTextFile(path.join(outDir, "levain.cmd"), "@echo new");
          await Deno.writeTextFile(path.join(outDir, "levain.sh"), "#!/bin/bash\n");
        },
      }) as unknown as Extractor,
  );
  const exitCodes: number[] = [];
  const exitStub = stub(Deno, "exit", (code?: number): never => {
    exitCodes.push(code ?? 0);
    return undefined as never;
  });

  try {
    const config = TestHelper.getConfig();
    const releases = new LevainReleases(config);
    await releases.prepareNewRelease(releasesDir);

    assertFalse(existsSync(staleOldDir));
    // Extracted from private copy inside releasesDir (not directly from FileCache)
    assert(extractedFromPath.startsWith(releasesDir));
    assert(extractedFromPath !== fakeZip);
    // Temporary verification copy removed in finally
    assertFalse(existsSync(extractedFromPath));
    // Upgrade marker points to exact verified folder
    assertEquals(Deno.readTextFileSync(path.join(releasesDir, "upgrade-target.txt")).trim(), "levain-1.0.10");
    assertEquals(exitCodes, [42]);
  } finally {
    exitStub.restore();
    extractorStub.restore();
    cacheStub.restore();
    getStub.restore();
    LevainReleases.resetCache();
  }
});

Deno.test("LevainReleases.checkLevainUpdate skips GitHub API call when already checked today", async () => {
  LevainReleases.resetCache();
  const getStub = stub(
    HttpUtils,
    "get",
    () => Promise.resolve(new Response(JSON.stringify({ tag_name: "v0.0.1" }), { status: 200 })),
  );

  try {
    const config = TestHelper.getConfig();
    const releases = new LevainReleases(config);

    // First check today hits GitHub API once and records lastUpdateCheck
    await releases.checkLevainUpdate();
    assertEquals(getStub.calls.length, 1);
    assertEquals(config.lastUpdateCheck, DateUtils.dateTag());

    // Second check on the same day skips network call completely
    LevainReleases.resetCache();
    await releases.checkLevainUpdate();
    assertEquals(getStub.calls.length, 1);
  } finally {
    getStub.restore();
    LevainReleases.resetCache();
  }
});

Deno.test("LevainReleases should resolve repository from LEVAIN_REPOSITORY, validate slug, and build OS/arch asset URLs", async () => {
  assertEquals(LevainReleases.releaseAssetPlatform("windows", "x86_64"), "windows-x86_64");
  assertEquals(LevainReleases.releaseAssetPlatform("linux", "x86_64"), "linux-x86_64");
  assertEquals(LevainReleases.releaseAssetPlatform("darwin", "aarch64"), "darwin-aarch64");

  assertThrows(() => LevainReleases.resolveRepository("invalid slug"), Error, "Invalid Levain release repository slug");
  assertThrows(() => LevainReleases.resolveRepository("https://evil.example/a/b"), Error, "Invalid Levain release repository slug");
  assertThrows(() => LevainReleases.resolveRepository("../evil"), Error, "Invalid Levain release repository slug");
  assertThrows(() => LevainReleases.resolveRepository("org/.."), Error, "Invalid Levain release repository slug");

  const config = TestHelper.getConfig();
  const envStub = stub(Deno.env, "get", (key: string) => (key === "LEVAIN_REPOSITORY" ? "custom-org/levain-fork" : undefined));
  try {
    assertEquals(LevainReleases.resolveRepository(), "custom-org/levain-fork");
    const releases = new LevainReleases(config);
    const url = await releases.levainZipUrl(new VersionNumber("1.1.0"));
    assertEquals(
      url,
      `https://github.com/custom-org/levain-fork/releases/download/v1.1.0/levain-v1.1.0-${Deno.build.os}-${Deno.build.arch}.zip`,
    );
  } finally {
    envStub.restore();
  }
});
