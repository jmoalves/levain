import * as log from "https://deno.land/std/log/mod.ts";
import * as path from "https://deno.land/std/path/mod.ts";
import Config from "./lib/config.ts";
import ConsoleAndFileLogger from "./lib/logger/console_and_file_logger.ts";
import Loader from "./lib/loader.ts";
import UserInfoUtil from "./lib/user_info/userinfo_util.ts";
import CliUtil from "./lib/cli_util.ts";

export default class LevainCli {

    async execute(myArgs: any = {}): Promise<void> {
        const __filename = path.fromFileUrl(import.meta.url);

        log.info(`levain v0.10.2    (${__filename})`);
        log.info(`Deno   v${Deno.version.deno}`);

        log.debug("args " + JSON.stringify(myArgs));

        if (myArgs["wait-to-begin"]) {
            console.log("");
            console.log("");
            CliUtil.askToContinue()

        }

        // Time to business!
        log.info("");
        log.info("==================================");
        log.info("");
        log.info(`CWD ${Deno.cwd()}`);

        if (myArgs?._?.length == 0) {
            this.showCliHelp()
            return
        }

        // Context
        const config = new Config(myArgs);
        ConsoleAndFileLogger.config = config;

        function getCmd() {
            return myArgs._.shift()!;
        }

        // First parameter is the command
        let cmd: string = getCmd();

        // Ask for user_info
        if (cmd === 'install') {
            const userInfoUtil = new UserInfoUtil()
            userInfoUtil.askUserInfo(config, myArgs);
        }

        const loader = new Loader(config);
        await loader.command(cmd, myArgs._);

        /////////////////////////////////////////////////////////////////////////////////
        log.info("==================================");
        log.info("");

        config.save();
    }


    showCliHelp() {
        log.info("");
        log.info("Commands available:")
        log.info("  list <optional search text>")
        log.info("  install <package name>")
        log.info("  shell <optional package name>")
    }

}
