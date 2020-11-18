import * as log from "https://deno.land/std/log/mod.ts";
import Config from "./config.ts";

export default class Logger {
  private static config: Config;

  public static async setup() {
    const logFile = Deno.makeTempFileSync({ prefix: `levain-${Logger.logTag(new Date())}-`, suffix: ".log"});
    await log.setup({
        handlers: {
          console: new log.handlers.ConsoleHandler("INFO", {
            formatter: logRecord => {
              let msg = Logger.hidePassword(logRecord.msg);
              return `${Logger.logTag(logRecord.datetime)} ${logRecord.levelName} ${msg}`;
            }
          }),

          file: new log.handlers.FileHandler("DEBUG", {
            filename: logFile,
            formatter: logRecord => {
                let msg = Logger.hidePassword(logRecord.msg);
                return `${Logger.logTag(logRecord.datetime)} ${logRecord.levelName} ${msg}`;
              }
          }),
        },

        loggers: {
          // configure default logger available via short-hand methods above
          default: {
            level: "DEBUG",
            handlers: ["console", "file"],
          }
        },
      });

    log.info(`logFile -> ${logFile}`);
    log.info("")
  }

  public static setConfig(config: Config): void {
    Logger.config = config;
  }

  private static logTag(dt:Date): string {
      let logTag: string = "";
      logTag += dt.getFullYear() + "";
      logTag += (dt.getMonth() < 10 ? "0" : "") + dt.getMonth();
      logTag += (dt.getDate() < 10 ? "0" : "") + dt.getDate();
      logTag += "-";
      logTag += (dt.getHours() < 10 ? "0" : "") + dt.getHours();
      logTag += (dt.getMinutes() < 10 ? "0" : "") + dt.getMinutes();
      logTag += (dt.getSeconds() < 10 ? "0" : "") + dt.getSeconds();
      return logTag;
  }

  private static hidePassword(msg: string): string {
    if (!Logger.config?.password) {
      return msg;
    }

    return msg.replace(Logger.config.password, "******");
  }
}
