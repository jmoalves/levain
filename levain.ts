import * as log from "@std/log";

import t from "./src/lib/i18n.ts";

import ConsoleAndFileLogger from "./src/lib/logger/console_and_file_logger.ts";
import { CliValidationError, parseCliArgs } from "./src/cli/cli_parser.ts";
import { Timer } from "./src/lib/timer.ts";
import CliUtil from "./src/lib/cli_util.ts";

import LevainCli from "./src/levain_cli.ts";

export default class Levain {

  logFiles: string[] = [];
  timer = new Timer();
  logger: ConsoleAndFileLogger | undefined;

  myArgs: any;
  error = false;

  async runLevinWithLog(cmdArgs: string[] = []): Promise<ConsoleAndFileLogger | undefined> {
    try {
      const parsed = await parseCliArgs(cmdArgs);
      if (parsed.kind === "handled") {
        return undefined;
      }

      this.myArgs = parsed.myArgs;
      await this.prepareLogs(this.myArgs);

      log.info("");
      log.info(`levain ${cmdArgs.join(" ")}`);
      log.info("==================================");
      await new LevainCli().execute(this.myArgs);
    } catch (err) {
      if (err instanceof CliValidationError) {
        console.error(err.message);
        console.error(t("cli.helpHint"));
        this.error = true;
        return undefined;
      }

      if (!this.logger) {
        await this.prepareLogs(this.myArgs ?? {});
      }
      log.error("");
      log.error("********************************************************************************");
      log.error("");
      log.error(err);
      log.error("");
      log.error("********************************************************************************");
      log.error("");

      this.error = true;
    } finally {
      if (this.logger) {
        this.logger.showLogFiles(this.logFiles);

        log.info("");
        const timed = this.timer.humanize();
        log.info(t("levain.levainRan", { timer: timed }));

        if (this.error) {
          log.error(t("levain.executionFailed"));
        } else {
          log.debug(t("levain.executionSuccess"));
        }
        this.logger.flush();
      }

      const shouldWaitAfterEnd = Boolean(
        this.myArgs?.["wait-after-end"] || (this.error && this.myArgs?.["levain-upgrade"]),
      );
      if (!CliUtil.testMode && Deno.stdin.isTerminal() && Deno.stdout.isTerminal() && shouldWaitAfterEnd) {
        console.log("");
        prompt(t("enterFinish"));
      }
    }

    return this.logger;
  }

  async prepareLogs(myArgs: any): Promise<ConsoleAndFileLogger> {
    const omitLog =  (myArgs?._?.length > 1 && (myArgs._[0] == "_activate-machine") && (myArgs._[1] == "cmd"));
    this.logFiles = this.getLogFiles(myArgs["add-log"], myArgs["add-log-dir"]);
    this.logger = await ConsoleAndFileLogger.setup(this.logFiles, omitLog);
    this.logger.showLogFiles(this.logFiles);
    return this.logger;
  }

  getLogFiles(
    extraLogFiles: string[] = [],
    extraLogDirs: string[] = [],
  ): string[] {
    let logFiles = [];
    logFiles.push(ConsoleAndFileLogger.getLogFileInTempFolder());
    logFiles = logFiles.concat(extraLogFiles);
    log.debug(`extraLogFiles [${extraLogFiles}] ${logFiles.length}`);
    extraLogDirs.forEach((extraDir) => {
      logFiles.push(ConsoleAndFileLogger.getLogFileInExtraDir(extraDir));
    });
    log.debug(`extraLogDirs ${extraLogDirs} ${logFiles.length}`);
    log.debug(`logFiles.length ${logFiles.length}`);
    return logFiles;
  }
}

// https://deno.land/manual/tools/script_installer
if (import.meta.main) {
  const levain = new Levain();
  await levain.runLevinWithLog(Deno.args.filter((it) => it != "--is_compiled_binary"));
  if (levain.error) {
    Deno.exit(1);
  }
}
