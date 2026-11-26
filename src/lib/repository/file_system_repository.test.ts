import { assert, assertEquals, assertMatch, assertNotEquals, assertRejects } from "@std/assert";
import * as path from "@std/path";
import { ensureDirSync } from "@std/fs";
import { stub } from "@std/testing/mock";

import Config from "../config.ts";
import DirUtils from "../fs/dir_utils.ts";
import FileSystemPackage from "../package/file_system_package.ts";
import { assertArrayEqualsInAnyOrder } from "../test/more_asserts.ts";
import TestHelper from "../test/test_helper.ts";

import { FileSystemRepository } from "./file_system_repository.ts";

const rootDir = ".";
Deno.test("FileSystemRepository should have a name", () => {
  const repo = getRepo(rootDir);

  assertEquals(repo.name, "FileSystemRepo");
});
Deno.test("FileSystemRepository should have a rootDir", () => {
  const repo: FileSystemRepository = getRepo(rootDir);

  assertEquals(repo.rootDir, rootDir);
});
Deno.test("FileSystemRepository should have a absoluteURI", () => {
  const repo = getRepo(rootDir);

  assertNotEquals(repo.absoluteURI, rootDir);
  assertMatch(repo.absoluteURI || "", /\w+/);
});
Deno.test("FileSystemRepository.describe should include absoluteURI and rootDir when different", () => {
  const repo = getRepo(rootDir);
  assertMatch(
    repo.describe(),
    RegExp(
      `FileSystemRepo (${(repo.absoluteURI)} .* ${rootDir})`
        .replaceAll("\\", "\\\\")
        .replaceAll("(", "\\(")
        .replaceAll(")", "\\)"),
    ),
  );
});
Deno.test("FileSystemRepository.describe should not repeat absoluteURI when equal to rootDir", () => {
  const absoluteURI = path.resolve(rootDir);
  const repo = getRepo(absoluteURI);

  assertEquals(repo.describe(), `FileSystemRepo (${absoluteURI})`);
});
Deno.test({
  name: "FileSystemRepository should throw an error when root folder does not exist",
  fn: async () => {
    await assertRejects(
      async () => {
        await getInitedRepo("thisFolderDoesNotExist");
      },
      Error,
      "addRepo - dir not found: thisFolderDoesNotExist",
    );
  },
});
//
// List
//
Deno.test({
  name: "FileSystemRepository should list packages from an empty dir",
  fn: async () => {
    const emptyRepo = "testdata/file_system_repo/empty";
    ensureDirSync(emptyRepo);
    const repo = await getInitedRepo(emptyRepo);
    const packagesFound = repo.listPackages();
    assertEquals([], packagesFound);
  },
});
Deno.test("FileSystemRepository should list .yml and .yaml packages, and include subfolder", async () => {
  const repo = await getInitedRepo();

  const packages = repo.listPackages();

  const packageNames = packages.map((pkg) => pkg.name);
  assertArrayEqualsInAnyOrder(packageNames, ["amazingYml", "awesomeYaml", "beatifulLevain", "insideSubfolder"]);
});
Deno.test("FileSystemRepository should optionally list only root", async () => {
  const repo = await getInitedRepo(undefined, true);

  const packages = repo.listPackages();

  const packageNames = packages.map((pkg) => pkg.name);
  assertArrayEqualsInAnyOrder(packageNames, ["amazingYml", "awesomeYaml", "beatifulLevain"]);
});

Deno.test("FileSystemRepository should ignore node_modules", async () => {
  const repo = await getInitedRepo();

  const packages = repo.listPackages();

  const packageNames = packages.map((pkg) => pkg.name);
  assert(!packageNames.includes("hidden-by-folder"));
});

Deno.test("FileSystemRepository should ignore exact excluded dir names without skipping similar suffixes", async () => {
  const tempRoot = Deno.makeTempDirSync({ prefix: "levain-fsrepo-excl-" });
  try {
    // Directories whose names merely end with excluded words ("attempt" -> "temp", "my-bin" -> "bin", "ecosystem" -> "system")
    for (const dirName of ["attempt", "my-bin", "ecosystem"]) {
      const dirPath = path.join(tempRoot, dirName);
      ensureDirSync(dirPath);
      Deno.writeTextFileSync(path.join(dirPath, `${dirName}-pkg.levain.yaml`), "version: 1.0.0\n");
    }
    // Actual excluded directory names must still be ignored
    for (const ignoredDir of ["temp", "bin", "system"]) {
      const dirPath = path.join(tempRoot, ignoredDir);
      ensureDirSync(dirPath);
      Deno.writeTextFileSync(path.join(dirPath, `${ignoredDir}-hidden.levain.yaml`), "version: 1.0.0\n");
    }

    const repo = await getInitedRepo(tempRoot);
    const packageNames = repo.listPackages().map((pkg) => pkg.name);
    assertArrayEqualsInAnyOrder(packageNames, ["attempt-pkg", "my-bin-pkg", "ecosystem-pkg"]);
  } finally {
    Deno.removeSync(tempRoot, { recursive: true });
  }
});

Deno.test("FileSystemRepository should list FileSystemPackages", async () => {
  const repo = await getInitedRepo();

  const packages = repo.listPackages();

  assertNotEquals(0, packages?.length, "packages should not be empty");
  packages.forEach((pkg) => assert(pkg instanceof FileSystemPackage));
});

//
// resolvePackage
//
Deno.test("FileSystemRepository should resolve package by name", async () => {
  const repo = await getInitedRepo();

  const pkg = repo.resolvePackage("amazingYml");

  assert(pkg instanceof FileSystemPackage);
  assertEquals(pkg.name, "amazingYml");
});

Deno.test("FileSystemRepository should resolve package that does not exists as undefined", async () => {
  const repo = await getInitedRepo();

  const pkg = repo.resolvePackage("--this-package-does-not-exist--");

  assertEquals(pkg, undefined);
});

async function getInitedRepo(rootDir?: string, rootDirOnly?: boolean): Promise<FileSystemRepository> {
  const repo = getRepo(rootDir, rootDirOnly);
  await repo.init();
  return repo;
}

function getRepo(
  rootDir: string = "./testdata/file_system_repo/testRepo",
  rootOnly: boolean = false,
): FileSystemRepository {
  const config = new Config();
  return new FileSystemRepository(config, rootDir, rootOnly);
}

Deno.test("FileSystemRepository handles double-init, non-dir root, depth limit, read errors, and reload on missing dir", async () => {
  const tempRoot = TestHelper.getNewTempDir();
  const filePath = path.join(tempRoot, "not-a-dir.txt");
  Deno.writeTextFileSync(filePath, "hello");

  // Non-directory root throws on init
  const fileRepo = new FileSystemRepository(TestHelper.getConfig(), filePath);
  await assertRejects(() => fileRepo.init(), Error, "repository should exist and be a dir");

  // Deep nesting > 5 levels is skipped
  const deepDir = path.join(tempRoot, "d1", "d2", "d3", "d4", "d5", "d6");
  ensureDirSync(deepDir);
  Deno.writeTextFileSync(path.join(deepDir, "too-deep.levain.yaml"), "version: 1.0.0\n");
  Deno.writeTextFileSync(path.join(tempRoot, "top.levain.yaml"), "version: 1.0.0\n");

  const repo = new FileSystemRepository(TestHelper.getConfig(), tempRoot);
  await repo.init();
  // Calling init() a second time is a no-op
  await repo.init();
  assertEquals(repo.listPackages().map((p) => p.name), ["top"]);

  // readDir PermissionDenied and generic errors are swallowed gracefully
  const permStub = stub(Deno, "readDir", () => {
    throw new Deno.errors.PermissionDenied("denied");
  });
  try {
    await repo.reload();
    assertEquals(repo.listPackages(), []);
  } finally {
    permStub.restore();
  }

  const genericStub = stub(Deno, "readDir", () => {
    throw new Error("io error");
  });
  try {
    await repo.reload();
    assertEquals(repo.listPackages(), []);
  } finally {
    genericStub.restore();
  }

  // readTextFile error on a package file logs and skips that package
  const readFileStub = stub(Deno, "readTextFile", () => Promise.reject(new Error("unreadable")));
  try {
    await repo.reload();
    assertEquals(repo.listPackages(), []);
  } finally {
    readFileStub.restore();
  }

  // reload when rootDir is no longer a directory returns empty list
  const isDirStub = stub(DirUtils, "isDirectory", () => false);
  try {
    await repo.reload();
    assertEquals(repo.listPackages(), []);
  } finally {
    isDirStub.restore();
  }
});

Deno.test("FileSystemRepository rejects reserved 'levain' package name in external repos (case-insensitive) while allowing registry", async () => {
  const config = TestHelper.getConfig();
  const extRepoDir = TestHelper.getNewTempDir();
  Deno.writeTextFileSync(path.join(extRepoDir, "LeVaIn.levain.yaml"), "version: 9.9.9\n");

  const extRepo = new FileSystemRepository(config, extRepoDir);
  await assertRejects(() => extRepo.init(), Error);

  // Anonymous project .levain.yaml and prefixed levain-context-menu.levain.yaml remain allowed in external repos
  const okRepoDir = TestHelper.getNewTempDir();
  Deno.writeTextFileSync(path.join(okRepoDir, ".levain.yaml"), "version: 1.0.0\n");
  Deno.writeTextFileSync(path.join(okRepoDir, "levain-context-menu.levain.yaml"), "version: 1.0.0\n");
  const okRepo = new FileSystemRepository(config, okRepoDir);
  await okRepo.init();
  assertEquals(okRepo.resolvePackage("")?.name, "");
  assertEquals(okRepo.resolvePackage("levain-context-menu")?.name, "levain-context-menu");

  // Allowed inside levainRegistryDir
  const regDir = config.configPaths.levainRegistryDir;
  ensureDirSync(regDir);
  Deno.writeTextFileSync(path.join(regDir, "levain.levain.yaml"), "version: 1.1.0\n");
  const regRepo = new FileSystemRepository(config, regDir);
  await regRepo.init();
  assertEquals(regRepo.resolvePackage("levain")?.name, "levain");
});
