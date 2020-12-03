import * as log from "https://deno.land/std/log/mod.ts";
import * as path from "https://deno.land/std/path/mod.ts";
import Config from "./lib/config.ts";
import ConsoleAndFileLogger from "./lib/logger/console_and_file_logger.ts";
import Loader from "./lib/loader.ts";
import UserInfoUtil from "./lib/user_info/userinfo_util.ts";

export default class LevainCli {

    async execute(myArgs: any = {}): Promise<void> {
        const __filename = path.fromFileUrl(import.meta.url);

        log.info(`levain vHEAD    (${__filename})`);
        log.info(`  deno v${Deno.version.deno}`);

        log.debug("args " + JSON.stringify(myArgs));

        if (myArgs["wait-to-begin"]) {
            console.log("");
            console.log("");
            let answer = prompt("Continue?", "Y");
            if (!answer || !["Y", "YES"].includes(answer.toUpperCase())) {
                log.info("");
                log.info("Ok, aborting...");
                Deno.exit(1);
            }
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
            await this.askUserInfo(config, myArgs);
        }

        const loader = new Loader(config);
        await loader.command(cmd, myArgs._);

        /////////////////////////////////////////////////////////////////////////////////
        log.info("==================================");
        log.info("");

        config.save();
    }

    async askUserInfo(config: Config, myArgs: any) {
        // Some nasty tricks... Should we refactor this?
        let separatorEnd: (() => void) | undefined = () => {
        };
        let separatorBegin: (() => void) | undefined = () => {
            if (separatorEnd) console.log("");
            log.info("==================================");
            log.info("");
            if (separatorBegin) console.log("");

            separatorEnd = separatorBegin;
            separatorBegin = undefined;
        };
        //

        if (myArgs.askPassword) {
            (separatorBegin ? separatorBegin() : undefined);

            log.warning("--askPassword is Deprecated. Use --ask-login and --ask-password");
            myArgs["ask-login"] = true;
            myArgs["ask-password"] = true;
        }

        const userInfoUtil = new UserInfoUtil()

        if (myArgs["ask-login"]) {
            (separatorBegin ? separatorBegin() : undefined);

            userInfoUtil.askLogin(config);
        }

        if (myArgs["ask-password"]) {
            (separatorBegin ? separatorBegin() : undefined);

            await userInfoUtil.askPassword(config);
        }

        if (myArgs["ask-email"]) {
            (separatorBegin ? separatorBegin() : undefined);

            userInfoUtil.askEmail(config, myArgs["email-domain"]);
        }

        if (myArgs["ask-fullname"]) {
            (separatorBegin ? separatorBegin() : undefined);

            userInfoUtil.askFullName(config);
        }

        (separatorEnd ? separatorEnd() : undefined);
    }

    showCliHelp() {
        log.info("");
        log.info("Commands available:")
        log.info("  list <optional search text>")
        log.info("  install <package name>")
        log.info("  shell <optional package name>")
    }

}