import * as path from "https://deno.land/std/path/mod.ts";
import * as log from "https://deno.land/std/log/mod.ts";
import {ensureDirSync} from "https://deno.land/std/fs/mod.ts";
import {ArrayUtils} from "../utils/array_utils.ts";
import {envChain} from "../utils/utils.ts";
import {Powershell} from "./powershell.ts";
import ExtraBin from "../extra_bin.ts";

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

    static get hostname(): string | undefined {
        const hostEnvStrings = ['COMPUTERNAME', "HOSTNAME"]
        const hostFromEnv = envChain(...hostEnvStrings)
        if (!hostFromEnv) {
            log.debug(`Hostname not found. Looked for env vars ${hostEnvStrings.join()}`)
            return undefined
        }

        return hostFromEnv
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
        this.setEnv(key, value);

        await this.runAndLog(`setx ${key} ${value}`)
    }

    static setEnv(key: string, value: string) {
        Deno.env.set(key, value)
    }

    static async addPathPermanent(newPathItem: string): Promise<string> {
        OsUtils.onlyInWindows()

        const path = await this.getUserPath();
        let newPath = ArrayUtils.remove(path, newPathItem)

        newPath.unshift(newPathItem);

        return await this.setUserPath(newPath);
    }

    static async removePathPermanent(itemToRemove: string): Promise<string> {
        const path = await this.getUserPath();
        let newPath = ArrayUtils.remove(path, itemToRemove)
        return await this.setUserPath(newPath);
    }


    static async isInUserPath(pathItem: string) {
        const path = await this.getUserPath();
        return path.includes(pathItem);
    }


    static async runAndLog(command: string | string[]): Promise<string> {
        log.debug(`runAndLog\n${command}`)

        let args: string[];

        if (typeof command === "string") {
            args = command.split(' ')
        } else if (command instanceof Array) {
            args = command
        } else {
            log.error(command)
            throw `********** Unkown command type ${typeof command}`
        }

        // https://github.com/denoland/deno/issues/4568
        const proc = Deno.run({
            cmd: args,
            stderr: 'piped',
            stdout: 'piped',
        });

        const [
            stderr,
            stdout,
            status
        ] = await Promise.all([
            proc.stderrOutput(),
            proc.output(),
            proc.status()
        ]);

        proc.close()

        log.debug(`status ${JSON.stringify(status)}`)

        if (!status.success) {
            let stderrOutput = this.decodeOutput(stderr)
            throw `Error ${status.code} running "${command}\n${stderrOutput}"`;
        }

        const output = OsUtils.decodeOutput(stdout)
        log.debug(`stdout ${output}`)
        return output
    }

    static decodeOutput(output: Uint8Array) {
        return new TextDecoder().decode(output);
    }

    static async clearConsole() {
        const cmdLine = OsUtils.isWindows() ? 'cmd /c cls' : 'clear';
        const cmd = cmdLine.split(' ')
        return await OsUtils.runAndLog(cmd)
    }

    static makeReadOnly(path: string) {
        Deno.chmodSync(path, 0o444)
    }

    static makeReadWrite(path: string) {
        Deno.chmodSync(path, 0o777)
    }

    static async getUserPath(): Promise<string[]> {
        this.onlyInWindows()
        const script = this.getScriptUri('getUserPath.ps1')

        const rawPath = await Powershell.run(script, true)

        return rawPath.split(';')
    }

    static async setUserPath(newPath: string[]): Promise<string> {
        this.onlyInWindows()
        const newPathString = newPath.join(';')
        const script = this.getScriptUri('setUserPath.ps1')

        return await Powershell.run(script, false, false, [newPathString]);
    }

    static getScriptUri(scriptName: string) {
        const scriptsDir = ExtraBin.osUtilsDir
        return path.resolve(scriptsDir, scriptName);
    }

    static createShortcut(oldPath: string | string[], newPath: string | string[]) {
        const oldPathResolved = OsUtils.resolvePath(oldPath)
        const newPathResolved = OsUtils.resolvePath(newPath)

        return Deno.symlinkSync(oldPathResolved, newPathResolved)
    }

    static resolvePath(unresolvedPath: string | string[]): string {
        if (!unresolvedPath) {
            return ''
        }

        let pathArray = []

        if (unresolvedPath instanceof Array) {
            pathArray = (unresolvedPath as string[])
            if (pathArray[0]) {
                pathArray[0] = pathArray[0].replace("file:///", '')
            }
        } else {
            const stringPath = unresolvedPath as string;
            const windowsFile = stringPath.replace("file:///", '');
            pathArray = [windowsFile]
        }

        return path.resolve(...pathArray)
    }

    static async addToStartup(targetFile: string) {
        OsUtils.onlyInWindows()

        // TODO replace
        const windowsFile = targetFile.replace("file:///", '');
        const resolvedTargetFile = path.resolve(windowsFile);
        const cmd = Deno.run({cmd: ["extra-bin/windows/os-utils/addToStartup.cmd", resolvedTargetFile]});
        const result = await cmd.status();
        cmd.close()
        // TODO with this
        // const userProfile = OsUtils.homeDir
        // const startupDir = path.resolve(userProfile, 'AppData/Roaming/Microsoft/Windows/Start Menu/Programs/Startup')
        // OsUtils.createShortcut(targetFile, startupDir)
        //
    }

    static async addToDesktop(targetFile: string) {
        OsUtils.onlyInWindows()

        // TODO replace
        const windowsFile = targetFile.replace("file:///", '');
        const resolvedTargetFile = path.resolve(windowsFile);
        const cmd = Deno.run({cmd: ["extra-bin/windows/os-utils/addToDesktop.cmd", resolvedTargetFile]});
        const result = await cmd.status();
        cmd.close();
        // TODO with this
        // const userProfile = OsUtils.homeDir
        // const desktopDir = path.resolve(userProfile, 'Desktop')
        // OsUtils.createShortcut(targetFile, desktopDir)
    }

    static async addToStartMenu(targetFile: string, folderName: string | undefined) {
        OsUtils.onlyInWindows()

        // TODO replace
        const windowsFile = targetFile.replace("file:///", '');
        const resolvedTargetFile = path.resolve(windowsFile);
        if (folderName) {
            const script = OsUtils.getScriptUri('addToStartMenuWithinFolder.cmd')

            const userProfile = Deno.env.get("USERPROFILE");
            const startMenuPath = `${userProfile}\\AppData\\Roaming\\Microsoft\\Windows\\Start Menu\\Programs`;
            const folderPath = path.resolve(startMenuPath, folderName);
            ensureDirSync(folderPath);

            await OsUtils.runAndLog([script, resolvedTargetFile, folderName])
        } else {
            const script = OsUtils.getScriptUri('addToStartMenu.cmd')
            await OsUtils.runAndLog([script, resolvedTargetFile])
        }
        // TODO with this
        // const userProfile = OsUtils.homeDir
        // const startMenuDir = path.resolve(userProfile, '\\AppData\\Roaming\\Microsoft\\Windows\\Start Menu\\Programs')
        // const shortcutDir =
        //     folderName
        //         ? [startMenuDir, folderName]
        //         : startMenuDir
        // OsUtils.createShortcut(targetFile, shortcutDir)
    }
}
