import * as log from "https://deno.land/std/log/mod.ts";

export class AutoFlushLogFileHandler extends log.FileHandler {
    constructor(
        levelName: log.LevelName,
        fullOptions: any,
    ) {
        super(levelName, fullOptions)
    }

    log(msg: string): void {
        super.log(msg);
        super.flush();
    }
}
