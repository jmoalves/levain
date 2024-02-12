import * as log from "https://deno.land/std/log/mod.ts";

export class AutoFlushLogFileHandler extends log.FileHandler {
    constructor(
        // levelName: LevelName,
        // options: HandlerOptions,
        levelName: "NOTSET" | "DEBUG" | "INFO" | "WARNING" | "ERROR" | "CRITICAL",
        fullOptions: any,
    ) {
        super(levelName, fullOptions)
    }

    log(msg: string): void {
        super.log(msg);
        super.flush();
    }
}
