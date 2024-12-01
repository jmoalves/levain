import * as log from "jsr:@std/log";

import MemoryHandler from "./memory_handler.ts";

export default class TestLogger {

    static async setup(): Promise<TestLogger> {
        const memoryHandler = new MemoryHandler("DEBUG");
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
