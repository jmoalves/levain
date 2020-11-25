import * as log from "https://deno.land/std/log/mod.ts";

export class AutoFlushLogFileHandler extends log.handlers.FileHandler {
    log(msg: string): void {
        super.log(msg);
        super.flush();
    }
}