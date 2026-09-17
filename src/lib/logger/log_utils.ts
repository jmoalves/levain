import * as log from "@std/log";
import type Config from "../config.ts";
import DateUtils from "../utils/date_utils.ts";

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

    return msg.replace(config.password, "******");
  }
}
