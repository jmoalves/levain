import * as path from "https://deno.land/std/path/mod.ts";
import OsUtils from "../os/os_utils.ts";
import {isWindows} from "https://deno.land/std@0.224.0/path/_os.ts";

export var mvnCli = async function (): Promise<string> {
    // Common option
    const m2home = Deno.env.get("M2_HOME");
    if (!m2home) {
        throw "M2_HOME not found";
    }
    let mavenCli = path.resolve(m2home, 'bin', 'mvn');
    if (OsUtils.isWindows()) {
        mavenCli += '.cmd'
    }
    await checkMavenVersion(mavenCli)
    return mavenCli
}
export var checkMavenVersion = async function (mavenCli: string) {
    console.log(`Checking for Maven in ${mavenCli}`);
    const command = [
        mavenCli,
        '-version'
    ];
    console.log(command.join(' '))
    await OsUtils.runAndLog(command);
}
