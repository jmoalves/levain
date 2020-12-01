import {runLevinWithLog} from "./levain.ts";
import LogUtils from "./lib/logger/log_utils.ts";

Deno.test('should show help message when no command was included',
    async () => {

        await runLevinWithLog()

        await LogUtils.closeLogFiles()
    }
)
