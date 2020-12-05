import * as log from "https://deno.land/std/log/mod.ts";

export class AutoFlushLogFileHandler extends log.handlers.FileHandler {
    constructor(
        // levelName: LevelName,
        // options: HandlerOptions,
        levelName: string,
        fullOptions: { formatter: (logRecord: any) => string; mode: string; filename: string },
    ) {
        super(levelName, fullOptions)
    }

    log(msg: string): void {
        super.log(msg);
        super.flush();
    }
}
