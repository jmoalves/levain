import ConsoleAndFileLogger from "./console_and_file_logger.ts";

Deno.test({
    name: 'should setup logger',
    async fn() {
        await ConsoleAndFileLogger.setup()
    },
    sanitizeResources: false,
    sanitizeOps: false,
})

Deno.test({
    name: 'should have option to skip local file log',
    async fn() {
        await ConsoleAndFileLogger.setup(true)
    },
    sanitizeResources: false,
    sanitizeOps: false,
})

