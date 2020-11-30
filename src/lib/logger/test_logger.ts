import * as log from "https://deno.land/std/log/mod.ts";
import TestHandler from "./test_handler.ts";

export default class TestLogger {

    static async setup() {
        await log.setup({
            handlers: {
                test: TestHandler,
            },
            loggers: {
                default: {
                    level: "DEBUG",
                    handlers: ['test'],
                }
            },
        });
    }

}