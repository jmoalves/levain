import {runLevinWithLog} from "./levain.ts";
import ConsoleAndFileLogger from "./lib/logger/console_and_file_logger.ts";

Deno.test('should show help message when no command was included',
    async () => {

        await runLevinWithLog()

        await ConsoleAndFileLogger.close()
    }
)
