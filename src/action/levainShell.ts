import Action from "../lib/action.ts";
import Config from "../lib/config.ts";
import FileSystemPackage from '../lib/package/file_system_package.ts';
import Loader from '../lib/loader.ts';

export default class LevainShell implements Action {
    constructor(private config: Config) {
    }

    async execute(pkg: FileSystemPackage, parameters: string[]) {
        // TODO: We should be able to silence the levain logs here

        const loader = new Loader(this.config);
        // unshift should appear in reverse order!
        parameters.unshift("--run");
        parameters.unshift(pkg.name);
        parameters.unshift("--package");
        await loader.command("shell", parameters);

        // TODO: We should be able to turn the levain logs on here
    }
}
