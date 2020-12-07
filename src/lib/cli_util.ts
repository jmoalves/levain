import * as log from "https://deno.land/std/log/mod.ts";

export default class CliUtil {

    static askToContinue() {
        let answer = prompt("Continue?", "Y");
        if (!answer || !["Y", "YES"].includes(answer.toUpperCase())) {
            log.info("");
            log.info("Ok, aborting...");
            Deno.exit(1);
        }
    }
}