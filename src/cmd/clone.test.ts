import * as path from "@std/path";
import { assert, assertEquals, assertRejects } from "@std/assert";
import { stub } from "@std/testing/mock";

import { FileUtils } from "../lib/fs/file_utils.ts";
import t from "../lib/i18n.ts";
import Loader from "../lib/loader.ts";
import TestHelper from "../lib/test/test_helper.ts";
import { assertFind } from "../lib/test/more_asserts.ts";
import GitUtils from "../lib/utils/git_utils.ts";

import Clone from "./clone.ts";
import CommandFactory from "./command_factory.ts";

Deno.test("Clone should be registered in CommandFactory", () => {
  const factory = new CommandFactory();
  const cmd = factory.get("clone", TestHelper.getConfig());
  assert(cmd instanceof Clone);
});

Deno.test("Clone should validate URL count and git path format", async () => {
  const cmd = new Clone(TestHelper.getConfig());

  await assertRejects(
    async () => await cmd.execute([]),
    Error,
    t("cmd.clone.informURL"),
  );

  await assertRejects(
    async () => await cmd.execute(["https://example.org/a/one.git", "https://example.org/a/two.git"]),
    Error,
    t("cmd.clone.justOneURL"),
  );

  await assertRejects(
    async () => await cmd.execute(["not-a-git-url"]),
    Error,
    t("cmd.clone.needGitPath", { url: "not-a-git-url" }),
  );
});

Deno.test("Clone should clone repository, chdir into repoDir, reload currentDir, and start shell", async () => {
  const expectedRepoDir = path.resolve("demo-repo");
  const chdirCalls: string[] = [];
  const cloneCalls: Array<{ url: string; dst: string }> = [];
  const commandCalls: Array<{ cmd: string; args: string[] }> = [];

  const existsStub = stub(FileUtils, "exists", () => false);
  const chdirStub = stub(Deno, "chdir", (dir: string | URL) => {
    chdirCalls.push(typeof dir === "string" ? dir : path.fromFileUrl(dir));
  });
  const gitCloneStub = stub(GitUtils.prototype, "clone", (url: string, dst: string) => {
    cloneCalls.push({ url, dst });
    return Promise.resolve();
  });
  const loaderCmdStub = stub(Loader.prototype, "command", (cmd: string, args: string[]) => {
    commandCalls.push({ cmd, args });
    return Promise.resolve();
  });

  try {
    const config = TestHelper.getConfig();
    const reloadStub = stub(config.repositoryManager, "reloadCurrentDir", () => Promise.resolve());
    try {
      const cmd = new Clone(config);
      await cmd.execute(["https://example.org/acme/demo-repo.git"]);

      assertEquals(cloneCalls, [{ url: "https://example.org/acme/demo-repo.git", dst: expectedRepoDir }]);
      assertEquals(chdirCalls, [expectedRepoDir]);
      assertEquals(reloadStub.calls.length, 1);
      assertEquals(commandCalls, [{ cmd: "shell", args: [] }]);
    } finally {
      reloadStub.restore();
    }
  } finally {
    loaderCmdStub.restore();
    gitCloneStub.restore();
    chdirStub.restore();
    existsStub.restore();
  }
});

Deno.test("Clone --dirs should create user directory before cloning repository", async () => {
  const expectedParentDir = path.resolve("acme");
  const expectedRepoDir = path.resolve("demo-repo");
  const ensureDirCalls: string[] = [];
  const chdirCalls: string[] = [];
  const cloneCalls: Array<{ url: string; dst: string }> = [];

  const ensureDirStub = stub(FileUtils, "ensureDirSync", (dir: string) => {
    ensureDirCalls.push(dir);
  });
  const existsStub = stub(FileUtils, "exists", (p: string) => p === expectedParentDir);
  const isDirStub = stub(FileUtils, "isDir", (p: string) => p === expectedParentDir);
  const chdirStub = stub(Deno, "chdir", (dir: string | URL) => {
    chdirCalls.push(typeof dir === "string" ? dir : path.fromFileUrl(dir));
  });
  const gitCloneStub = stub(GitUtils.prototype, "clone", (url: string, dst: string) => {
    cloneCalls.push({ url, dst });
    return Promise.resolve();
  });
  const loaderCmdStub = stub(Loader.prototype, "command", () => Promise.resolve());

  try {
    const config = TestHelper.getConfig();
    const reloadStub = stub(config.repositoryManager, "reloadCurrentDir", () => Promise.resolve());
    try {
      const cmd = new Clone(config);
      await cmd.execute(["--dirs", "https://example.org/acme/demo-repo.git"]);

      assertEquals(ensureDirCalls, [expectedParentDir]);
      assertEquals(chdirCalls, [expectedParentDir, expectedRepoDir]);
      assertEquals(cloneCalls, [{ url: "https://example.org/acme/demo-repo.git", dst: expectedRepoDir }]);
    } finally {
      reloadStub.restore();
    }
  } finally {
    loaderCmdStub.restore();
    gitCloneStub.restore();
    chdirStub.restore();
    isDirStub.restore();
    existsStub.restore();
    ensureDirStub.restore();
  }
});

Deno.test("Clone should skip git clone and warn when target directory already exists", async () => {
  const logger = await TestHelper.setupTestLogger();
  const expectedRepoDir = path.resolve("existing-repo");

  const existsStub = stub(FileUtils, "exists", (p: string) => p === expectedRepoDir);
  const chdirStub = stub(Deno, "chdir", () => {});
  const gitCloneStub = stub(GitUtils.prototype, "clone", () => Promise.resolve());
  const loaderCmdStub = stub(Loader.prototype, "command", () => Promise.resolve());

  try {
    const config = TestHelper.getConfig();
    const reloadStub = stub(config.repositoryManager, "reloadCurrentDir", () => Promise.resolve());
    try {
      const cmd = new Clone(config);
      await cmd.execute(["https://example.org/acme/existing-repo.git"]);

      assertEquals(gitCloneStub.calls.length, 0);
      assertFind(logger.messages, (msg) => msg.includes(t("cmd.clone.dirExists", { dir: expectedRepoDir })));
    } finally {
      reloadStub.restore();
    }
  } finally {
    loaderCmdStub.restore();
    gitCloneStub.restore();
    chdirStub.restore();
    existsStub.restore();
  }
});

Deno.test("Clone should preserve #branch in URL and fall back to basename for non-GitHub git URLs", async () => {
  const expectedRepoDir = path.resolve("my-bare-repo");
  const cloneCalls: Array<{ url: string; dst: string }> = [];

  const existsStub = stub(FileUtils, "exists", () => false);
  const chdirStub = stub(Deno, "chdir", () => {});
  const gitCloneStub = stub(GitUtils.prototype, "clone", (url: string, dst: string) => {
    cloneCalls.push({ url, dst });
    return Promise.resolve();
  });
  const loaderCmdStub = stub(Loader.prototype, "command", () => Promise.resolve());

  try {
    const config = TestHelper.getConfig();
    const reloadStub = stub(config.repositoryManager, "reloadCurrentDir", () => Promise.resolve());
    try {
      const cmd = new Clone(config);
      await cmd.execute(["/local/path/my-bare-repo.git#develop"]);

      assertEquals(cloneCalls, [{ url: "/local/path/my-bare-repo.git#develop", dst: expectedRepoDir }]);

      // --dirs without recognizable user segment should reject clearly
      await assertRejects(
        async () => await cmd.execute(["--dirs", "/local/path/my-bare-repo.git"]),
        Error,
        t("cmd.clone.invalidDir", { dir: "/local/path/my-bare-repo.git" }),
      );
    } finally {
      reloadStub.restore();
    }
  } finally {
    loaderCmdStub.restore();
    gitCloneStub.restore();
    chdirStub.restore();
    existsStub.restore();
  }
});
