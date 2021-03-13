import * as log from "https://deno.land/std/log/mod.ts";
import * as path from "https://deno.land/std/path/mod.ts";

import Config from "./lib/config.ts";
import ConsoleAndFileLogger from "./lib/logger/console_and_file_logger.ts";
import Loader from "./lib/loader.ts";
import UserInfoUtil from "./lib/user_info/userinfo_util.ts";
import CliUtil from "./lib/cli_util.ts";
import CommandFactory, { CommandNotFoundError } from "./cmd/command_factory.ts";
import LevainReleases from "./lib/releases/levain_releases.ts";
import Levain from "../levain.ts";

import LevainVersion from "./levain_version.ts";

export default class LevainCli {

    async execute(myArgs: any = {}): Promise<void> {
        log.info("");
        log.info(`Levain ${LevainVersion.levainVersion}    (${Levain.levainRootFile})`);
        log.info(`Deno   v${Deno.version.deno}`);

        log.debug("args " + JSON.stringify(myArgs));

        if (myArgs["wait-to-begin"] && !myArgs["levain-upgrade"]) {
            console.log("");
            console.log("");
            CliUtil.askToContinue()

        }

        // Time to do business!
        log.info("==================================");
        log.debug("");
        log.debug(`CWD ${Deno.cwd()}`);

        if (myArgs?._?.length == 0 && !myArgs["levain-upgrade"]) {
            this.showCliHelp()
            return
        }

        // Context
        const config = new Config(myArgs);
        ConsoleAndFileLogger.config = config;

        function getCmdFromArgs() {
            return myArgs._.shift()!;
        }

        // First parameter is the command
        let cmd: string = getCmdFromArgs();
        
        // Ask for user_info
        if (cmd === 'install') {
            const userInfoUtil = new UserInfoUtil()
            userInfoUtil.askUserInfo(config, myArgs);
        }

        // Shell path
        if (myArgs.shellPath) {
            config.shellPath = myArgs.shellPath
        }

        if (!myArgs["skip-levain-updates"]) {
            let levainReleases = new LevainReleases(config)
            await levainReleases.checkLevainUpdate()
        }
        
        // Repository Manager
        await config.repositoryManager.init({
            repos: myArgs.addRepo,
            tempRepos: myArgs.tempRepo
        })

        const loader = new Loader(config);
        try {
            if (myArgs["levain-upgrade"]) {
                await loader.command("install", ["--force", "levain"])
                log.info("");
                log.info("");
                log.info("");
                log.info("Levain upgrade completed. Please re-execute your previous command")
                log.info("");
                prompt("Hit ENTER to finish");
                log.info("");
                log.info("Bye.");
                Deno.exit(0)
            } else {
                if (cmd != "clean") {
                    await loader.command("clean", [])
                }

                await loader.command(cmd, myArgs._)
            }
        } catch (err) {
            if (err instanceof CommandNotFoundError) {
                log.info("");
                log.error(err);
                this.showCliHelp()
                return
            }
            throw err
        }
        
        /////////////////////////////////////////////////////////////////////////////////
        log.info("==================================");

        config.save();
    }


    showCliHelp() {
        const commandFactory = new CommandFactory();
        const examples = commandFactory
            .list()
            .sort()
            .map(name => commandFactory.get(name, new Config({})))
            .map(command => command.oneLineExample)

        log.info("");
        log.info("Commands available:")
        examples.forEach(example => log.info(example))
    }
}
