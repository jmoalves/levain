import * as log from "https://deno.land/std/log/mod.ts";
import * as path from "https://deno.land/std/path/mod.ts";

import Config from "../config.ts";
import Logger from "./logger.ts";
import {AutoFlushLogFileHandler} from "./auto_flush_log_file_handler.ts";

export default class ConsoleAndFileLogger implements Logger {
    private static config: Config;

    public static async setup(skipLocalFileLog = false): Promise<string[]> {

        const logFiles: string[] = [];
        const handlers: any = {};

        handlers['console'] = this.getConsoleHandler()
        handlers['logFileWithTimestamp'] = this.getTimestampFileLogHandler(logFiles)
        if (!skipLocalFileLog) {
            handlers['fixedFile'] = this.getLocalFileLogHandler(logFiles)
        }

        const handlerNames = Object.keys(handlers)

        await log.setup({
            handlers,
            loggers: {
                default: {
                    level: "DEBUG",
                    handlers: handlerNames,
                }
            },
        });

        return logFiles
    }


    public static showLogFiles(logFiles: string[]) {
        logFiles.forEach(logFile => {
            const fullPath = path.resolve(logFile);
            log.info(`logFile -> ${fullPath}`);
        })
    }

    public static getLogFileHandler(logFile: string, options = {}) {
        const fullOptions = {
            filename: logFile,
            formatter: this.getFormatter(),
            ...options
        }
        return new AutoFlushLogFileHandler("DEBUG", fullOptions);
    }

    public static getFormatter(): (logRecord: any) => string {
        return logRecord => {
            let msg = ConsoleAndFileLogger.hidePassword(logRecord.msg);
            return `${ConsoleAndFileLogger.logTag(logRecord.datetime)} ${logRecord.levelName} ${msg}`;
        };
    }

    public static setConfig(config: Config): void {
        ConsoleAndFileLogger.config = config;
    }

    public static logTag(dt: Date): string {
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

    public static hidePassword(msg: string): string {
        if (!ConsoleAndFileLogger.config?.password) {
            return msg;
        }

        return msg.replace(ConsoleAndFileLogger.config.password, "******");
    }

    info(text: string): void {
        log.info(text)
    }

    public static getConsoleHandler() {
        return new log.handlers.ConsoleHandler("INFO", {
            formatter: this.getFormatter()
        })
    }

    public static getTimestampFileLogHandler(logFiles: string[]) {
        const logFileWithTimestamp = Deno.makeTempFileSync({
            prefix: `levain-${ConsoleAndFileLogger.logTag(new Date())}-`,
            suffix: ".log",
        });
        logFiles.push(logFileWithTimestamp);
        return this.getLogFileHandler(logFileWithTimestamp);
    }

    public static getLocalFileLogHandler(logFiles: string[]) {
        const localLogFile = `levain.log`
        logFiles.push(localLogFile)
        return this.getLogFileHandler(localLogFile, {mode: 'w'});
    }
}

