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

    static isWindows(): boolean {
        return Deno.build.os === "windows"
    }
}


