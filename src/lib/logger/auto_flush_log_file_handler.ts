import * as log from "jsr:@std/log";

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
