import { assertEquals, assertThrows } from "@std/assert";

import PackageManager from "./package_manager.ts";
import TestHelper from "../test/test_helper.ts";
import MockRepository from "../repository/mock_repository.ts";
import { MockPackage } from "./mock_package.ts";
import VersionNumber from "../utils/version_number.ts";
import Config from "../config.ts";

Deno.test("Managers should resolve empty packages list", () => {
  // Given
  const config = TestHelper.getConfig();
  const manager = new PackageManager(config);
  // When
  const resolvedPackages = manager.resolvePackages([]);
  // Then
  assertEquals(resolvedPackages, []);
});

Deno.test("Managers should resolve packages without dependencies", async () => {
  // Given
  const config = await getConfigWithMockRepo();
  const manager = new PackageManager(config);
  // When
  const resolvedPackages = manager.resolvePackages(["package without dependencies"]);
  // Then
  const packageNames = resolvedPackages?.map((it) => it.name);
  assertEquals(packageNames, ["package without dependencies"]);
});

Deno.test("Managers should resolve packages with 1 dependency", async () => {
  // Given
  const config = await getConfigWithMockRepo();
  const manager = new PackageManager(config);
  // When
  const resolvedPackages = manager.resolvePackages(["package with a dependency"]);
  // Then
  const packageNames = resolvedPackages?.map((it) => it.name);
  assertEquals(packageNames, ["a dependency", "package with a dependency"]);
});

Deno.test("Managers should resolve packages with a transitive dependency", async () => {
  // Given
  const config = await getConfigWithMockRepo();
  const manager = new PackageManager(config);
  // When
  const resolvedPackages = manager.resolvePackages(["package with a transitive dependency"]);
  // Then
  const packageNames = resolvedPackages?.map((it) => it.name);
  assertEquals(packageNames, [
    "transitive dependency",
    "dependency with transitive",
    "package with a transitive dependency",
  ]);
});

Deno.test("Managers should not crash with empty package", async () => {
  // Given
  const config = await getConfigWithMockRepo();
  const manager = new PackageManager(config);
  // When
  const resolvedPackages = manager.resolvePackages([
    "package without dependencies",
    "",
    " ",
    "package with a transitive dependency",
  ]);
  // Then
  const packageNames = resolvedPackages?.map((it) => it.name);
  assertEquals(packageNames, [
    "package without dependencies",
    "transitive dependency",
    "dependency with transitive",
    "package with a transitive dependency",
  ]);
});

Deno.test("Managers should ignore empty package", () => {
  // Given
  const packageNames = ["package without dependencies", "", " ", "package with a transitive dependency"];
  // When
  PackageManager.removeExtension(packageNames);
  // Then
  assertEquals(packageNames, ["package without dependencies", "package with a transitive dependency"]);
});

Deno.test("PackageManager should return null without false cycle error when two packages share a missing dependency", async () => {
  const config = TestHelper.getConfig();
  const repoMock = new MockRepository("mockRepoMissing", [
    new MockPackage("pkg-a", new VersionNumber("1.0.0"), "mockA", ["missing-shared"]),
    new MockPackage("pkg-b", new VersionNumber("1.0.0"), "mockB", ["missing-shared"]),
  ]);
  await repoMock.init();
  config.repositoryManager.repository = repoMock;

  const manager = new PackageManager(config);
  assertEquals(manager.resolvePackages(["pkg-a", "pkg-b"], false, false), null);
});

Deno.test("PackageManager should throw Error on actual circular dependencies", async () => {
  const config = TestHelper.getConfig();
  const repoMock = new MockRepository("mockRepoCycle", [
    new MockPackage("cycle-a", new VersionNumber("1.0.0"), "mockA", ["cycle-b"]),
    new MockPackage("cycle-b", new VersionNumber("1.0.0"), "mockB", ["cycle-a"]),
  ]);
  await repoMock.init();
  config.repositoryManager.repository = repoMock;

  const manager = new PackageManager(config);
  assertThrows(
    () => manager.resolvePackages(["cycle-a"], false, false),
    Error,
    "Circular dependencies found at cycle-a",
  );
});

async function getConfigWithMockRepo(): Promise<Config> {
  const config = TestHelper.getConfig();
  const repoMock = new MockRepository("mockRepo1", [
    new MockPackage("package without dependencies", new VersionNumber("1.0.0")),

    new MockPackage("package with a dependency", new VersionNumber("2.0.0"), "mockPath", ["a dependency"]),
    new MockPackage("a dependency", new VersionNumber("2.0.0")),

    new MockPackage("package with a transitive dependency", new VersionNumber("2.0.0"), "mockPath", [
      "dependency with transitive",
    ]),
    new MockPackage("dependency with transitive", new VersionNumber("2.0.0"), "mockPath", ["transitive dependency"]),
    new MockPackage("transitive dependency", new VersionNumber("2.0.0")),
  ]);
  await repoMock.init();
  config.repositoryManager.repository = repoMock;
  return config;
}
