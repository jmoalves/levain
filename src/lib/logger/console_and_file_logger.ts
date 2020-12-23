import * as log from "https://deno.land/std/log/mod.ts";
import {ConsoleHandler, FileHandler} from "https://deno.land/std/log/handlers.ts";
import * as path from "https://deno.land/std/path/mod.ts";

import Config from "../config.ts";
import {AutoFlushLogFileHandler} from "./auto_flush_log_file_handler.ts";
import LogFormatterFactory from "./log_formatter_factory.ts";
import LogUtils from "./log_utils.ts";
import OsUtils from "../os_utils.ts";
import FileUtils from '../file_utils.ts';
import DateUtils from '../date_utils.ts';

export default class ConsoleAndFileLogger {
    static config: Config;
    logFiles: string[] = [];
    handlers: any = {};

    public static async setup(logFiles: string[] = []): Promise<ConsoleAndFileLogger> {

        const logger = new ConsoleAndFileLogger()
        logger.handlers['console'] = logger.getConsoleHandler()
        logFiles.forEach(it => logger.addLogFile(it))

        const handlerNames = Object.keys(logger.handlers)

        await log.setup({
            handlers: logger.handlers,
            loggers: {
                default: {
                    level: "DEBUG",
                    handlers: handlerNames,
                }
            },
        });

        return logger
    }

    showLogFiles(logFiles: string[]) {
        log.info('')
        log.info('Using the following LOG FILES. Passwords are masked out.')
        logFiles.forEach(logFile => {
            const fullPath = path.resolve(logFile);
            log.info(`- ${fullPath}`);
        })
    }

    static logTag(dt: Date = new Date()): string {
        return this.logDateTag(dt) + "-" + this.logTimeTag(dt);
    }

    static logDateTag(dt: Date = new Date()): string {
        return DateUtils.dateTag(dt);
    }

    static logTimeTag(dt: Date = new Date()): string {
        return DateUtils.timeTag(dt);
    }

    static hidePassword(msg: string): string {
        if (!ConsoleAndFileLogger.config?.password) {
            return msg;
        }

        return msg.replace(ConsoleAndFileLogger.config.password, "******");
    }

    getConsoleHandler(): ConsoleHandler {
        return new ConsoleHandler("INFO", {
            formatter: LogFormatterFactory.getHidePasswordFormatter()
        })
    }

    static getLogFileInTempFolder(): string {
        return Deno.makeTempFileSync({
            prefix: `levain-${ConsoleAndFileLogger.logTag()}-`,
            suffix: ".log",
        });
    }

    static getLogFileInHomeFolder(): string {
        return path.join(OsUtils.homeDir, 'levain.log')
    }

    static getLogFileInExtraDir(extraDir: string) {
        const myFileName = `levain-${OsUtils.login?.toLowerCase()}-${ConsoleAndFileLogger.logTag()}.log`
        return path.join(extraDir, myFileName)
    }

    addLogFile(logFile: string) {
        log.debug(`addLogFile ${logFile}`)
        try {
            const logFolder = path.dirname(logFile)
            if (!FileUtils.canWriteSync(logFolder)) {
                log.warning(`Could not write to log file ${logFile}`)
                return
            }
            const handler = this.getLogFileHandler(logFile);
            this.handlers[logFile] = handler;
            this.logFiles.push(logFile);
        } catch (error) {
            log.debug(`Cannot create a file in ${logFile}`)
            log.debug(error)
        }
    }

    getLogFileHandler(logFile: string, options = {}): FileHandler {
        const fullOptions = {
            filename: logFile,
            formatter: LogFormatterFactory.getFormatterWithDatetimeAndLevel(),
            mode: 'w',
            ...options
        }
        return new AutoFlushLogFileHandler("DEBUG", fullOptions);
    }

    flush() {
        Object.values(this.handlers)
            .forEach(handler => {
                if (handler instanceof FileHandler) {
                    (handler as FileHandler).flush()
                }
            })
    }

    async close() {
        await LogUtils.closeLogFiles()
    }


}
