import {envChain} from "./utils.ts";

export default class OsUtils {
    static homeFolder: string | undefined = envChain('HOME', 'USERPROFILE');

    static isWindows(): boolean {
        return Deno.build.os === "windows"
    }
}


