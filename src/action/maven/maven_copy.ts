import * as path from "@std/path";
import OsUtils from "../../lib/os/os_utils.ts";
import { parseArgs } from "../../lib/parse_args.ts";
import { FileUtils } from "../../lib/fs/file_utils.ts";
import type Action from "../action.ts";
import { mvnCli } from "./maven_utils.ts";

class MavenCopyAction implements Action {
  // Executes the mavenCopy action
  async execute(_packageManager: any, args: string[]): Promise<void> {
    const myArgs = parseArgs(args, {
      boolean: [
        "ifNotExists",
      ],
      stopEarly: false,
    });

    if (!myArgs?._ || myArgs._.length !== 2) {
      throw new Error(
        "Invalid arguments.\n" +
          "  Usage: mavenCopy [--ifNotExists] [coordinates] [destination]\n" +
          "  Example: mavenCopy com.example:sample-artifact:1.0.0:jar c:\\temp",
      );
    }

    const [coordinates, destinationDir] = myArgs._;
    if (/[\r\n\0]/.test(destinationDir)) {
      throw new Error(`Invalid destination path: ${destinationDir}`);
    }

    const parts = coordinates.split(":");
    if (parts.length < 3 || parts.length > 5) {
      throw new Error(`Invalid Maven coordinates: ${coordinates}`);
    }
    const coordSegmentRegex = /^[A-Za-z0-9._-]+$/;
    for (const segment of parts) {
      if (!segment || segment.includes("..") || !coordSegmentRegex.test(segment)) {
        throw new Error(`Invalid Maven coordinates: ${coordinates}`);
      }
    }

    const [_groupId, artifactId, version, packaging = "jar", classifier] = parts;

    if (myArgs.ifNotExists && await this.artifactAlreadyExists(destinationDir, artifactId, version, packaging, classifier)) {
      console.info(
        `File already exists: ${destinationDir}. Skipping copy.`,
      );
      return;
    }

    // Resolve the Maven artifact and download it
    console.log(`Fetching Maven artifact: ${coordinates}`);
    const artifactPath = await this.fetchMavenArtifact(
      coordinates,
      destinationDir,
    );

    if (!artifactPath) {
      throw new Error(`Failed to fetch Maven artifact: ${coordinates}`);
    }
  }

  private async artifactAlreadyExists(
    destination: string,
    artifactId: string,
    version: string,
    packaging: string,
    classifier?: string,
  ): Promise<boolean> {
    if (!await OsUtils.exists(destination)) {
      return false;
    }

    if (!FileUtils.isDir(destination)) {
      throw new Error(`Destination path is not a directory: ${destination}`);
    }

    const expectedName = `${artifactId}-${version}${classifier ? `-${classifier}` : ""}.${packaging}`;
    return await OsUtils.exists(path.join(destination, expectedName));
  }

  // Fetches the Maven artifact using the Maven command
  private async fetchMavenArtifact(
    coordinates: string,
    dstFile: string,
  ): Promise<string | null> {
    const command = [
      await mvnCli(),
      "dependency:copy",
      `-Dartifact=${coordinates}`,
      `-DoutputDirectory=${dstFile}`,
      `-Dmdep.overWriteReleases=true`,
      `-Dmdep.overWriteSnapshots=true`,
      `-Dmdep.overWriteIfNewer=true`,
    ];

    console.log(command.join(" "));
    await OsUtils.runAndLog(command);
    return dstFile;
  }
}

export default MavenCopyAction;
