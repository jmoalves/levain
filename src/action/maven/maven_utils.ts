import OsUtils from "../../lib/os/os_utils.ts";
import GeneralPaths from "../../lib/paths/general_paths.ts";

export async function mvnCli(): Promise<string> {
  // Common option
  const mavenCli = GeneralPaths.mvnCliPath(OsUtils.isWindows() ? ".cmd" : "");
  await checkMavenVersion(mavenCli);
  return mavenCli;
};
export async function checkMavenVersion(mavenCli: string) {
  console.log(`Checking for Maven in ${mavenCli}`);
  const command = [
    mavenCli,
    "-version",
  ];
  console.log(command.join(" "));
  await OsUtils.runAndLog(command);
};
