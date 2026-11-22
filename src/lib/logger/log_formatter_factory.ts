import { LogRecord } from "@std/log";

import LogUtils from "./log_utils.ts";
import type Config from "../config.ts";

export type ConfigProvider = Config | null | undefined | (() => Config | null | undefined);

export default class LogFormatterFactory {
  private static resolveConfig(configOrProvider: ConfigProvider): Config | null {
    const resolved = typeof configOrProvider === "function" ? configOrProvider() : configOrProvider;
    return resolved ?? null;
  }

  static getFormatterWithDatetimeAndLevel(config: ConfigProvider): (logRecord: LogRecord) => string {
    return (logRecord) => {
      const msg = LogUtils.hidePassword(LogFormatterFactory.resolveConfig(config), logRecord.msg);
      return `${LogUtils.logTag(logRecord.datetime)} ${logRecord.levelName} ${msg}`;
    };
  }

  static getHidePasswordFormatter(config: ConfigProvider): (logRecord: LogRecord) => string {
    return (logRecord) => LogUtils.hidePassword(LogFormatterFactory.resolveConfig(config), logRecord.msg);
  }
}
