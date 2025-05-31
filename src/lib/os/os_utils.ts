import * as path from "https://deno.land/std/path/mod.ts";
import {dirname, fromFileUrl} from "https://deno.land/std/path/mod.ts";
import * as log from "https://deno.land/std/log/mod.ts";
import * as fs from "https://deno.land/std/fs/mod.ts";
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
            return '/tmp';
        }

        return tempDir;
    }

    static get login(): string {
        const userEnvStrings = ['USERID', 'USER', 'user', 'username'];
        const userFromEnv = envChain(...userEnvStrings);
        if (!userFromEnv) {
            throw `User not found. Looked for env vars ${userEnvStrings.join()}`;
        }
        return userFromEnv;
    }

    static get projectRootDir(): string {
        const thisFileDir = dirname(fromFileUrl(import.meta.url));
        return path.resolve(thisFileDir, '..', '..', '..');
    }

    static get desktopDir(): string {
        OsUtils.onlyInWindows();
        return path.resolve(OsUtils.homeDir, 'Desktop');
    }

    static get startMenuDir(): string {
        OsUtils.onlyInWindows();
        return path.resolve(
            OsUtils.homeDir,
            'AppData/Roaming/Microsoft/Windows/Start Menu/Programs',
        );
    }

    static get startupDir(): string {
        OsUtils.onlyInWindows();
        return path.resolve(OsUtils.startMenuDir, 'Startup');
    }

    static get homeDir(): string {
        const homeEnvStrings = ['HOME', 'USERPROFILE'];
        const folderFromEnv = envChain(...homeEnvStrings);
        if (!folderFromEnv) {
            throw `Home folder not found. Looked for env vars ${homeEnvStrings.join()}`;
        }
        return path.resolve(folderFromEnv);
    }

    static get hostname(): string | undefined {
        const hostEnvStrings = ['COMPUTERNAME', 'HOSTNAME'];
        const hostFromEnv = envChain(...hostEnvStrings);
        if (!hostFromEnv) {
            log.debug(
                `Hostname not found. Looked for env vars ${hostEnvStrings.join()}`,
            );
            return undefined;
        }

        return hostFromEnv;
    }

    static onlyInWindows(isError = true) {
        if (!OsUtils.isWindows()) {
            const message = `${OsUtils.getOs()} not supported`;
            if (isError) {
                throw new Error(message);
            } else {
                log.warn(message);
            }
        }
    }

    static isWindows(): boolean {
        return this.getOs() === 'windows';
    }

    static isPosix(): boolean {
        return this.isMacOs() || this.isLinux();
    }

    static isMacOs(): boolean {
        return this.getOs() === 'darwin';
    }

    static isLinux(): boolean {
        return this.getOs() === 'linux';
    }

    static getOs(): string {
        return Deno.build.os;
    }

    static async setEnvPermanent(key: string, value: string) {
        OsUtils.onlyInWindows();
        this.setEnv(key, value);

        await this.runAndLog(`setx ${key} ${value}`);
    }

    static setEnv(key: string, value: string) {
        Deno.env.set(key, value);
    }

    static async addPathPermanent(newPathItem: string): Promise<string> {
        OsUtils.onlyInWindows();

        const path = await this.getUserPath();
        let newPath = ArrayUtils.remove(path, newPathItem);
        newPath.unshift(newPathItem);

        return await this.setUserPath(newPath);
    }

    static async removePathPermanent(itemToRemove: string): Promise<string> {
        OsUtils.onlyInWindows();

        const path = await this.getUserPath();
        let newPath = ArrayUtils.remove(path, itemToRemove);
        return await this.setUserPath(newPath);
    }

    static async isInUserPath(pathItem: string) {
        const path = await this.getUserPath();
        return path.includes(pathItem);
    }

    static async runAndLog(
        command: string | string[],
        workDir = '.',
    ): Promise<string> {
        log.debug(`runAndLog\n${command}`);

        let args: string[];

        if (typeof command === 'string') {
            args = command.split(' ');
        } else if (command instanceof Array) {
            args = command;
        } else {
            log.error(command);
            throw `********** Unknown command type ${typeof command}`;
        }

        // https://github.com/denoland/deno/issues/4568
        const runOptions: Deno.RunOptions = {
            cmd: args,
            cwd: workDir,
            stderr: 'piped',
            stdout: 'piped',
        };
        const proc = Deno.run(runOptions);

        const [
            stderr,
            stdout,
            status,
        ] = await Promise.all([
            proc.stderrOutput(),
            proc.output(),
            proc.status(),
        ]);

        proc.close();

        log.debug(`status ${JSON.stringify(status)}`);

        if (!status.success) {
            let stderrOutput = OsUtils.decodeOutput(stderr);
            throw `Error ${status.code} running "${command}\n${stderrOutput}"`;
        }

        const output = OsUtils.decodeOutput(stdout);

        // TODO it should not be necessary to remove \u0000 from stdout. Is it a bug in Deno 1.13.2?
        const cleanOutput = output.replaceAll(/\u0000/gm, '');

        log.debug(`stdout ${cleanOutput}`);
        return cleanOutput;
    }

    static decodeOutput(output: Uint8Array) {
        return new TextDecoder().decode(output);
    }

    static async clearConsole() {
        const cmdLine = OsUtils.isWindows() ? 'cmd /c cls' : 'clear';
        const cmd = cmdLine.split(' ');
        return await OsUtils.runAndLog(cmd);
    }

    static makeReadOnly(path: string) {
        Deno.chmodSync(path, 0o444);
    }

    static removePermissions(path: string) {
        Deno.chmodSync(path, 0);
    }

    static makeReadWrite(path: string) {
        Deno.chmodSync(path, 0o777);
    }

    static async sanitizeUserPath() {
        if (OsUtils.isWindows()) {
            const path = await this.getUserPath();
            const sanitizedPath = this.sanitizePathArray(path);
            if (path != sanitizedPath) {
                await this.setUserPath(sanitizedPath);
            }
        }
    }

    static sanitizePathArray(path: string[]): string[] {
        return path.map((part) => this.sanitizePathString(part));
    }

    static sanitizePathString(path: string): string {
        return path.replace(/"/g, '');
    }

    static async getUserPath(): Promise<string[]> {
        this.onlyInWindows();
        const script = this.getScriptUri('getUserPath.ps1');

        const rawPath = await Powershell.run(script, true);

        return rawPath.split(';');
    }

    static async setUserPath(path: string[]): Promise<string> {
        this.onlyInWindows();
        const pathString = path.join(';');
        const sanitizedPath = this.sanitizePathString(pathString);
        const script = this.getScriptUri('setUserPath.ps1');

        return await Powershell.run(script, false, false, [sanitizedPath]);
    }

    static getScriptUri(scriptName: string) {
        const scriptsDir = ExtraBin.osUtilsDir;
        return path.resolve(scriptsDir, scriptName);
    }

    static async createShortcut(
        oldPath: string | string[],
        newPath: string | string[],
    ) {
        const oldPathResolved = OsUtils.resolvePath(oldPath);
        const newPathResolved = OsUtils.resolvePath(newPath);
        log.debug(`createShortcut ${oldPathResolved} ${newPathResolved}`);

        fs.ensureDirSync(newPathResolved);

        if (OsUtils.isWindows()) {
            const createShortcutScript = OsUtils.getScriptUri(
                'createShortcut.ps1',
            );

            return await Powershell.run(
                createShortcutScript,
                false,
                false,
                [oldPathResolved, newPathResolved],
            );
        }
        return Deno.symlinkSync(oldPathResolved, newPathResolved);
    }

    static resolvePath(unresolvedPath: string | string[]): string {
        if (!unresolvedPath) {
            return '';
        }

        let pathArray = [];

        if (unresolvedPath instanceof Array) {
            pathArray = unresolvedPath as string[];
            if (pathArray[0]) {
                pathArray[0] = pathArray[0].replace('file:///', '');
            }
        } else {
            const stringPath = unresolvedPath as string;
            const windowsFile = stringPath.replace('file:///', '');
            pathArray = [windowsFile];
        }

        return path.resolve(...pathArray);
    }

    static async addToStartup(targetFile: string) {
        log.debug(`addToStartup ${targetFile}`);
        OsUtils.onlyInWindows();
        const startupDir = OsUtils.startupDir;
        await OsUtils.createShortcut(targetFile, startupDir);
    }

    static async addToDesktop(targetFile: string) {
        log.debug(`addToDesktop ${targetFile}`);
        OsUtils.onlyInWindows();
        const desktopDir = OsUtils.desktopDir;
        await OsUtils.createShortcut(targetFile, desktopDir);
    }

    static async addToStartMenu(
        targetFile: string,
        folderName: string | undefined = undefined,
    ) {
        OsUtils.onlyInWindows();
        const startMenuDir = OsUtils.startMenuDir;
        const shortcutDir = folderName
            ? path.resolve(startMenuDir, folderName)
            : startMenuDir;

        log.debug(`addToStartMenu ${targetFile}`);
        await OsUtils.createShortcut(targetFile, shortcutDir);
    }

    static removeFile(filePath: string): void {
        if (fs.existsSync(filePath)) {
            Deno.removeSync(filePath);
        }
    }

    static removeDir(dirPath: string): void {
        if (fs.existsSync(dirPath)) {
            Deno.removeSync(dirPath, { recursive: true });
        }
    }
}
