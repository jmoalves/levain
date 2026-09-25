import { assert, assertEquals, assertMatch, assertRejects, assertThrows } from "@std/assert";

import GitUtils from "./git_utils.ts";
import TestHelper from "../test/test_helper.ts";
import { assertDirCountGreaterOrEqualTo } from "../test/more_asserts.ts";
import OsUtils from "../os/os_utils.ts";
import t from "../i18n.ts";

const validUrls = [
  "git@github.com:jmoalves/levain.git",
  "https://github.com/jmoalves/levain.git",
  "git@github.com:jmoalves/levain.git#master",
  "git@github.com:jmoalves/levain.git#develop",
  "git@github.com:jmoalves/levain.git#some-branch-name",
  "git@github.com:jmoalves/levain.git#some_branch_name",
  "https://github.com/jmoalves/levain.git#develop",
  "git@gitlab.bndes.net:sist-pme/pme.git",
  "https://gitlab.bndes.net/sist-pme/pme.git",
  "git@gitlab.com:scout-manager/scout-manager-app.git",
  "https://gitlab.com/scout-manager/scout-manager-app.git",
];
validUrls.forEach((gitPath) => {
  Deno.test(`GitUtils - isGitPath(${gitPath})`, () => {
    assert(GitUtils.isGitPath(gitPath));
  });
});

const invalidUrls = [
  "C:\\test\\gitfile",
  "https://my.git.com/file.git.cmd",
];
invalidUrls.forEach((gitPath) => {
  Deno.test(`GitUtils - isGitPath(${gitPath})`, () => {
    assert(!GitUtils.isGitPath(gitPath));
  });
});

Deno.test(`GitUtils - parseGitPath('git@github.com:jmoalves/levain.git#develop')`, () => {
  const gitPath = GitUtils.parseGitPath("git@github.com:jmoalves/levain.git#develop");
  assertEquals(gitPath.url, "git@github.com:jmoalves/levain.git");
  assertEquals(gitPath.branch, "develop");
  assertEquals(gitPath.user, "jmoalves");
  assertEquals(gitPath.repo, "levain");
});

Deno.test(`GitUtils - parseGitPath('git@github.com:jmoalves/levain.git')`, () => {
  const gitPath = GitUtils.parseGitPath("git@github.com:jmoalves/levain.git");
  assertEquals(gitPath.url, "git@github.com:jmoalves/levain.git");
  assertEquals(gitPath.branch, undefined);
  assertEquals(gitPath.user, "jmoalves");
  assertEquals(gitPath.repo, "levain");
});

Deno.test(`GitUtils - parseGitPath('git@gitlab.bndes.net:sist-pme/pme.git#develop')`, () => {
  const gitPath = GitUtils.parseGitPath("git@gitlab.bndes.net:sist-pme/pme.git#develop");
  assertEquals(gitPath.url, "git@gitlab.bndes.net:sist-pme/pme.git");
  assertEquals(gitPath.branch, "develop");
  assertEquals(gitPath.user, "sist-pme");
  assertEquals(gitPath.repo, "pme");
});

Deno.test(`GitUtils - parseGitPath('git@gitlab.bndes.net:sist-pme/pme.git')`, () => {
  const gitPath = GitUtils.parseGitPath("git@gitlab.bndes.net:sist-pme/pme.git");
  assertEquals(gitPath.url, "git@gitlab.bndes.net:sist-pme/pme.git");
  assertEquals(gitPath.branch, undefined);
  assertEquals(gitPath.user, "sist-pme");
  assertEquals(gitPath.repo, "pme");
});

Deno.test(`GitUtils - parseGitPath('https://github.com/jmoalves/levain.git#develop')`, () => {
  const gitPath = GitUtils.parseGitPath("https://github.com/jmoalves/levain.git#develop");
  assertEquals(gitPath.url, "https://github.com/jmoalves/levain.git");
  assertEquals(gitPath.branch, "develop");
  assertEquals(gitPath.user, "jmoalves");
  assertEquals(gitPath.repo, "levain");
});

Deno.test(`GitUtils - parseGitPath('https://github.com/jmoalves/levain.git')`, () => {
  const gitPath = GitUtils.parseGitPath("https://github.com/jmoalves/levain.git");
  assertEquals(gitPath.url, "https://github.com/jmoalves/levain.git");
  assertEquals(gitPath.branch, undefined);
  assertEquals(gitPath.user, "jmoalves");
  assertEquals(gitPath.repo, "levain");
});

Deno.test(`GitUtils - parseGitPath('https://gitlab.bndes.net/sist-pme/pme.git#develop')`, () => {
  const gitPath = GitUtils.parseGitPath("https://gitlab.bndes.net/sist-pme/pme.git#develop");
  assertEquals(gitPath.url, "https://gitlab.bndes.net/sist-pme/pme.git");
  assertEquals(gitPath.branch, "develop");
  assertEquals(gitPath.user, "sist-pme");
  assertEquals(gitPath.repo, "pme");
});

Deno.test(`GitUtils - parseGitPath('https://gitlab.bndes.net/sist-pme/pme.git')`, () => {
  const gitPath = GitUtils.parseGitPath("https://gitlab.bndes.net/sist-pme/pme.git");
  assertEquals(gitPath.url, "https://gitlab.bndes.net/sist-pme/pme.git");
  assertEquals(gitPath.branch, undefined);
  assertEquals(gitPath.user, "sist-pme");
  assertEquals(gitPath.repo, "pme");
});

Deno.test(`GitUtils - localBaseDir()`, () => {
  assertEquals(GitUtils.localBaseDir("git@github.com:jmoalves/levain.git"), "git_github.com_jmoalves_levain");
  assertEquals(
    GitUtils.localBaseDir("git@github.com:jmoalves/levain.git#develop"),
    "git_github.com_jmoalves_levain_develop",
  );
  assertEquals(
    GitUtils.localBaseDir("https://gitlab.com/scout-manager/scout-manager-app.git"),
    "https_gitlab.com_scout-manager_scout-manager-app",
  );
  assertEquals(
    GitUtils.localBaseDir("https://gitlab.com/scout-manager/scout-manager-app.git#develop"),
    "https_gitlab.com_scout-manager_scout-manager-app_develop",
  );
});
Deno.test("GitUtils.checkGitPath should throw error if url is invalid", () => {
  assertThrows(
    () => {
      GitUtils.checkGitPath("thisFolderDoesNotExist");
    },
    Error,
    "Invalid git url - thisFolderDoesNotExist",
  );
});
Deno.test("GitUtils.localBaseDir should throw error if url is invalid", () => {
  assertThrows(
    () => {
      GitUtils.localBaseDir("thisFolderDoesNotExist");
    },
    Error,
    "Invalid git url - thisFolderDoesNotExist",
  );
});

Deno.test("GitUtils.clone should throw error if url is invalid", async () => {
  await assertRejects(
    async () => {
      await new GitUtils().clone("thisSourceDoesNotExist", "thisDstDoesNotExist");
    },
    Error,
    "Invalid git url - thisSourceDoesNotExist",
  );
});
Deno.test("GitUtils.checkGitPath should throw error if url is invalid", () => {
  assertThrows(
    () => {
      GitUtils.checkGitPath("thisFolderDoesNotExist");
    },
    Error,
    "Invalid git url - thisFolderDoesNotExist",
  );
});
Deno.test("GitUtils.localBaseDir should throw error if url is invalid", () => {
  assertThrows(
    () => {
      GitUtils.localBaseDir("thisFolderDoesNotExist");
    },
    Error,
    "Invalid git url - thisFolderDoesNotExist",
  );
});
Deno.test("GitUtils.clone should throw error if url is invalid", async () => {
  await assertRejects(
    async () => {
      await new GitUtils().clone("thisSourceDoesNotExist", "thisDstDoesNotExist");
    },
    Error,
    "Invalid git url - thisSourceDoesNotExist",
  );
});
Deno.test("GitUtils.checkGitPath should throw error if url is invalid", () => {
  assertThrows(
    () => {
      GitUtils.checkGitPath("thisFolderDoesNotExist");
    },
    Error,
    "Invalid git url - thisFolderDoesNotExist",
  );
});
Deno.test("GitUtils.localBaseDir should throw error if url is invalid", () => {
  assertThrows(
    () => {
      GitUtils.localBaseDir("thisFolderDoesNotExist");
    },
    Error,
    "Invalid git url - thisFolderDoesNotExist",
  );
});
Deno.test("GitUtils.clone should throw error if url is invalid", async () => {
  await assertRejects(
    async () => {
      await new GitUtils().clone("thisSourceDoesNotExist", "thisDstDoesNotExist");
    },
    Error,
    "Invalid git url - thisSourceDoesNotExist",
  );
});
Deno.test("GitUtils.clone should clone a repo", async () => {
  const tempFolder = TestHelper.getNewTempDir();
  const gitRepo = "https://github.com/begin-examples/deno-hello-world.git";

  await new GitUtils().clone(gitRepo, tempFolder);

  assertDirCountGreaterOrEqualTo(tempFolder, 3);
});
Deno.test({
  name: "GitUtils.update should succeed when repository is already up to date",
  fn: async () => {
    const tempFolder = TestHelper.getNewTempDir();
    const gitRepo = "https://github.com/begin-examples/deno-hello-world.git";

    const gitUtils = new GitUtils();

    await gitUtils.clone(gitRepo, tempFolder);

    await gitUtils.update(tempFolder);
    await gitUtils.update(tempFolder);

    assertDirCountGreaterOrEqualTo(tempFolder, 3);
  },
});
Deno.test({
  name: "GitUtils.update should fail when local branch is ahead of remote",
  fn: async () => {
    const tempFolder = TestHelper.getNewTempDir();
    const gitRepo = "https://github.com/begin-examples/deno-hello-world.git";

    const gitUtils = new GitUtils();

    await gitUtils.clone(gitRepo, tempFolder);

    await OsUtils.runAndLog(
      ["git", "config", "user.email", "test@test.com"],
      tempFolder,
    );

    await OsUtils.runAndLog(
      ["git", "config", "user.name", "Test"],
      tempFolder,
    );

    await Deno.writeTextFile(
      `${tempFolder}/local-change.txt`,
      "local-change",
    );

    await OsUtils.runAndLog(
      ["git", "add", "."],
      tempFolder,
    );

    await OsUtils.runAndLog(
      ["git", "commit", "-m", "local commit"],
      tempFolder,
    );

    await assertRejects(
      async () => {
        await gitUtils.update(tempFolder);
      },
      Error,
    );
  },
});
Deno.test({
  name: "GitUtils.update should fail when local and remote branches diverge",
  fn: async () => {
    const remote = TestHelper.getNewTempDir();
    const clone1 = TestHelper.getNewTempDir();
    const clone2 = TestHelper.getNewTempDir();

    await OsUtils.runAndLog(
      ["git", "init", "--bare", remote],
    );

    await OsUtils.runAndLog(
      ["git", "clone", remote, clone1],
    );

    await OsUtils.runAndLog(
      ["git", "clone", remote, clone2],
    );

    for (const repo of [clone1, clone2]) {
      await OsUtils.runAndLog(
        ["git", "config", "user.email", "test@test.com"],
        repo,
      );

      await OsUtils.runAndLog(
        ["git", "config", "user.name", "Test"],
        repo,
      );
    }

    await Deno.writeTextFile(
      `${clone1}/a.txt`,
      "a",
    );

    await OsUtils.runAndLog(["git", "add", "."], clone1);
    await OsUtils.runAndLog(["git", "commit", "-m", "a"], clone1);
    await OsUtils.runAndLog(["git", "push"], clone1);

    await Deno.writeTextFile(
      `${clone2}/b.txt`,
      "b",
    );

    await OsUtils.runAndLog(["git", "add", "."], clone2);
    await OsUtils.runAndLog(["git", "commit", "-m", "b"], clone2);

    await Deno.writeTextFile(
      `${clone1}/c.txt`,
      "c",
    );

    await OsUtils.runAndLog(["git", "add", "."], clone1);
    await OsUtils.runAndLog(["git", "commit", "-m", "c"], clone1);
    await OsUtils.runAndLog(["git", "push"], clone1);

    const gitUtils = new GitUtils();

    await assertRejects(
      async () => {
        await gitUtils.update(clone2);
      },
      Error,
    );
  },
});
Deno.test({
  name: "GitUtils.update should not retry non retryable errors",
  fn: async () => {
    const logger = await TestHelper.setupTestLogger();

    const tempFolder = TestHelper.getNewTempDir();
    const gitRepo = "https://github.com/begin-examples/deno-hello-world.git";

    const gitUtils = new GitUtils();

    await gitUtils.clone(gitRepo, tempFolder);

    await OsUtils.runAndLog(
      ["git", "config", "user.email", "test@test.com"],
      tempFolder,
    );

    await OsUtils.runAndLog(
      ["git", "config", "user.name", "Test"],
      tempFolder,
    );

    await Deno.writeTextFile(
      `${tempFolder}/local.txt`,
      "local",
    );

    await OsUtils.runAndLog(
      ["git", "add", "."],
      tempFolder,
    );

    await OsUtils.runAndLog(
      ["git", "commit", "-m", "local"],
      tempFolder,
    );

    await assertRejects(
      async () => {
        await gitUtils.update(tempFolder);
      },
      Error,
    );

    const retries = logger.messages.filter((m) =>
      m.includes("RETRY")
    );

    assertEquals(retries.length, 0);
  },
});
Deno.test({
  name: "GitUtils.update should throw an error if folder is not a git repo",
  fn: async () => {
    const testLogger = await TestHelper.setupTestLogger();

    const folder = TestHelper.folderThatAlwaysExists;
    const gitUtils = new GitUtils();

    await assertRejects(
      async () => {
        await gitUtils.update(folder);
      },
      Error,
      t("lib.utils.git_utils.unable_to_update", { workingDir: folder }),
    );

    const lastMessage = testLogger.messages[testLogger.messages.length - 1];
    assertMatch(lastMessage, /^ERROR git error - try 3 - Error 128/m);
    // assertMatch(lastMessage, /fatal: not in a git directory/)
  },
});
