import { LogRecord } from "@std/log";

import LogUtils from "./log_utils.ts";
import type Config from "../config.ts";

export default class LogFormatterFactory {
  static getFormatterWithDatetimeAndLevel(config: Config | null): (logRecord: LogRecord) => string {
    return (logRecord) => {
      const msg = LogUtils.hidePassword(config, logRecord.msg);
      return `${LogUtils.logTag(logRecord.datetime)} ${logRecord.levelName} ${msg}`;
    };
  }

  static getHidePasswordFormatter(config: Config | null): (logRecord: LogRecord) => string {
    return (logRecord) => LogUtils.hidePassword(config, logRecord.msg);
  }
}
