import {LogRecord} from "https://deno.land/std/log/logger.ts"
import {LogLevels} from "https://deno.land/std/log/levels.ts"

export default class Fake_helper {

    static logRecord(message: string) {
        return new LogRecord({
            msg: message,
            args: [],
            level: LogLevels.INFO,
            loggerName: 'anyLogger',
        })
    }

}