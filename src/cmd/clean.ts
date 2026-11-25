import * as log from "@std/log";
import * as path from "@std/path";
import { existsSync } from "@std/fs";

import t from "../lib/i18n.ts";

import type Config from "../lib/config.ts";
import { parseArgs } from "../lib/parse_args.ts";
import StringUtils from "../lib/utils/string_utils.ts";
import DateUtils from "../lib/utils/date_utils.ts";
import LevainVersion from "../levain_version.ts";
import ConsoleFeedback from "../lib/utils/console_feedback.ts";

import type Command from "./command.ts";
import { FileUtils } from "../lib/fs/file_utils.ts";
import LogUtils from "../lib/logger/log_utils.ts";
import GeneralPaths from "../lib/paths/general_paths.ts";

const cacheExpiration = 30;

export default class CleanCommand implements Command {
  readonly feedback = new ConsoleFeedback();

  constructor(
    private config: Config,
  ) {
  }

  execute(parameters: string[]): void {
    const myArgs = parseArgs(parameters, {
      boolean: [
        "cache",
        "backup",
        "temp",
        "logs",
        "all",
        "deep",
      ],
      stopEarly: false,
    });

    const hasTargetFlag = Boolean(myArgs.cache || myArgs.backup || myArgs.temp || myArgs.logs || myArgs.all);
    if (!hasTargetFlag) {
      myArgs.cache = false;
      myArgs.backup = true;
      myArgs.temp = true;
      myArgs.logs = true;
    } else if (myArgs.all) {
      myArgs.cache = true;
      myArgs.backup = true;
      myArgs.temp = true;
      myArgs.logs = true;
    }

    const shallow = !myArgs.deep;

    //////////////////////////////////////////////////////////////////
    let total = 0;

    this.feedback.start(t("cmd.clean.startFeedback"));

    if (!hasTargetFlag || myArgs.cache) {
      total += this.cleanCacheDir(myArgs.cache);
    }

    if (myArgs.backup) {
      total += this.cleanBackupDir(shallow);
      total += this.cleanFailedSaves();
    }

    if (myArgs.temp) {
      const tempDir = this.config.configPaths.levainSafeTempDir;
      total += this.cleanDir(tempDir);
      total += this.cleanOsTempDir(shallow);
    }

    if (myArgs.logs) {
      total += this.cleanLogs();
    }

    log.debug("=================");
    log.debug(t("cmd.clean.cleaned", { amount: StringUtils.humanizeBytes(total) }));
    this.feedback.reset(t("cmd.clean.endFeedback", { amount: StringUtils.humanizeBytes(total) }));
  }

  private cleanBackupDir(shallow: boolean) {
    const backupDir = this.config.configPaths.levainBackupDir;

    let checkFile = undefined;
    if (shallow) {
      checkFile = (dirEntry: any) => {
        // Keep today's backup
        if (!dirEntry.name.match(`^bkp-${DateUtils.dateTag()}-`)) {
          return true;
        }

        return false;
      };
    }

    return this.cleanDir(backupDir, checkFile);
  }

  private cleanCacheDir(cleanCache: boolean) {
    const cacheDir = this.config.configPaths.levainCacheDir;
    if (cleanCache) {
      return this.cleanDir(cacheDir);
    }

    // clean files older than 30 days
    const cutoffTime = DateUtils.daysAgo(cacheExpiration).getTime();
    return this.cleanDir(
      cacheDir,
      (dirEntry: Deno.DirEntry) => {
        const entry = path.resolve(cacheDir, dirEntry.name);
        if (!existsSync(entry)) {
          return false;
        }
        const stat = FileUtils.getFileInfoSync(entry);
        const lastUsed = stat.atime ?? stat.mtime;
        return !lastUsed ? false : lastUsed.getTime() < cutoffTime;
      },
    );
  }

  private cleanDir(
    entry: string,
    includeResolver?: (dirEntry: Deno.DirEntry) => boolean,
    removeRoot = true,
  ): number {
    const entryPath = path.resolve(entry);
    if (!existsSync(entryPath)) {
      return 0;
    }

    this.feedback.show();

    const entryInfo = FileUtils.getFileInfoSync(entryPath);
    if (!entryInfo.isDirectory) {
      try {
        FileUtils.removeSync(entryPath);
        return entryInfo.size;
      } catch (error) {
        log.debug(t("cmd.clean.errorIgnoringEntryPath", { error: error, entryPath: entryPath }));
        return 0;
      }
    }

    const size = Array.from(Deno.readDirSync(entryPath))
      .filter((dirEntry) => !includeResolver || includeResolver(dirEntry))
      .map((dirEntry) => this.cleanDir(path.resolve(entryPath, dirEntry.name), undefined, true))
      .reduce(
        (dirsize, filesize) => dirsize + filesize,
        0,
      );

    if (removeRoot) {
      try {
        FileUtils.removeSync(entryPath);
      } catch (error) {
        log.debug(t("cmd.clean.entryPathIgnoringError", { error: error, entryPath: entryPath }));
      }
    }

    return size;
  }

  private cleanFailedSaves(): number {
    const saveDir = this.config.configPaths.levainHome;
    if (!saveDir) {
      return 0;
    }

    return this.cleanDir(
      saveDir,
      (dirEntry: any) => {
        if (dirEntry.name.match(/^\.rename\./)) {
          return true;
        }

        if (dirEntry.name.match(/^\.deleted\./)) {
          return true;
        }

        return false;
      },
      false,
    );
  }

  private cleanOsTempDir(shallow: boolean): number {
    const tempDir = GeneralPaths.tempDir;
    if (!tempDir) {
      return 0;
    }

    let size = this.cleanDir(
      tempDir,
      (dirEntry: any) => {
        if (dirEntry.name.match(`^levain-install-`)) {
          // using install.ps1
          return false;
        }

        if (dirEntry.name.match("^levain-temp-")) {
          return true;
        }

        if (dirEntry.isDirectory && dirEntry.name.match("^levain-")) {
          return true;
        }

        return false;
      },
      false,
    );

    const levainReleasesDir = GeneralPaths.tempLevainReleasesDir;
    if (existsSync(levainReleasesDir)) {
      size += this.cleanDir(levainReleasesDir, (dirEntry: any) => {
        if (dirEntry.name.match(`^levain-${LevainVersion.levainVersion.versionNumber}$`)) {
          // current version
          return false;
        }

        if (shallow) {
          return false;
        }

        return true;
      });
    }

    return size;
  }

  private cleanLogs(): number {
    log.debug(t("cmd.clean.logs"));

    const tempDir = GeneralPaths.tempDir;
    if (!tempDir) {
      return 0;
    }

    return this.cleanDir(
      tempDir,
      (dirEntry) => {
        if (dirEntry.isFile && /^levain-.*\.log$/.test(dirEntry.name)) {
          const dateTag = LogUtils.logDateTag();
          if (!dirEntry.name.startsWith(`levain-${dateTag}-`)) { // Do not remove today's logs
            return true;
          }
        }

        return false;
      },
      false,
    );
  }

  readonly oneLineExample = t("cmd.clean.example");
}
