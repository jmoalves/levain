import { assert, assertEquals, assertFalse, assertRejects, assertThrows } from "@std/assert";
import { stub } from "@std/testing/mock";
import { existsSync } from "@std/fs";
import * as path from "@std/path";

import LevainReleases from "./levain_releases.ts";
import LevainVersion from "../../levain_version.ts";
import VersionNumber from "../utils/version_number.ts";
import DateUtils from "../utils/date_utils.ts";
import HttpUtils from "../utils/http_utils.ts";
import FileCache from "../fs/file_cache.ts";
import OsUtils from "../os/os_utils.ts";
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

Deno.test("LevainReleases.releases caches list and handles 404, invalid JSON, and network errors", async () => {
  LevainReleases.resetCache();
  const releases = new LevainReleases(TestHelper.getConfig());

  const okStub = stub(
    HttpUtils,
    "get",
    () => Promise.resolve(new Response(JSON.stringify([{ tag_name: "v1.0.0" }]), { status: 200 })),
  );
  try {
    const list1 = await releases.releases();
    const list2 = await releases.releases();
    assertEquals(list1, [{ tag_name: "v1.0.0" }]);
    assertEquals(list2, list1);
    assertEquals(okStub.calls.length, 1);
  } finally {
    okStub.restore();
    LevainReleases.resetCache();
  }

  const notFoundStub = stub(
    HttpUtils,
    "get",
    () => Promise.resolve(new Response("Not Found", { status: 404 })),
  );
  try {
    await assertRejects(() => releases.releases(), Error);
  } finally {
    notFoundStub.restore();
    LevainReleases.resetCache();
  }

  const badJsonStub = stub(
    HttpUtils,
    "get",
    () => Promise.resolve(new Response("not-json", { status: 200 })),
  );
  try {
    await assertRejects(() => releases.releases());
  } finally {
    badJsonStub.restore();
    LevainReleases.resetCache();
  }

  const netErrStub = stub(
    HttpUtils,
    "get",
    () => Promise.reject(new Error("network down")),
  );
  try {
    await assertRejects(() => releases.releases(), Error, "network down");
  } finally {
    netErrStub.restore();
    LevainReleases.resetCache();
  }
});

Deno.test("LevainReleases.latestVersion and releasesRepositoryUrl handle cache, invalid tags, missing release, and errors", async () => {
  LevainReleases.resetCache();
  const releases = new LevainReleases(TestHelper.getConfig());

  // Valid latest cached across calls + releasesRepositoryUrl delegates to levainZipUrl
  const okStub = stub(
    HttpUtils,
    "get",
    () => Promise.resolve(new Response(JSON.stringify({ tag_name: "v2.3.4" }), { status: 200 })),
  );
  try {
    assertEquals((await releases.latestVersion())?.versionNumber, "2.3.4");
    const repoUrl = await releases.releasesRepositoryUrl();
    assertEquals(
      repoUrl,
      `https://github.com/jmoalves/levain/releases/download/v2.3.4/levain-v2.3.4-${Deno.build.os}-${Deno.build.arch}.zip`,
    );
    assertEquals(okStub.calls.length, 1);
  } finally {
    okStub.restore();
    LevainReleases.resetCache();
  }

  // 404 -> undefined version -> levainZipUrl throws
  const notFoundStub = stub(
    HttpUtils,
    "get",
    () => Promise.resolve(new Response("", { status: 404 })),
  );
  try {
    assertEquals(await releases.latestVersion(), undefined);
    await assertRejects(() => releases.levainZipUrl(), Error);
  } finally {
    notFoundStub.restore();
    LevainReleases.resetCache();
  }

  // Invalid release tag format -> undefined
  const invalidTagStub = stub(
    HttpUtils,
    "get",
    () => Promise.resolve(new Response(JSON.stringify({ tag_name: "release-beta" }), { status: 200 })),
  );
  try {
    assertEquals(await releases.latestVersion(), undefined);
  } finally {
    invalidTagStub.restore();
    LevainReleases.resetCache();
  }

  // Missing tag_name -> undefined
  const noTagStub = stub(
    HttpUtils,
    "get",
    () => Promise.resolve(new Response(JSON.stringify({ name: "unnamed" }), { status: 200 })),
  );
  try {
    assertEquals(await releases.latestVersion(), undefined);
  } finally {
    noTagStub.restore();
    LevainReleases.resetCache();
  }

  // Error from latest() rejects latestVersion()
  const errStub = stub(
    HttpUtils,
    "get",
    () => Promise.reject(new Error("boom")),
  );
  try {
    await assertRejects(() => releases.latestVersion(), Error, "boom");
  } finally {
    errStub.restore();
    LevainReleases.resetCache();
  }
});

Deno.test("LevainReleases.needsUpdate handles undefined version, HEAD version, older and newer versions", () => {
  const releases = new LevainReleases(TestHelper.getConfig());
  assertEquals(releases.needsUpdate(undefined), false);

  const headProp = Object.getOwnPropertyDescriptor(LevainVersion, "levainVersion");
  Object.defineProperty(LevainVersion, "levainVersion", {
    get: () => new VersionNumber("HEAD"),
    configurable: true,
  });
  try {
    assertEquals(releases.needsUpdate(new VersionNumber("99.0.0")), false);
  } finally {
    if (headProp) Object.defineProperty(LevainVersion, "levainVersion", headProp);
  }

  assertEquals(releases.needsUpdate(new VersionNumber("999.0.0")), true);
});

Deno.test("LevainReleases.checkLevainUpdate handles HEAD, prompt decisions, autoUpdate, and errors", async () => {
  LevainReleases.resetCache();

  // Case 1: allowsUpdate() false (HEAD version)
  const headStub = stub(LevainVersion, "isHeadVersion", () => true);
  try {
    const releases = new LevainReleases(TestHelper.getConfig());
    await releases.checkLevainUpdate();
  } finally {
    headStub.restore();
  }

  // Case 2: already asked today -> skips prompt
  const configAsked = TestHelper.getConfig();
  configAsked.autoUpdate = false;
  configAsked.lastUpdateQuestion = DateUtils.dateTag();
  const releasesAsked = new LevainReleases(configAsked);
  const latestStub1 = stub(releasesAsked, "latestVersion", () => Promise.resolve(new VersionNumber("999.0.0")));
  const prepStub1 = stub(releasesAsked, "prepareNewRelease", () => Promise.resolve());
  try {
    await releasesAsked.checkLevainUpdate();
    assertEquals(configAsked.lastKnownVersion, "999.0.0");
    assertEquals(prepStub1.calls.length, 0);
  } finally {
    prepStub1.restore();
    latestStub1.restore();
  }

  // Case 3: user declines prompt -> does not upgrade
  const configDecline = TestHelper.getConfig();
  configDecline.autoUpdate = false;
  const releasesDecline = new LevainReleases(configDecline);
  const latestStub2 = stub(releasesDecline, "latestVersion", () => Promise.resolve(new VersionNumber("999.0.0")));
  const prepStub2 = stub(releasesDecline, "prepareNewRelease", () => Promise.resolve());
  const promptNoStub = stub(globalThis, "prompt", () => "n");
  try {
    await releasesDecline.checkLevainUpdate();
    assertEquals(configDecline.lastUpdateQuestion, DateUtils.dateTag());
    assertEquals(prepStub2.calls.length, 0);
  } finally {
    promptNoStub.restore();
    prepStub2.restore();
    latestStub2.restore();
  }

  // Case 4: user accepts prompt -> sets shellCheckForUpdate and calls prepareNewRelease
  const configAccept = TestHelper.getConfig();
  configAccept.autoUpdate = false;
  const releasesAccept = new LevainReleases(configAccept);
  const latestStub3 = stub(releasesAccept, "latestVersion", () => Promise.resolve(new VersionNumber("999.0.0")));
  const prepStub3 = stub(releasesAccept, "prepareNewRelease", () => Promise.resolve());
  const promptYesStub = stub(globalThis, "prompt", (_msg?: string, def?: string) => def ?? "Y");
  try {
    await releasesAccept.checkLevainUpdate();
    assertEquals(configAccept.shellCheckForUpdate, true);
    assertEquals(prepStub3.calls.length, 1);
  } finally {
    promptYesStub.restore();
    prepStub3.restore();
    latestStub3.restore();
  }

  // Case 5: latestVersion rejects -> caught gracefully
  const configErr = TestHelper.getConfig();
  const releasesErr = new LevainReleases(configErr);
  const latestStub4 = stub(releasesErr, "latestVersion", () => Promise.reject(new Error("offline")));
  try {
    await releasesErr.checkLevainUpdate();
  } finally {
    latestStub4.restore();
  }
});

Deno.test("LevainReleases.prepareNewRelease handles missing latestVersion, missing entrypoint, and cleanup failures", async () => {
  LevainReleases.resetCache();
  const tempDir = TestHelper.getNewTempDir();
  const releasesDir = path.join(tempDir, "releases");

  // Case 1: latestVersion undefined -> returns early
  const releases1 = new LevainReleases(TestHelper.getConfig());
  const latestUndef = stub(releases1, "latestVersion", () => Promise.resolve(undefined));
  try {
    await releases1.prepareNewRelease(releasesDir);
    assertFalse(existsSync(releasesDir));
  } finally {
    latestUndef.restore();
  }

  // Case 2: extraction succeeds but omits expected OS entrypoint -> aborts without writing marker
  const fakeZip = path.join(tempDir, "levain-v2.0.0.zip");
  await Deno.writeTextFile(fakeZip, "payload");
  const expectedSha = await LevainReleases.computeFileSha256(fakeZip);
  await Deno.mkdir(path.join(releasesDir, "levain-1.0.0"), { recursive: true });

  const releases2 = new LevainReleases(TestHelper.getConfig());
  const latestOk = stub(releases2, "latestVersion", () => Promise.resolve(new VersionNumber("2.0.0")));
  const shaStub = stub(releases2, "fetchExpectedSha256", () => Promise.resolve(`${expectedSha}  ok.zip`));
  const cacheStub = stub(FileCache.prototype, "get", () => Promise.resolve(fakeZip));
  const extractorStub = stub(
    ExtractorFactory.prototype,
    "createExtractor",
    () =>
      ({
        extract: async (_strip: boolean, _src: string, dst: string) => {
          // Create version dir WITHOUT levain.cmd / levain.sh
          await Deno.mkdir(path.join(dst, "levain-2.0.0"), { recursive: true });
        },
      }) as unknown as Extractor,
  );
  // Also exercise cleanup error catches (stale targetFile & previous levain-* removal)
  const removeFileStub = stub(OsUtils, "removeFile", () => {
    throw new Error("locked file");
  });
  const removeDirStub = stub(OsUtils, "removeDir", () => {
    throw new Error("locked dir");
  });
  try {
    await releases2.prepareNewRelease(releasesDir);
    assertFalse(existsSync(path.join(releasesDir, "upgrade-target.txt")));
  } finally {
    removeDirStub.restore();
    removeFileStub.restore();
    extractorStub.restore();
    cacheStub.restore();
    shaStub.restore();
    latestOk.restore();
  }

  // Case 3: cached zip removal fails in error catch + readDirSync throws
  const releases3 = new LevainReleases(TestHelper.getConfig());
  const latestOk3 = stub(releases3, "latestVersion", () => Promise.resolve(new VersionNumber("2.0.1")));
  const shaStub3 = stub(releases3, "fetchExpectedSha256", () => Promise.resolve(`${"0".repeat(64)}  bad.zip`));
  const cacheStub3 = stub(FileCache.prototype, "get", () => Promise.resolve(fakeZip));
  const readDirStub = stub(Deno, "readDirSync", () => {
    throw new Error("readDir failed");
  });
  const removeFileStub3 = stub(OsUtils, "removeFile", () => {
    throw new Error("cannot delete");
  });
  try {
    await releases3.prepareNewRelease(releasesDir);
    assertFalse(existsSync(path.join(releasesDir, "upgrade-target.txt")));
  } finally {
    removeFileStub3.restore();
    readDirStub.restore();
    cacheStub3.restore();
    shaStub3.restore();
    latestOk3.restore();
  }
});
