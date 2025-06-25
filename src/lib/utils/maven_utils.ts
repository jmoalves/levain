import * as path from "https://deno.land/std/path/mod.ts";
import OsUtils from "../os/os_utils.ts";

export var mvnCli = async function (): Promise<string> {
    // Common option
    const m2home = Deno.env.get("M2_HOME");
    if (!m2home) {
        throw "M2_HOME not found";
    }
    await checkMavenVersion()
    return path.resolve(m2home, 'bin', 'mvn')
}
export var checkMavenVersion = async function () {
    console.log('Checking Maven');
    const command = [
        await mvnCli(),
        '-version'
    ];
    console.log(command.join(' '))
    await OsUtils.runAndLog(command);
}
