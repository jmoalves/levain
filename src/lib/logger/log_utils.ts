import * as log from "https://deno.land/std/log/mod.ts";

export default class LogUtils {

    static async closeLogFiles() {
        return this.setupDefaultLogConfig()
    }
    
    static async setupDefaultLogConfig() {
        await log.setup({handlers: {}, loggers: {}})
    }

}