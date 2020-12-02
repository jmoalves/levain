import {envChain} from "./utils.ts";

export default class OsUtils {
    static get homeFolder(): string {
        const homeEnvStrings = ['HOME', 'USERPROFILE'];
        const folderFromEnv = envChain(...homeEnvStrings);
        if (!folderFromEnv) {
            throw `Home folder not found. Looked for env vars ${homeEnvStrings.join()}`
        }
        return folderFromEnv
    }

    static isWindows(): boolean {
        return Deno.build.os === "windows"
    }
}


