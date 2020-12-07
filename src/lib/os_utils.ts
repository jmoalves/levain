import * as log from "https://deno.land/std/log/mod.ts";
import {envChain} from "./utils.ts";

export default class OsUtils {

    static get login(): string {
        const userEnvStrings = ['USERID', "USER", "user", "username"];
        const userFromEnv = envChain(...userEnvStrings);
        if (!userFromEnv) {
            throw `User not found. Looked for env vars ${userEnvStrings.join()}`
        }
        return userFromEnv
    }

    static get homeFolder(): string {
        const homeEnvStrings = ['HOME', 'USERPROFILE'];
        const folderFromEnv = envChain(...homeEnvStrings);
        if (!folderFromEnv) {
            throw `Home folder not found. Looked for env vars ${homeEnvStrings.join()}`
        }
        return folderFromEnv
    }

    static onlyInWindows(isError = true) {
        if (!OsUtils.isWindows()) {
            const message = `${OsUtils.getOs()} not supported`
            if (isError) {
                throw new Error(message)
            } else {
                log.warning(message)
            }
        }
    }

    static isWindows(): boolean {
        return this.getOs() === "windows"
    }

    static getOs(): string {
        return Deno.build.os;
    }

    static async setEnvPermanent(key: string, value: string) {
        OsUtils.onlyInWindows()
        await this.runAndLog(`setx ${key}=${value}`)
    }

    static async runAndLog(command: string): Promise<void> {
        log.debug(`runAndLog\n${command}`)
        let args = command.split(" ");

        // https://github.com/denoland/deno/issues/4568
        const proc = Deno.run({
            cmd: args,
            // stderr: 'piped',
            stdout: 'piped',
        });
        const [
            // stderr,
            stdout,
            status
        ] = await Promise.all([
            // proc.stderrOutput(),
            proc.output(),
            proc.status()
        ]);

        log.debug(`status ${JSON.stringify(status)}`)

        if (status.success) {
            const output = new TextDecoder().decode(stdout)
            log.debug(`stdout ${output}`)
        } else {
            // const errorString = new TextDecoder().decode(stderr)
            // log.error(`stderr ${errorString}`)

            throw `Error ${status.code} running "${command}"`;
        }
    }

}


