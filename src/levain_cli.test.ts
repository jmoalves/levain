import { assert, assertEquals, assertRejects } from "@std/assert";
import { stub } from "@std/testing/mock";

import { CommandNotFoundError } from "./cmd/command_factory.ts";
import LevainCli from "./levain_cli.ts";
import CliUtil from "./lib/cli_util.ts";
import Config from "./lib/config.ts";
import Loader from "./lib/loader.ts";
import ConsoleAndFileLogger from "./lib/logger/console_and_file_logger.ts";
import OsUtils from "./lib/os/os_utils.ts";
import HomePaths from "./lib/paths/home_paths.ts";
import LevainReleases from "./lib/releases/levain_releases.ts";
import RepositoryManager from "./lib/repository/repository_manager.ts";
import TestHelper from "./lib/test/test_helper.ts";
import { assertFind } from "./lib/test/more_asserts.ts";
import { UserInfo } from "./lib/user_info/user_info.ts";
import UserInfoUtil from "./lib/user_info/userinfo_util.ts";
import DateUtils from "./lib/utils/date_utils.ts";
import { InstanceLock, InstanceLockError } from "./lib/fs/instance_lock.ts";

Deno.test("LevainCli with no command should print CLI help and not save config", async () => {
  const logger = await TestHelper.setupTestLogger();
  const saveStub = stub(Config.prototype, "save", () => {});
  const repoInitStub = stub(RepositoryManager.prototype, "init", () => Promise.resolve([]));

  try {
    const cli = new LevainCli();
    await cli.execute({ _: [] });

    assertFind(logger.messages, (msg) => msg.includes("Usage:") && msg.includes("levain") && msg.includes("install"));
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
  const repoInitArgs: Array<{
    extraRepos: string[];
    tempRepos?: string[];
    forceRefresh?: boolean;
    installedOnly?: boolean;
  }> = [];
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
    assertEquals(repoInitArgs, [{
      extraRepos: ["/extra/repo"],
      tempRepos: ["/temp/repo"],
      forceRefresh: false,
      installedOnly: false,
    }]);
    assertEquals(sanitizeStub.calls.length, 0, "read-only list command should skip sanitizeUserPath");
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

Deno.test("LevainCli should run deterministic daily auto-clean only on mutating commands and respect --skip-auto-clean", async () => {
  const prevConfig = ConsoleAndFileLogger.config;
  const tempHome = TestHelper.getNewTempDir();
  const commandCalls: Array<{ cmd: string; args: string[] }> = [];

  const homedirStub = stub(HomePaths, "homedir", () => tempHome);
  const sanitizeStub = stub(OsUtils, "sanitizeUserPath", () => Promise.resolve());
  const repoInitStub = stub(RepositoryManager.prototype, "init", () => Promise.resolve([]));
  const saveStub = stub(Config.prototype, "save", () => {});
  const askUserStub = stub(UserInfoUtil.prototype, "askUserInfo", () => Promise.resolve(new UserInfo()));
  const loaderCmdStub = stub(Loader.prototype, "command", (cmd: string, args: string[]) => {
    commandCalls.push({ cmd, args });
    return Promise.resolve();
  });

  try {
    const cli = new LevainCli();

    // Read-only & helper commands must NEVER trigger auto-clean
    for (const readOnlyCmd of ["actions", "list", "info", "explain", "_activate-machine", "clean"]) {
      commandCalls.length = 0;
      await cli.execute({
        _: [readOnlyCmd],
        levainHome: [tempHome],
        "skip-levain-updates": true,
      });
      assertEquals(commandCalls, [{ cmd: readOnlyCmd, args: [] }]);
    }

    // Mutating command with --skip-auto-clean skips clean
    commandCalls.length = 0;
    await cli.execute({
      _: ["update", "git"],
      levainHome: [tempHome],
      "skip-levain-updates": true,
      "skip-auto-clean": true,
    });
    assertEquals(commandCalls, [{ cmd: "update", args: ["git"] }]);

    // Mutating command when lastAutoClean != today triggers clean once and sets lastAutoClean
    commandCalls.length = 0;
    await cli.execute({
      _: ["install", "git"],
      levainHome: [tempHome],
      "skip-levain-updates": true,
    });
    assertEquals(commandCalls, [
      { cmd: "clean", args: [] },
      { cmd: "install", args: ["git"] },
    ]);
    assertEquals(ConsoleAndFileLogger.config?.lastAutoClean, DateUtils.dateTag());

    // Persist today's lastAutoClean in isolated levain.config.json -> auto-clean does NOT run again today
    await Deno.writeTextFile(
      HomePaths.levainConfigFile,
      JSON.stringify({ lastAutoClean: DateUtils.dateTag(), levainHome: tempHome }),
    );
    commandCalls.length = 0;
    await cli.execute({
      _: ["shell", "git"],
      levainHome: [tempHome],
      "skip-levain-updates": true,
    });
    assertEquals(commandCalls, [{ cmd: "shell", args: ["git"] }]);
  } finally {
    loaderCmdStub.restore();
    askUserStub.restore();
    saveStub.restore();
    repoInitStub.restore();
    sanitizeStub.restore();
    homedirStub.restore();
    ConsoleAndFileLogger.config = prevConfig;
  }
});

Deno.test("LevainCli should warn and continue executing main command if auto-clean throws", async () => {
  const logger = await TestHelper.setupTestLogger();
  const prevConfig = ConsoleAndFileLogger.config;
  const tempHome = TestHelper.getNewTempDir();
  const commandCalls: Array<{ cmd: string; args: string[] }> = [];

  const homedirStub = stub(HomePaths, "homedir", () => tempHome);
  const sanitizeStub = stub(OsUtils, "sanitizeUserPath", () => Promise.resolve());
  const repoInitStub = stub(RepositoryManager.prototype, "init", () => Promise.resolve([]));
  const saveStub = stub(Config.prototype, "save", () => {});
  const loaderCmdStub = stub(Loader.prototype, "command", (cmd: string, args: string[]) => {
    commandCalls.push({ cmd, args });
    if (cmd === "clean") {
      return Promise.reject(new Error("locked temp file"));
    }
    return Promise.resolve();
  });

  try {
    const cli = new LevainCli();
    await cli.execute({
      _: ["update", "git"],
      levainHome: [tempHome],
      "skip-levain-updates": true,
    });

    assertEquals(commandCalls, [
      { cmd: "clean", args: [] },
      { cmd: "update", args: ["git"] },
    ]);
    assertFind(logger.messages, (msg) => msg.includes("Auto-clean skipped due to error"));
    assertEquals(ConsoleAndFileLogger.config?.lastAutoClean, undefined);
  } finally {
    loaderCmdStub.restore();
    saveStub.restore();
    repoInitStub.restore();
    sanitizeStub.restore();
    homedirStub.restore();
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

    assertFind(logger.messages, (msg) => msg.includes("Usage:") && msg.includes("levain") && msg.includes("install"));
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

Deno.test("LevainCli --levain-upgrade should skip update check, reinstall levain, save config, and return cleanly", async () => {
  const prevTestMode = CliUtil.testMode;
  const prevConfig = ConsoleAndFileLogger.config;
  const tempHome = TestHelper.getNewTempDir();
  const commandCalls: Array<{ cmd: string; args: string[] }> = [];

  const sanitizeStub = stub(OsUtils, "sanitizeUserPath", () => Promise.resolve());
  const repoInitStub = stub(RepositoryManager.prototype, "init", () => Promise.resolve([]));
  const saveStub = stub(Config.prototype, "save", () => {});
  const releaseStub = stub(LevainReleases.prototype, "checkLevainUpdate", () => Promise.resolve());
  const loaderCmdStub = stub(Loader.prototype, "command", (cmd: string, args: string[]) => {
    commandCalls.push({ cmd, args });
    return Promise.resolve();
  });

  try {
    CliUtil.testMode = true;
    const cli = new LevainCli();
    await cli.execute({
      _: [],
      levainHome: [tempHome],
      "levain-upgrade": true,
    });

    assertEquals(releaseStub.calls.length, 0, "--levain-upgrade must not re-check for updates");
    assertEquals(commandCalls, [{ cmd: "install", args: ["--force", "levain"] }]);
    assertEquals(saveStub.calls.length, 1);
  } finally {
    loaderCmdStub.restore();
    releaseStub.restore();
    saveStub.restore();
    repoInitStub.restore();
    sanitizeStub.restore();
    ConsoleAndFileLogger.config = prevConfig;
    CliUtil.testMode = prevTestMode;
  }
});

Deno.test("LevainCli should skip update checks/regular repos/sanitizeUserPath on _activate-machine cmd, forceRefresh on update, and skip repo init on actions/clean", async () => {
  const prevConfig = ConsoleAndFileLogger.config;
  const prevProfile = Deno.env.get("LEVAIN_PROFILE");
  const tempHome = TestHelper.getNewTempDir();
  const profileLines: string[] = [];
  const repoInitCalls: Array<{ forceRefresh?: boolean; installedOnly?: boolean }> = [];

  const sanitizeStub = stub(OsUtils, "sanitizeUserPath", () => Promise.resolve());
  const repoInitStub = stub(RepositoryManager.prototype, "init", (opts) => {
    repoInitCalls.push({ forceRefresh: opts.forceRefresh, installedOnly: opts.installedOnly });
    return Promise.resolve([]);
  });
  const saveStub = stub(Config.prototype, "save", () => {});
  const releaseStub = stub(LevainReleases.prototype, "checkLevainUpdate", () => Promise.resolve());
  const loaderCmdStub = stub(Loader.prototype, "command", () => Promise.resolve());
  const errStub = stub(console, "error", (...args: unknown[]) => {
    profileLines.push(args.map(String).join(" "));
  });

  try {
    Deno.env.set("LEVAIN_PROFILE", "1");
    const cli = new LevainCli();
    await cli.execute({
      _: ["_activate-machine", "cmd", "--shell", "bash"],
      levainHome: [tempHome],
    });

    assertEquals(releaseStub.calls.length, 0, "_activate-machine cmd must skip update check");
    assertEquals(sanitizeStub.calls.length, 0, "_activate-machine cmd must skip sanitizeUserPath");
    assertEquals(repoInitCalls, [{ forceRefresh: false, installedOnly: true }]);
    assert(profileLines.some((line) => line.includes("[levain:profile]") && line.includes("repositoryManager.init=")));

    // explain must also skip checkLevainUpdate so redirected stdout is never polluted or blocked by upgrade prompt
    await cli.execute({
      _: ["explain", "levain"],
      levainHome: [tempHome],
    });
    assertEquals(releaseStub.calls.length, 0, "explain must skip update check");

    // explain --uninstall without args uses installedOnly=true so it works offline without remote repo fetches
    repoInitCalls.length = 0;
    await cli.execute({
      _: ["explain", "--uninstall"],
      levainHome: [tempHome],
    });
    assertEquals(repoInitCalls, [{ forceRefresh: false, installedOnly: true }]);
    assertEquals(releaseStub.calls.length, 0);

    // actions and clean must skip repositoryManager.init and sanitizeUserPath
    repoInitCalls.length = 0;
    await cli.execute({ _: ["actions"], levainHome: [tempHome], "skip-levain-updates": true });
    await cli.execute({ _: ["clean"], levainHome: [tempHome], "skip-levain-updates": true });
    assertEquals(repoInitCalls.length, 0);
    assertEquals(sanitizeStub.calls.length, 0);

    // update must pass forceRefresh=true and run sanitizeUserPath
    await cli.execute({
      _: ["update", "git"],
      levainHome: [tempHome],
      "skip-levain-updates": true,
      "skip-auto-clean": true,
    });
    assertEquals(repoInitCalls, [{ forceRefresh: true, installedOnly: false }]);
    assertEquals(sanitizeStub.calls.length, 1);
  } finally {
    errStub.restore();
    loaderCmdStub.restore();
    releaseStub.restore();
    saveStub.restore();
    repoInitStub.restore();
    sanitizeStub.restore();
    ConsoleAndFileLogger.config = prevConfig;
    if (prevProfile === undefined) {
      Deno.env.delete("LEVAIN_PROFILE");
    } else {
      Deno.env.set("LEVAIN_PROFILE", prevProfile);
    }
  }
});

Deno.test("LevainCli should acquire InstanceLock for mutating commands and let read-only commands bypass it", async () => {
  const prevConfig = ConsoleAndFileLogger.config;
  const tempHome = TestHelper.getNewTempDir();
  const lockCalls: string[] = [];

  const acquireStub = stub(InstanceLock, "acquire", (lockPath: string, opts) => {
    lockCalls.push(`${opts.command}@${lockPath}`);
    if (opts.command === "clean") {
      return Promise.reject(new InstanceLockError("busy"));
    }
    return Promise.resolve({ release: () => {} } as unknown as InstanceLock);
  });
  const sanitizeStub = stub(OsUtils, "sanitizeUserPath", () => Promise.resolve());
  const repoInitStub = stub(RepositoryManager.prototype, "init", () => Promise.resolve([]));
  const saveStub = stub(Config.prototype, "save", () => {});
  const loaderCmdStub = stub(Loader.prototype, "command", () => Promise.resolve());

  try {
    const cli = new LevainCli();

    // Read-only commands must NOT acquire the instance lock
    await cli.execute({ _: ["actions"], levainHome: [tempHome], "skip-levain-updates": true });
    await cli.execute({ _: ["list"], levainHome: [tempHome], "skip-levain-updates": true });
    assertEquals(lockCalls.length, 0);

    // Mutating command must propagate InstanceLockError without saving config
    await assertRejects(
      async () => await cli.execute({ _: ["clean"], levainHome: [tempHome], "skip-levain-updates": true }),
      InstanceLockError,
      "busy",
    );
    assertEquals(lockCalls.length, 1);

    // `_activate-machine pre` also acquires the lock
    await cli.execute({ _: ["_activate-machine", "pre"], levainHome: [tempHome], "skip-levain-updates": true });
    assertEquals(lockCalls.length, 2);
    assert(lockCalls[1].startsWith("activate@"));
  } finally {
    loaderCmdStub.restore();
    saveStub.restore();
    repoInitStub.restore();
    sanitizeStub.restore();
    acquireStub.restore();
    ConsoleAndFileLogger.config = prevConfig;
  }
});
