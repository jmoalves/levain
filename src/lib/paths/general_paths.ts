import * as path from "@std/path";

export default class GeneralPaths {
  static mvnCliPath(suffix: string=""): string {
    const m2home = Deno.env.get("M2_HOME");
    if (!m2home) {
      throw "M2_HOME not found";
    }
    const mavenCli = path.resolve(m2home, "bin", "mvn");
    if (suffix) {
      return mavenCli + ".cmd";
    }
    return mavenCli;
  }

  static get tempDir(): string {
    let tempDir = Deno.env.get("TEMP");
    if (tempDir) {
      return tempDir;
    }
    tempDir = Deno.env.get("TMPDIR");
    if (tempDir) {
      return tempDir;
    }
    tempDir = Deno.env.get("TMP");
    if (tempDir) {
      return tempDir;
    }
    //throw `TempDir not found. Looked for env vars ${tempDirEnvVars.join()}`
    return "/tmp";
  }

  static get tempLevainReleasesDir(): string {
    return path.resolve(GeneralPaths.tempDir, "levain");
  }
  
}
