import ConsoleAndFileLogger from "./console_and_file_logger.ts";

Deno.test('should setup and destroy closing all files', async () => {
    await ConsoleAndFileLogger.setup()
    ConsoleAndFileLogger.destroy()
})