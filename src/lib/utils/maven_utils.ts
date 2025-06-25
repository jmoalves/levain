import * as path from "https://deno.land/std/path/mod.ts";
import OsUtils from "../os/os_utils.ts";

export var mvnCli = async function (): Promise<string> {
    // Common option
    const m2home = Deno.env.get("M2_HOME");
    if (!m2home) {
        throw "M2_HOME not found";
    }
    await checkMavenVersion(m2home)
    return path.resolve(m2home, 'bin', 'mvn')
}
export var checkMavenVersion = async function (mavenDir: string) {
    console.log(`Checking for Maven in ${mavenDir}`);
    const command = [
        mavenDir,
        '-version'
    ];
    console.log(command.join(' '))
    await OsUtils.runAndLog(command);
}
