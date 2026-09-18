import * as log from "@std/log";

import type Config from "../lib/config.ts";
import type Package from "../lib/package/package.ts";
import { FileUtils } from "../lib/fs/file_utils.ts";

import type Action from "./action.ts";

export default class BackupFile implements Action {
  constructor(private config: Config) {
  }

  // deno-lint-ignore require-await
  async execute(_pkg: Package | undefined, parameters: string[]): Promise<void> {
    if (parameters.length != 1) {
      throw `You must inform the file to backup - ${parameters}`;
    }

    const filename = parameters[0];
    const bkp = FileUtils.createBackup(filename);
    log.debug(`BACKUP-FILE ${filename} => ${bkp}`);
  }
}
