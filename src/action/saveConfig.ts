import Action from "../lib/action.ts";
import Config from "../lib/config.ts";
import FileSystemPackage from '../lib/package/fileSystemPackage.ts';

export default class SaveConfig implements Action {
    constructor(private config: Config) {
    }

    execute(pkg: FileSystemPackage, parameters: string[]): void {
        this.config.save();
    }
}