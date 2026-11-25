import { assertEquals, assertRejects, assertThrows } from "@std/assert";
import { stub } from "@std/testing/mock";
import * as path from "@std/path";

import { ZipRepository } from "./zip_repository.ts";
import LevainAsserts from "../test/levain_asserts.ts";
import Repository from "./repository.ts";
import TestHelper from "../test/test_helper.ts";
import HttpUtils from "../utils/http_utils.ts";

Deno.test("ZipRepository should have a name", () => {
  const repo = getRepo();

  assertEquals(repo.name, "ZipRepo");
});
const rootUri = "./testdata/zip_repository/zipRepo.zip";
Deno.test("ZipRepository should have a rootDir", () => {
  const repo = getRepo();

  assertEquals(repo.rootUrl, rootUri);
});
Deno.test("ZipRepository should have a absoluteURI", () => {
  const repo = getRepo();
  const absoluteURI = path.resolve(rootUri);

  assertEquals(repo.absoluteURI || "", absoluteURI);
});
Deno.test("ZipRepository should have a description", () => {
  const repo = getRepo();

  assertEquals(repo.describe(), `ZipRepo (${repo.absoluteURI} resolved from ./testdata/zip_repository/zipRepo.zip)`);
});
Deno.test({
  name: "ZipRepository should throw an error when root folder does not exist",
  fn: async () => {
    const absoluteURI = path.resolve("thisFolderDoesNotExist");

    await assertRejects(
      async () => {
        const repo = await getRepo("thisFolderDoesNotExist");
        await repo.init();
      },
      Error,
      `Zip not found: ${absoluteURI} resolved from thisFolderDoesNotExist`,
    );
  },
});
//
// List
//
Deno.test("ZipRepository should list packages from files system zip", async () => {
  const repo = await getInitedRepo();

  const packages = repo.listPackages();

  LevainAsserts.assertPackageNames(packages, [
    "reciepe-in-a-zip",
    "reciepe-in-a-folder-in-a-zip",
  ]);
});
Deno.test("ZipRepository should list packages from a zip url", async () => {
  const zipBytes = await Deno.readFile(rootUri);
  const getStub = stub(
    HttpUtils,
    "get",
    () =>
      Promise.resolve(
        new Response(zipBytes, {
          status: 200,
          headers: { "content-length": String(zipBytes.length) },
        }),
      ),
  );

  try {
    const url = "https://example.org/repos/zipRepo.zip";
    const repo = await getInitedRepo(url);
    assertEquals(repo.absoluteURI, url);
    assertEquals(repo.describe(), `ZipRepo (${url})`);
    const packages = repo.listPackages();

    LevainAsserts.assertPackageNames(packages, [
      "reciepe-in-a-zip",
      "reciepe-in-a-folder-in-a-zip",
    ]);
  } finally {
    getStub.restore();
  }
});

Deno.test("ZipRepository should preserve remote URL without path.resolve when rejecting non-zip URL", async () => {
  await assertRejects(
    async () => {
      const repo = getRepo("https://example.org/repos/not-a-zip");
      await repo.init();
    },
    Error,
    "Zip not found: https://example.org/repos/not-a-zip",
  );
});

async function getInitedRepo(rootDir: string = "./testdata/zip_repository/zipRepo.zip"): Promise<Repository> {
  const repo = getRepo(rootDir);
  await repo.init();
  return repo;
}

function getRepo(rootDir: string = rootUri) {
  return new ZipRepository(TestHelper.getConfig(), rootDir);
}

Deno.test("ZipRepository throws before init and supports resolvePackage and reload after init", async () => {
  const repo = getRepo();
  assertThrows(() => repo.listPackages(), Error, "ZipRepo not loaded");
  assertThrows(() => repo.resolvePackage("reciepe-in-a-zip"), Error, "ZipRepo not loaded");

  await repo.init();
  assertEquals(repo.resolvePackage("reciepe-in-a-zip")?.name, "reciepe-in-a-zip");
  assertEquals(repo.resolvePackage("non-existent"), undefined);
  await repo.reload();
  assertEquals(repo.resolvePackage("reciepe-in-a-zip")?.name, "reciepe-in-a-zip");
});
