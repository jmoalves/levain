import {runLevinWithLog} from "./levain.ts";

Deno.test({
    name: 'should show help message when no command was included',
    async fn() {
        await runLevinWithLog()
    },
    sanitizeResources: false,
    sanitizeOps: false,
})
