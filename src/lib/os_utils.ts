import * as log from "https://deno.land/std/log/mod.ts";
import * as path from "https://deno.land/std/path/mod.ts";
import Config from "./config.ts";
import FileUtils from "./file_utils.ts";
import {envChain} from "./utils.ts";

export default class OsUtils {

    static get tempDir(): string {
        const tempDirEnvVars = ['TEMP', 'TMPDIR', 'TMP'];
        const tempDir = envChain(...tempDirEnvVars);
        if (!tempDir) {
            //throw `TempDir not found. Looked for env vars ${tempDirEnvVars.join()}`
            return "/tmp";
        }

        return tempDir
    }

    static get login(): string {
        const userEnvStrings = ['USERID', "USER", "user", "username"];
        const userFromEnv = envChain(...userEnvStrings);
        if (!userFromEnv) {
            throw `User not found. Looked for env vars ${userEnvStrings.join()}`
        }
        return userFromEnv
    }

    static get homeDir(): string {
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
        Deno.env.set(key, value)

        await this.runAndLog(`setx ${key} ${value}`)
    }

    static async addPathPermanent(newPathItem: any, config: Config) {
        OsUtils.onlyInWindows()
        const userPathCMD = path.resolve(config.levainSrcDir, 'src', 'userPath.cmd')
        FileUtils.throwIfNotExists(userPathCMD)
        const resolvedPathItem = path.resolve(newPathItem);
        FileUtils.throwIfNotExists(resolvedPathItem)
        await this.runAndLog(`${userPathCMD} ${resolvedPathItem}`)
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

        proc.close()

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

    static async clearConsole() {
        const cmdLine = OsUtils.isWindows() ? 'cmd /c cls' : 'clear';
        const cmd = cmdLine.split(' ')
        let proc = Deno.run({cmd})
        await proc.status();
        proc.close();
    }

    static makeReadOnly(path: string) {
        Deno.chmodSync(path, 0o444)
    }

    static makeReadWrite(path: string) {
        Deno.chmodSync(path, 0o777)
    }
}
