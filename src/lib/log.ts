import * as log from "https://deno.land/std/log/mod.ts";

import { homedir } from './utils.ts';

export default class Logger {
    public static async setup() {
      const logFile = Deno.makeTempFileSync({ prefix: `levain-${Logger.logTag(new Date())}-`, suffix: ".log"});
      await log.setup({
          handlers: {
            console: new log.handlers.ConsoleHandler("INFO"),
        
            file: new log.handlers.FileHandler("DEBUG", {
              filename: logFile,
              formatter: logRecord => {
                  return `${Logger.logTag(logRecord.datetime)} ${logRecord.levelName} ${logRecord.msg}`;
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
}
