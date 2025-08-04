import OsUtils from "../../lib/os/os_utils.ts";
import Action from "../action.ts";
import {mvnCli} from "./maven_utils.ts";

class MavenCopyAction implements Action {
    // Executes the mavenCopy action
    async execute(packageManager: any, args: string[]): Promise<void> {
        if (args.length != 2) {
            throw new Error(
                'Invalid arguments.\n' +
                    '  Usage: mavenCopy [coordinates] [destination]\n' +
                    '  Example: mavenCopy mavenCopy.cmd br.gov.bndes.iew.iew-for-liberty:iew-userregistry-liberty-feature:1.7.1:esa c:\\temp',
            );
        }

        const [coordinates, destinationDir] = args;

        // Optionally handle flags like --ifNotExists
        const ifNotExists = args.includes('--ifNotExists');
        if (ifNotExists && await exists(destinationDir)) {
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

    // Fetches the Maven artifact using the Maven command
    private async fetchMavenArtifact(
        coordinates: string,
        dstFile: string,
    ): Promise<string | null> {
        const [groupId, artifactId, version] = coordinates.split(':');
        if (!groupId || !artifactId || !version) {
            throw new Error(`Invalid Maven coordinates: ${coordinates}`);
        }

        const command = [
            await mvnCli(),
            'dependency:copy',
            `-Dartifact=${coordinates}`,
            `-DoutputDirectory=${dstFile}`,
            `-Dmdep.overWriteReleases=true`,
            `-Dmdep.overWriteSnapshots=true`,
            `-Dmdep.overWriteIfNewer=true`,
        ];

        console.log(command.join(' '));
        await OsUtils.runAndLog(command);
        return dstFile;
    }
}

// Helper function to check if a file exists
async function exists(filePath: string): Promise<boolean> {
    try {
        await Deno.stat(filePath);
        return true;
    } catch {
        return false;
    }
}

export default MavenCopyAction;
