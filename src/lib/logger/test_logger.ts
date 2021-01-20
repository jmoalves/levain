import * as log from "https://deno.land/std/log/mod.ts";

import MemoryHandler from "./memory_handler.ts";

export default class TestLogger {

    static async setup() {
        const memoryHandler = new MemoryHandler("INFO");
        const testLogger = new TestLogger(memoryHandler)

        await log.setup({
            handlers: {
                // console: new log.handlers.ConsoleHandler("ERROR"),
                memory: memoryHandler,
            },
            loggers: {
                default: {
                    level: "DEBUG",
                    // handlers: ['console', 'memory'],
                    handlers: ['memory'],
                }
            },
        });

        return testLogger
    }

    constructor(
        private memoryHandler: MemoryHandler,
    ) {
    }

    get messages(): string[] {
        return this.memoryHandler?.messages || []
    }

    destroy() {
        this.memoryHandler.destroy()
    }
}