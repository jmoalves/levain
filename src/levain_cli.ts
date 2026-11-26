import * as log from "@std/log";

import t from "./lib/i18n.ts";

import Config from "./lib/config.ts";
import ConsoleAndFileLogger from "./lib/logger/console_and_file_logger.ts";
import Loader from "./lib/loader.ts";
import UserInfoUtil from "./lib/user_info/userinfo_util.ts";
import CliUtil from "./lib/cli_util.ts";
import { CommandNotFoundError } from "./cmd/command_factory.ts";
import { getCliHelpText } from "./cli/cli_parser.ts";
import LevainReleases from "./lib/releases/levain_releases.ts";

import LevainVersion from "./levain_version.ts";
import OsUtils from "./lib/os/os_utils.ts";
import LevainPaths from "./lib/paths/levain_paths.ts";
import DateUtils from "./lib/utils/date_utils.ts";
import { InstanceLock } from "./lib/fs/instance_lock.ts";

export default class LevainCli {
  private static readonly AUTO_CLEAN_COMMANDS = new Set([
    "install",
    "update",
    "shell",
    "clone",
  ]);
  private static readonly NO_REPO_COMMANDS = new Set([
    "actions",
    "clean",
  ]);
  private static readonly SANITIZE_PATH_COMMANDS = new Set([
    "install",
    "update",
  ]);
  private static readonly LOCKED_COMMANDS = new Set([
    "install",
    "update",
    "clean",
  ]);
  async execute(myArgs: any = {}): Promise<void> {
    log.info(t("levain_cli.levainVersion", {
      version: LevainVersion.levainVersion,
      denoVersion: Deno.version.deno,
      levainRootFile: LevainPaths.levainRootFile,
    }));
    log.info("");

    log.debug("args " + JSON.stringify(myArgs));

    if (myArgs["wait-to-begin"] && !myArgs["levain-upgrade"]) {
      console.log("");
      console.log("");
      CliUtil.askToContinue();
    }

    // Time to do business!
    log.debug("==================================");
    log.debug("");
    log.debug(`CWD ${Deno.cwd()}`);

    if (myArgs?._?.length == 0 && !myArgs["levain-upgrade"]) {
      this.showCliHelp();
      return;
    }

    const profileEnabled = Deno.env.get("LEVAIN_PROFILE") === "1";
    const profileMarks: Array<{ phase: string; ms: number }> = [];
    const measurePhase = async <T>(phase: string, fn: () => Promise<T> | T): Promise<T> => {
      const start = performance.now();
      try {
        return await fn();
      } finally {
        const elapsed = performance.now() - start;
        profileMarks.push({ phase, ms: elapsed });
        log.debug(`[profile] ${phase}: ${elapsed.toFixed(1)}ms`);
      }
    };

    // Context
    const config = await measurePhase("config", () => new Config(myArgs));
    ConsoleAndFileLogger.config = config;

    function getCmdFromArgs() {
      return myArgs._.shift()!;
    }

    // First parameter is the command
    const cmd: string = getCmdFromArgs();

    // Ask for user_info
    if (cmd === "install") {
      const userInfoUtil = new UserInfoUtil();
      await measurePhase("userInfo", () => userInfoUtil.askUserInfo(config, myArgs));
    }

    // Shell path
    if (myArgs.shellPath) {
      config.shellPath = myArgs.shellPath;
    }

    const isActivateCmd = cmd === "_activate-machine" && myArgs._[0] === "cmd";
    const isActivatePre = cmd === "_activate-machine" && myArgs._[0] === "pre";
    const isActivateInit = cmd === "_activate-machine" && myArgs._[0] === "init";
    const isExplainFullUninstall = cmd === "explain" &&
      myArgs._.includes("--uninstall") &&
      myArgs._.filter((arg: string) => !arg.startsWith("-")).length === 0;
    const needsLock = Boolean(
      myArgs["levain-upgrade"] || isActivatePre || isActivateInit || LevainCli.LOCKED_COMMANDS.has(cmd),
    );
    const lockCommand = myArgs["levain-upgrade"]
      ? "--levain-upgrade"
      : (isActivatePre || isActivateInit)
      ? "activate"
      : (cmd ?? "unknown");

    let instanceLock: InstanceLock | undefined;
    try {
      if (needsLock) {
        instanceLock = await measurePhase("instanceLock", () =>
          InstanceLock.acquire(config.configPaths.levainLockPath, { command: lockCommand })
        );
      }

      if (!myArgs["skip-levain-updates"] && !myArgs["levain-upgrade"] && !isActivateCmd && cmd !== "explain") {
        const levainReleases = new LevainReleases(config);
        await measurePhase("checkLevainUpdate", () => levainReleases.checkLevainUpdate());
      }

      // Repository Manager (skip for commands that never access repositories)
      if (myArgs["levain-upgrade"] || !LevainCli.NO_REPO_COMMANDS.has(cmd)) {
        await measurePhase("repositoryManager.init", () =>
          config.repositoryManager.init({
            extraRepos: myArgs.addRepo,
            tempRepos: myArgs.tempRepo,
            forceRefresh: cmd === "update",
            installedOnly: isActivateCmd || isExplainFullUninstall,
          })
        );
      }

      // Sanitize user PATH only for locked mutating commands (shell sanitizes inside its install lock)
      if (myArgs["levain-upgrade"] || isActivatePre || LevainCli.SANITIZE_PATH_COMMANDS.has(cmd)) {
        await measurePhase("sanitizeUserPath", () => OsUtils.sanitizeUserPath());
      }

      const loader = new Loader(config);
      if (myArgs["levain-upgrade"]) {
        await measurePhase("levain-upgrade", () => loader.command("install", ["--force", "levain"]));
        config.save();
        // Release lock before blocking on interactive finish prompt
        instanceLock?.release();
        log.info("");
        log.info("");
        log.info("");
        log.info(t("levain_cli.levainUpgrade"));
        log.info("");

        if (!CliUtil.testMode && Deno.stdin.isTerminal() && Deno.stdout.isTerminal()) {
          prompt(t("enterFinish"));
        }

        log.info("");
        log.info(t("levain_cli.bye"));
        return;
      } else {
        await measurePhase("maybeAutoClean", () => this.maybeAutoClean(cmd, config, myArgs, loader));

        await measurePhase(`command:${cmd}`, () => loader.command(cmd, myArgs._));
      }

      /////////////////////////////////////////////////////////////////////////////////
      log.debug("==================================");

      config.saveIfChanged();
    } catch (err) {
      if (err instanceof CommandNotFoundError) {
        log.info("");
        this.showCliHelp();
        throw err;
      }
      throw err;
    } finally {
      instanceLock?.release();
      if (profileEnabled) {
        const summary = profileMarks.map((m) => `${m.phase}=${m.ms.toFixed(1)}ms`).join(" ");
        console.error(`[levain:profile] ${summary}`);
      }
    }
  }

  showCliHelp() {
    log.info("");
    log.info(getCliHelpText(false));
  }

  private async maybeAutoClean(cmd: string, config: Config, myArgs: any, loader: Loader): Promise<void> {
    if (myArgs["skip-auto-clean"] || !LevainCli.AUTO_CLEAN_COMMANDS.has(cmd)) {
      return;
    }

    const today = DateUtils.dateTag();
    if (config.lastAutoClean === today) {
      return;
    }

    let autoCleanLock: InstanceLock | undefined;
    try {
      autoCleanLock = await InstanceLock.acquire(config.configPaths.levainLockPath, {
        command: "clean",
        waitTimeoutMs: 0,
      });
      await loader.command("clean", []);
      config.lastAutoClean = today;
    } catch (err) {
      log.warn(`Auto-clean skipped due to error: ${err}`);
    } finally {
      autoCleanLock?.release();
    }
  }
}
