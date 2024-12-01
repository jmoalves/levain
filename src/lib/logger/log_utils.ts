import * as log from "jsr:@std/log";

export default class LogUtils {

    static async closeLogFiles() {
        return this.setupDefaultLogConfig()
    }
    
    static async setupDefaultLogConfig() {
        await log.setup({handlers: {}, loggers: {}})
    }

}