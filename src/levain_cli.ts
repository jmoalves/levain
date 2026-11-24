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

export default class LevainCli {
  private static readonly AUTO_CLEAN_COMMANDS = new Set([
    "install",
    "update",
    "shell",
    "clone",
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

    // Context
    const config = new Config(myArgs);
    ConsoleAndFileLogger.config = config;

    function getCmdFromArgs() {
      return myArgs._.shift()!;
    }

    // First parameter is the command
    const cmd: string = getCmdFromArgs();

    // Ask for user_info
    if (cmd === "install") {
      const userInfoUtil = new UserInfoUtil();
      await userInfoUtil.askUserInfo(config, myArgs);
    }

    // Shell path
    if (myArgs.shellPath) {
      config.shellPath = myArgs.shellPath;
    }

    if (!myArgs["skip-levain-updates"] && !myArgs["levain-upgrade"]) {
      const levainReleases = new LevainReleases(config);
      await levainReleases.checkLevainUpdate();
    }

    // Repository Manager
    await config.repositoryManager.init({
      extraRepos: myArgs.addRepo,
      tempRepos: myArgs.tempRepo,
    });

    // sanitize path for clean execution
    await OsUtils.sanitizeUserPath();

    const loader = new Loader(config);
    try {
      if (myArgs["levain-upgrade"]) {
        await loader.command("install", ["--force", "levain"]);
        config.save();
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
        await this.maybeAutoClean(cmd, config, myArgs, loader);

        await loader.command(cmd, myArgs._);
        // FIXME Will this save a broken config?
        // config.saveIfChanged()
      }
    } catch (err) {
      if (err instanceof CommandNotFoundError) {
        log.info("");
        this.showCliHelp();
        throw err;
      }
      throw err;
    }

    /////////////////////////////////////////////////////////////////////////////////
    log.debug("==================================");

    config.save();
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

    try {
      await loader.command("clean", []);
      config.lastAutoClean = today;
    } catch (err) {
      log.warn(`Auto-clean skipped due to error: ${err}`);
    }
  }
}
