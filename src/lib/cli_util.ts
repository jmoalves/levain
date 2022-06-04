import * as log from "https://deno.land/std/log/mod.ts";

import t from './i18n.ts'

export default class CliUtil {
    public static testMode: boolean;

    static askToContinue() {
        if (this.testMode) {
            return;
        }

        let answer = prompt(t("lib.cli_util.continue"), t("lib.cli_util.continueDefault"));
        if (!answer || ![t("lib.cli_util.continueDefault")].includes(answer.toUpperCase())) {
            log.info("");
            log.info(t("lib.cli_util.aborting"));
            throw t("lib.cli_util.doNotContinue")
        }
    }
}
