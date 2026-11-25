import { assert, assertEquals, assertMatch, assertRejects, assertThrows } from "@std/assert";
import { stub } from "@std/testing/mock";
import * as path from "@std/path";

import GitUtils from "./git_utils.ts";
import ExtraBin from "../paths/extra_bin.ts";
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
  "git@git.example.org:team-alpha/demo-app.git",
  "https://git.example.org/team-alpha/demo-app.git",
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

Deno.test(`GitUtils - parseGitPath('git@git.example.org:team-alpha/demo-app.git#develop')`, () => {
  const gitPath = GitUtils.parseGitPath("git@git.example.org:team-alpha/demo-app.git#develop");
  assertEquals(gitPath.url, "git@git.example.org:team-alpha/demo-app.git");
  assertEquals(gitPath.branch, "develop");
  assertEquals(gitPath.user, "team-alpha");
  assertEquals(gitPath.repo, "demo-app");
});

Deno.test(`GitUtils - parseGitPath('git@git.example.org:team-alpha/demo-app.git')`, () => {
  const gitPath = GitUtils.parseGitPath("git@git.example.org:team-alpha/demo-app.git");
  assertEquals(gitPath.url, "git@git.example.org:team-alpha/demo-app.git");
  assertEquals(gitPath.branch, undefined);
  assertEquals(gitPath.user, "team-alpha");
  assertEquals(gitPath.repo, "demo-app");
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

Deno.test(`GitUtils - parseGitPath('https://git.example.org/team-alpha/demo-app.git#develop')`, () => {
  const gitPath = GitUtils.parseGitPath("https://git.example.org/team-alpha/demo-app.git#develop");
  assertEquals(gitPath.url, "https://git.example.org/team-alpha/demo-app.git");
  assertEquals(gitPath.branch, "develop");
  assertEquals(gitPath.user, "team-alpha");
  assertEquals(gitPath.repo, "demo-app");
});

Deno.test(`GitUtils - parseGitPath('https://git.example.org/team-alpha/demo-app.git')`, () => {
  const gitPath = GitUtils.parseGitPath("https://git.example.org/team-alpha/demo-app.git");
  assertEquals(gitPath.url, "https://git.example.org/team-alpha/demo-app.git");
  assertEquals(gitPath.branch, undefined);
  assertEquals(gitPath.user, "team-alpha");
  assertEquals(gitPath.repo, "demo-app");
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
Deno.test("GitUtils.clone should clone a repo", async () => {
  const tempFolder = TestHelper.getNewTempDir();
  const gitRepo = await TestHelper.createLocalGitRepo({
    "a.txt": "a\n",
    "b.txt": "b\n",
    "c.txt": "c\n",
  });

  await new GitUtils().clone(gitRepo, tempFolder);

  assertDirCountGreaterOrEqualTo(tempFolder, 3);
});
Deno.test("GitUtils.resolveGitCommand should prefer system git on PATH and fall back per OS", () => {
  const findStub = stub(OsUtils, "findInPath", () => "/usr/bin/git");
  try {
    assertEquals(GitUtils.resolveGitCommand(), "/usr/bin/git");
  } finally {
    findStub.restore();
  }

  const missingStub = stub(OsUtils, "findInPath", () => undefined);
  const winStub = stub(OsUtils, "isWindows", () => true);
  try {
    assertEquals(GitUtils.resolveGitCommand(), path.join(ExtraBin.gitDir, "cmd", "git.exe"));
  } finally {
    winStub.restore();
    missingStub.restore();
  }

  const missingStub2 = stub(OsUtils, "findInPath", () => undefined);
  const posixStub = stub(OsUtils, "isWindows", () => false);
  try {
    assertEquals(GitUtils.resolveGitCommand(), "git");
  } finally {
    posixStub.restore();
    missingStub2.restore();
  }
});

Deno.test("GitUtils.clone should pass argv array directly without shell wrapper and support spaces in destination", async () => {
  const calls: (string | string[])[] = [];
  const runStub = stub(OsUtils, "runAndLog", (cmd: string | string[]) => {
    calls.push(cmd);
    return Promise.resolve("");
  });
  const winStub = stub(OsUtils, "isWindows", () => true);

  try {
    const gitUtils = new GitUtils("git");
    await gitUtils.clone("https://github.com/jmoalves/levain.git#develop", "/tmp/my dest dir", true);

    assertEquals(calls, [[
      "git",
      "clone",
      "--progress",
      "--config",
      "core.autocrlf=true",
      "--branch=develop",
      "--single-branch",
      "--no-tags",
      "--depth",
      "1",
      "--",
      "https://github.com/jmoalves/levain.git",
      "/tmp/my dest dir",
    ]]);
  } finally {
    winStub.restore();
    runStub.restore();
  }

  const posixCalls: (string | string[])[] = [];
  const runStub2 = stub(OsUtils, "runAndLog", (cmd: string | string[]) => {
    posixCalls.push(cmd);
    return Promise.resolve("");
  });
  const posixStub = stub(OsUtils, "isWindows", () => false);

  try {
    const gitUtils = new GitUtils("git");
    await gitUtils.clone("https://github.com/jmoalves/levain.git#develop", "/tmp/my dest dir", true);

    assertEquals(posixCalls, [[
      "git",
      "clone",
      "--progress",
      "--branch=develop",
      "--single-branch",
      "--no-tags",
      "--depth",
      "1",
      "--",
      "https://github.com/jmoalves/levain.git",
      "/tmp/my dest dir",
    ]]);
  } finally {
    posixStub.restore();
    runStub2.restore();
  }
});
Deno.test("GitUtils.clone should clone into a destination path containing spaces", async () => {
  const parent = TestHelper.getNewTempDir();
  const dstWithSpaces = path.join(parent, "cloned repo dir");
  const gitRepo = await TestHelper.createLocalGitRepo({ "hello.txt": "hi\n" });

  await new GitUtils().clone(gitRepo, dstWithSpaces, true);

  assertEquals((await Deno.readTextFile(path.join(dstWithSpaces, "hello.txt"))).trim(), "hi");
});
Deno.test({
  name: "GitUtils.update should succeed when repository is already up to date",
  fn: async () => {
    const tempFolder = TestHelper.getNewTempDir();
    const gitRepo = await TestHelper.createLocalGitRepo({
      "a.txt": "a\n",
      "b.txt": "b\n",
      "c.txt": "c\n",
    });

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
    const gitRepo = await TestHelper.createLocalGitRepo({ "a.txt": "a\n" });

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
    const gitRepo = await TestHelper.createLocalGitRepo({ "a.txt": "a\n" });

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
Deno.test("GitUtils.gitRoot returns the closest ancestor containing a .git dir", async () => {
  const tempFolder = TestHelper.getNewTempDir();
  const gitRepo = await TestHelper.createLocalGitRepo({ "a.txt": "a\n" });

  await new GitUtils().clone(gitRepo, tempFolder);

  const nestedDir = path.resolve(tempFolder, "some", "nested", "dir");
  await Deno.mkdir(nestedDir, { recursive: true });

  assertEquals(GitUtils.gitRoot(nestedDir), tempFolder);
});

Deno.test("GitUtils.gitRoot returns undefined when no ancestor has a .git dir", () => {
  const tempFolder = TestHelper.getNewTempDir();

  assertEquals(GitUtils.gitRoot(tempFolder), undefined);
});

Deno.test("GitUtils.gitRoot ignores directories it can't access due to permission errors", () => {
  const tempFolder = TestHelper.getNewTempDir();

  const lstatStub = stub(
    Deno,
    "lstatSync",
    () => {
      throw new Deno.errors.NotCapable("Requires all access to some UNC path");
    },
  );

  try {
    assertEquals(GitUtils.gitRoot(tempFolder), undefined);
  } finally {
    lstatStub.restore();
  }
});

Deno.test("GitUtils.gitRoot ignores directories with PermissionDenied errors", () => {
  const tempFolder = TestHelper.getNewTempDir();

  const lstatStub = stub(
    Deno,
    "lstatSync",
    () => {
      throw new Deno.errors.PermissionDenied("Permission denied");
    },
  );

  try {
    assertEquals(GitUtils.gitRoot(tempFolder), undefined);
  } finally {
    lstatStub.restore();
  }
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
    assertMatch(lastMessage, /^ERROR git error - try 3 - Error: Error 128/m);
    // assertMatch(lastMessage, /fatal: not in a git directory/)
  },
});

Deno.test("GitUtils.clone rethrows OsUtils.runAndLog failure and cleans up timer", async () => {
  const runStub = stub(OsUtils, "runAndLog", () => Promise.reject(new Error("clone failed")));
  try {
    await assertRejects(
      () => new GitUtils("git").clone("https://github.com/jmoalves/levain.git", TestHelper.getNewTempDir()),
      Error,
      "clone failed",
    );
  } finally {
    runStub.restore();
  }
});

Deno.test("GitUtils.update fast-forwards when remote advances and handles invalid upstream / detached HEAD", async () => {
  // 1. Fast-forward real repo when remote gets a new commit
  const remote = TestHelper.getNewTempDir();
  const clone1 = TestHelper.getNewTempDir();
  const clone2 = TestHelper.getNewTempDir();
  await OsUtils.runAndLog(["git", "init", "--bare", remote]);
  await OsUtils.runAndLog(["git", "clone", remote, clone1]);
  await OsUtils.runAndLog(["git", "config", "user.email", "test@test.com"], clone1);
  await OsUtils.runAndLog(["git", "config", "user.name", "Test"], clone1);
  await Deno.writeTextFile(path.join(clone1, "v1.txt"), "1");
  await OsUtils.runAndLog(["git", "add", "."], clone1);
  await OsUtils.runAndLog(["git", "commit", "-m", "v1"], clone1);
  await OsUtils.runAndLog(["git", "push"], clone1);

  await OsUtils.runAndLog(["git", "clone", remote, clone2]);

  // Push second commit from clone1
  await Deno.writeTextFile(path.join(clone1, "v2.txt"), "2");
  await OsUtils.runAndLog(["git", "add", "."], clone1);
  await OsUtils.runAndLog(["git", "commit", "-m", "v2"], clone1);
  await OsUtils.runAndLog(["git", "push"], clone1);

  await new GitUtils().update(clone2);
  assertEquals(await Deno.readTextFile(path.join(clone2, "v2.txt")), "2");

  // 2. Invalid upstream without '/' falls back to current branch, and detached HEAD (empty branch) fails without retry
  const runStub = stub(OsUtils, "runAndLog", (cmd: string | string[]) => {
    const args = Array.isArray(cmd) ? cmd : cmd.split(" ");
    if (args.includes("@{u}")) return Promise.resolve("no-slash-upstream\n");
    if (args.includes("--show-current")) return Promise.resolve("\n");
    return Promise.resolve("");
  });
  try {
    await assertRejects(() => new GitUtils("git").update(clone2), Error);
  } finally {
    runStub.restore();
  }

  // 3. gitRoot rethrows unexpected non-permission errors
  const lstatStub = stub(Deno, "lstatSync", () => {
    throw new Error("unexpected fs error");
  });
  try {
    assertThrows(() => GitUtils.gitRoot(clone2), Error, "unexpected fs error");
  } finally {
    lstatStub.restore();
  }
});
