import * as log from "@std/log";
import * as path from "@std/path";

import type Config from "../../lib/config.ts";
import t from "../../lib/i18n.ts";
import OsUtils from "../../lib/os/os_utils.ts";
import type Package from "../../lib/package/package.ts";
import { parseArgs } from "../../lib/parse_args.ts";

import type Action from "../action.ts";

export default class CheckPathContains implements Action {
  constructor(private config: Config) {
  }

  // deno-lint-ignore require-await
  async execute(pkg: Package | undefined, parameters: string[]): Promise<void> {
    const args = parseArgs(parameters, {});

    if (!args._ || args._.length < 1) {
      throw new Error(t("action.check_path_contains.missingArgs"));
    }

    const dirs: string[] = args._;
    log.debug(`CHECK-PATH-CONTAINS ${dirs.join(", ")}`);

    const isWin = OsUtils.isWindows();
    const effectivePathEntries = this.collectNormalizedPathEntries(isWin);

    for (const rawDir of dirs) {
      const resolved = pkg?.baseDir ? path.resolve(pkg.baseDir, rawDir) : path.resolve(rawDir);
      const normalized = CheckPathContains.normalizeEntry(resolved, isWin);
      if (effectivePathEntries.has(normalized)) {
        log.debug(`FOUND IN PATH: ${resolved}`);
        return;
      }
    }

    if (dirs.length === 1) {
      throw new Error(t("action.check_path_contains.notFound", { dir: dirs[0] }));
    }

    throw new Error(t("action.check_path_contains.noneFound", { dirs: dirs.join(", ") }));
  }

  private collectNormalizedPathEntries(isWin: boolean): Set<string> {
    const entries = new Set<string>();

    const sessionPaths: string[] | undefined = this.config.context?.action?.addpath?.path;
    if (sessionPaths) {
      for (const entry of sessionPaths) {
        const normalized = CheckPathContains.normalizeEntry(entry, isWin);
        if (normalized) {
          entries.add(normalized);
        }
      }
    }

    const envPath = Deno.env.get("PATH") ?? "";
    for (const entry of envPath.split(path.DELIMITER)) {
      const normalized = CheckPathContains.normalizeEntry(entry, isWin);
      if (normalized) {
        entries.add(normalized);
      }
    }

    return entries;
  }

  static normalizeEntry(entry: string, isWin: boolean): string {
    const unquoted = entry.trim().replace(/^"+|"+$/g, "").trim();
    if (!unquoted) {
      return "";
    }
    const resolved = path.resolve(unquoted);
    return isWin ? resolved.toLowerCase() : resolved;
  }
}
