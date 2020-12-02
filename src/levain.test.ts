import {runLevinWithLog} from "./levain.ts";

Deno.test('should show help message when no command was included',
    async () => {

        const logger = await runLevinWithLog()
 
        await logger?.close()
    }
)
