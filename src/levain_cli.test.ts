import { assert, assertEquals, assertRejects } from "@std/assert";
import { stub } from "@std/testing/mock";

import { CommandNotFoundError } from "./cmd/command_factory.ts";
import LevainCli from "./levain_cli.ts";
import CliUtil from "./lib/cli_util.ts";
import Config from "./lib/config.ts";
import t from "./lib/i18n.ts";
import Loader from "./lib/loader.ts";
import ConsoleAndFileLogger from "./lib/logger/console_and_file_logger.ts";
import OsUtils from "./lib/os/os_utils.ts";
import LevainReleases from "./lib/releases/levain_releases.ts";
import RepositoryManager from "./lib/repository/repository_manager.ts";
import TestHelper from "./lib/test/test_helper.ts";
import { assertFind } from "./lib/test/more_asserts.ts";
import { UserInfo } from "./lib/user_info/user_info.ts";
import UserInfoUtil from "./lib/user_info/userinfo_util.ts";

Deno.test("LevainCli with no command should print CLI help and not save config", async () => {
  const logger = await TestHelper.setupTestLogger();
  const saveStub = stub(Config.prototype, "save", () => {});
  const repoInitStub = stub(RepositoryManager.prototype, "init", () => Promise.resolve([]));

  try {
    const cli = new LevainCli();
    await cli.execute({ _: [] });

    assertFind(logger.messages, (msg) => msg.includes(t("levain_cli.availableCommands")));
    assertEquals(saveStub.calls.length, 0);
    assertEquals(repoInitStub.calls.length, 0);
  } finally {
    repoInitStub.restore();
    saveStub.restore();
  }
});

Deno.test("LevainCli should dispatch command, pass repo flags, apply shellPath, and save config", async () => {
  const prevConfig = ConsoleAndFileLogger.config;
  const tempHome = TestHelper.getNewTempDir();
  const fakeShell = TestHelper.getNewTempFile();
  const repoInitArgs: Array<{ extraRepos: string[]; tempRepos?: string[] }> = [];
  const commandCalls: Array<{ cmd: string; args: string[] }> = [];

  const randomStub = stub(Math, "random", () => 0);
  const sanitizeStub = stub(OsUtils, "sanitizeUserPath", () => Promise.resolve());
  const repoInitStub = stub(RepositoryManager.prototype, "init", (opts) => {
    repoInitArgs.push(opts);
    return Promise.resolve([]);
  });
  const saveStub = stub(Config.prototype, "save", () => {});
  const releaseStub = stub(LevainReleases.prototype, "checkLevainUpdate", () => Promise.resolve());
  const loaderCmdStub = stub(Loader.prototype, "command", (cmd: string, args: string[]) => {
    commandCalls.push({ cmd, args });
    return Promise.resolve();
  });

  try {
    const cli = new LevainCli();
    await cli.execute({
      _: ["list", "jdk"],
      levainHome: [tempHome],
      addRepo: ["/extra/repo"],
      tempRepo: ["/temp/repo"],
      shellPath: fakeShell,
      "skip-levain-updates": true,
    });

    assertEquals(releaseStub.calls.length, 0);
    assertEquals(repoInitArgs, [{ extraRepos: ["/extra/repo"], tempRepos: ["/temp/repo"] }]);
    assertEquals(sanitizeStub.calls.length, 1);
    assertEquals(commandCalls, [{ cmd: "list", args: ["jdk"] }]);
    assertEquals(saveStub.calls.length, 1);
    assertEquals(ConsoleAndFileLogger.config?.shellPath, fakeShell);
  } finally {
    loaderCmdStub.restore();
    releaseStub.restore();
    saveStub.restore();
    repoInitStub.restore();
    sanitizeStub.restore();
    randomStub.restore();
    ConsoleAndFileLogger.config = prevConfig;
  }
});

Deno.test("LevainCli should check for Levain updates unless --skip-levain-updates is set", async () => {
  const prevConfig = ConsoleAndFileLogger.config;
  const tempHome = TestHelper.getNewTempDir();

  const randomStub = stub(Math, "random", () => 0);
  const sanitizeStub = stub(OsUtils, "sanitizeUserPath", () => Promise.resolve());
  const repoInitStub = stub(RepositoryManager.prototype, "init", () => Promise.resolve([]));
  const saveStub = stub(Config.prototype, "save", () => {});
  const releaseStub = stub(LevainReleases.prototype, "checkLevainUpdate", () => Promise.resolve());
  const loaderCmdStub = stub(Loader.prototype, "command", () => Promise.resolve());

  try {
    const cli = new LevainCli();
    await cli.execute({
      _: ["actions"],
      levainHome: [tempHome],
    });

    assertEquals(releaseStub.calls.length, 1);
  } finally {
    loaderCmdStub.restore();
    releaseStub.restore();
    saveStub.restore();
    repoInitStub.restore();
    sanitizeStub.restore();
    randomStub.restore();
    ConsoleAndFileLogger.config = prevConfig;
  }
});

Deno.test("LevainCli should invoke UserInfoUtil.askUserInfo for install command", async () => {
  const prevConfig = ConsoleAndFileLogger.config;
  const tempHome = TestHelper.getNewTempDir();

  const randomStub = stub(Math, "random", () => 0);
  const sanitizeStub = stub(OsUtils, "sanitizeUserPath", () => Promise.resolve());
  const repoInitStub = stub(RepositoryManager.prototype, "init", () => Promise.resolve([]));
  const saveStub = stub(Config.prototype, "save", () => {});
  const askUserStub = stub(UserInfoUtil.prototype, "askUserInfo", () => Promise.resolve(new UserInfo()));
  const loaderCmdStub = stub(Loader.prototype, "command", () => Promise.resolve());

  try {
    const cli = new LevainCli();
    await cli.execute({
      _: ["install", "git"],
      levainHome: [tempHome],
      "skip-levain-updates": true,
    });

    assertEquals(askUserStub.calls.length, 1);
  } finally {
    loaderCmdStub.restore();
    askUserStub.restore();
    saveStub.restore();
    repoInitStub.restore();
    sanitizeStub.restore();
    randomStub.restore();
    ConsoleAndFileLogger.config = prevConfig;
  }
});

Deno.test("LevainCli should trigger random clean before non-clean commands when Math.random() > 0.75", async () => {
  const prevConfig = ConsoleAndFileLogger.config;
  const tempHome = TestHelper.getNewTempDir();
  const commandCalls: Array<{ cmd: string; args: string[] }> = [];

  const randomStub = stub(Math, "random", () => 0.99);
  const sanitizeStub = stub(OsUtils, "sanitizeUserPath", () => Promise.resolve());
  const repoInitStub = stub(RepositoryManager.prototype, "init", () => Promise.resolve([]));
  const saveStub = stub(Config.prototype, "save", () => {});
  const loaderCmdStub = stub(Loader.prototype, "command", (cmd: string, args: string[]) => {
    commandCalls.push({ cmd, args });
    return Promise.resolve();
  });

  try {
    const cli = new LevainCli();
    // TODO(phase-4.5): Remove random auto-clean side-effect from read-only/helper commands.
    await cli.execute({
      _: ["actions"],
      levainHome: [tempHome],
      "skip-levain-updates": true,
    });

    assertEquals(commandCalls, [
      { cmd: "clean", args: [] },
      { cmd: "actions", args: [] },
    ]);

    // When command is already "clean", do not invoke clean twice
    commandCalls.length = 0;
    await cli.execute({
      _: ["clean"],
      levainHome: [tempHome],
      "skip-levain-updates": true,
    });
    assertEquals(commandCalls, [{ cmd: "clean", args: [] }]);
  } finally {
    loaderCmdStub.restore();
    saveStub.restore();
    repoInitStub.restore();
    sanitizeStub.restore();
    randomStub.restore();
    ConsoleAndFileLogger.config = prevConfig;
  }
});

Deno.test("LevainCli should show CLI help and rethrow CommandNotFoundError on unknown command", async () => {
  const logger = await TestHelper.setupTestLogger();
  const prevConfig = ConsoleAndFileLogger.config;
  const tempHome = TestHelper.getNewTempDir();

  const randomStub = stub(Math, "random", () => 0);
  const sanitizeStub = stub(OsUtils, "sanitizeUserPath", () => Promise.resolve());
  const repoInitStub = stub(RepositoryManager.prototype, "init", () => Promise.resolve([]));
  const saveStub = stub(Config.prototype, "save", () => {});

  try {
    const cli = new LevainCli();
    await assertRejects(
      async () =>
        await cli.execute({
          _: ["nonexistent-cmd"],
          levainHome: [tempHome],
          "skip-levain-updates": true,
        }),
      CommandNotFoundError,
    );

    assertFind(logger.messages, (msg) => msg.includes(t("levain_cli.availableCommands")));
    assertEquals(saveStub.calls.length, 0);
  } finally {
    saveStub.restore();
    repoInitStub.restore();
    sanitizeStub.restore();
    randomStub.restore();
    ConsoleAndFileLogger.config = prevConfig;
  }
});

Deno.test("LevainCli should call CliUtil.askToContinue when --wait-to-begin is passed", async () => {
  let asked = false;
  const askStub = stub(CliUtil, "askToContinue", () => {
    asked = true;
  });

  try {
    const cli = new LevainCli();
    await cli.execute({ _: [], "wait-to-begin": true });
    assert(asked, "askToContinue should have been called");
  } finally {
    askStub.restore();
  }
});
