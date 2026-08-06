import * as log from "@std/log";
import * as path from "@std/path";
import { ensureDirSync, moveSync } from "@std/fs";

import type Config from "../config.ts";
import { Timer } from "../timer.ts";
import { FileUtils } from "../fs/file_utils.ts";
import ConsoleFeedback from "../utils/console_feedback.ts";
import StringUtils from "../utils/string_utils.ts";
import { retry } from "../utils/utils.ts";

export abstract class Extractor {
  readonly feedback = new ConsoleFeedback();

  private readonly maxRetries = 5;

  constructor(protected config: Config) {
  }

  async extract(strip: boolean, src: string, dst: string) {
    const extractedTempDir = await this.extractToTemp(src, dst);
    await this.move(strip, extractedTempDir, dst);
  }

  async copy(srcFile: string, dstFile: string): Promise<string> {
    log.debug(`- COPY ${srcFile} => ${dstFile}`);

    await FileUtils.copyWithProgress(srcFile, dstFile);
    return dstFile;
  }

  abstract extractImpl(src: string, dst: string): void;

  async move(strip: boolean, srcDir: string, dstDir: string): Promise<void> {
    let count = 0;
    for (const child of Deno.readDirSync(srcDir)) {
      count++;

      const from = path.resolve(srcDir, child.name);
      if (strip) {
        if (count > 1) { // There can be only one!
          throw `You should not ask for --strip if there are more than one directory`;
        }

        log.debug(`- STRIP ${from}`);
        await this.move(false, from, dstDir);
      } else {
        const dst = path.resolve(dstDir, child.name);
        log.debug(`- MOVE ${from} => ${dst}`);
        await retry(this.maxRetries, () => moveSync(from, dst));
      }
    }

    await retry(this.maxRetries, () => FileUtils.removeSync(srcDir));
  }

  async extractToTemp(src: string, dst: string): Promise<string> {
    const safeTempDir = path.dirname(path.resolve(dst));
    log.debug(`safeTempDir ${safeTempDir}`);

    ensureDirSync(safeTempDir);
    const tempDir = Deno.makeTempDirSync({
      dir: safeTempDir,
      prefix: "extract-",
    });

    const timer = new Timer();
    log.debug(`- EXTRACT ${src} => ${tempDir}`);
    this.feedback.start(`# ${StringUtils.compressText(src, 80)}`);

    const tick = setInterval(() => this.feedback.show(), 300);
    await this.extractImpl(src, tempDir);
    clearInterval(tick);

    this.feedback.reset(`# ${StringUtils.compressText(src, 80)} in ${timer.humanize()}`);
    log.debug(`- extracted in ${timer.humanize()}`);
    return tempDir;
  }
}
