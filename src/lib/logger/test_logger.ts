import * as log from "https://deno.land/std/log/mod.ts";
import TestHandler from "./test_handler.ts";

export default class TestLogger {

    static async setup(): Promise<TestHandler> {
        const testHandler = new TestHandler("INFO");
        await log.setup({
            handlers: {
                console: new log.handlers.ConsoleHandler("DEBUG"),
                test: testHandler,
            },
            loggers: {
                default: {
                    level: "DEBUG",
                    handlers: ['console', 'test'],
                }
            },
        });

        return testHandler
    }

}