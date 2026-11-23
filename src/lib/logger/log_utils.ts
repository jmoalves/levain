import * as log from "@std/log";
import type Config from "../config.ts";
import DateUtils from "../utils/date_utils.ts";
import StringUtils from "../utils/string_utils.ts";

export default class LogUtils {
  // deno-lint-ignore require-await
  static async closeLogFiles() {
    return this.setupDefaultLogConfig();
  }

  static async setupDefaultLogConfig() {
    await log.setup({ handlers: {}, loggers: {} });
  }

  static logTag(dt: Date = new Date()): string {
    return DateUtils.dateTimeTag(dt);
  }

  static logDateTag(dt: Date = new Date()): string {
    return DateUtils.dateTag(dt);
  }

  static logTimeTag(dt: Date = new Date()): string {
    return DateUtils.timeTag(dt);
  }

  static hidePassword(config: Config | null, msg: string): string {
    if (!config?.password) {
      return msg;
    }

    const candidates = [
      ...new Set<string>([
        config.password,
        JSON.stringify(config.password).slice(1, -1),
        StringUtils.encodeUrlComponent(config.password),
        encodeURIComponent(config.password),
      ]),
    ]
      .filter((c) => c.length > 0)
      // Replace longer encoded variants first so raw substrings (e.g. leading `\`) don't leave fragments behind
      .sort((a, b) => b.length - a.length);

    let masked = msg;
    for (const candidate of candidates) {
      masked = masked.replaceAll(candidate, "******");
    }
    return masked;
  }
}
