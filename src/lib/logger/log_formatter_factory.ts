import {LogRecord} from "https://deno.land/std/log/logger.ts"
import ConsoleAndFileLogger from "./console_and_file_logger.ts";

export default class LogFormatterFactory {

    static getFormatterWithDatetimeAndLevel(): (logRecord: LogRecord) => string {
        return logRecord => {
            let msg = ConsoleAndFileLogger.hidePassword(logRecord.msg);
            return `${ConsoleAndFileLogger.logTag(logRecord.datetime)} ${logRecord.levelName} ${msg}`;
        };
    }

    static getHidePasswordFormatter(): (logRecord: LogRecord) => string {
        return logRecord => ConsoleAndFileLogger.hidePassword(logRecord.msg)
    }

}