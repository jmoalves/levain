import * as log from "https://deno.land/std/log/mod.ts";

export default class CliUtil {
    public static testMode: boolean;

    static askToContinue() {
        if (this.testMode) {
            return;
        }

        let answer = prompt("Continue?", "Y");
        if (!answer || !["Y", "YES"].includes(answer.toUpperCase())) {
            log.info("");
            log.info("Ok, aborting...");
            throw '== Do not continue =='
        }
    }
}