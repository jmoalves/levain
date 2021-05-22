import * as path from "https://deno.land/std/path/mod.ts";
import * as yaml from "https://deno.land/std/encoding/yaml.ts";
import {existsSync} from "https://deno.land/std/fs/mod.ts";

import Repository from '../repository/repository.ts'
import Config from "../config.ts";
import {FileUtils} from '../fs/file_utils.ts';
import AbstractPackage from './abstract_package.ts';
import VersionNumber from "../utils/version_number.ts";

export default class FileSystemPackage extends AbstractPackage {
    private readonly _version: VersionNumber;
    private readonly _dependencies: string[] | undefined = undefined;
    private readonly _yamlStruct: any;
    readonly baseDir: string

    constructor(
        private config: Config,
        public readonly name: string,
        private _baseDir: string,
        public readonly filePath: string,
        yamlStr: string,
        private _repo?: Repository
    ) {
        super();
        this._yamlStruct = yaml.parse(yamlStr);

        this._version = new VersionNumber(this._yamlStruct?.version);
        if (this._yamlStruct?.dependencies) {
            this._dependencies = this._yamlStruct?.dependencies;
        }
        this._dependencies = this.normalizeDeps(this._dependencies);

        this.baseDir = path.resolve(this._baseDir)
    }

    get version(): VersionNumber {
        return this._version;
    }

    get pkgDir(): string {
        return path.resolve(path.dirname(this.filePath));
    }

    get fileName(): string {
        return path.basename(this.filePath)
    }

    get fullPath(): string {
        if (!this.baseDir) {
            return 'baseDir undefined'
        }
        if (!this.filePath) {
            return 'filePath undefined'
        }
        return path.resolve(path.join(this.baseDir, this.filePath));
    }

    get dependencies(): string[] | undefined {
        return this._dependencies;
    }

    get repo(): Repository | undefined {
        return this._repo;
    }

    get installed(): boolean {
        let registry = this.installedRecipeFilepath();
        return existsSync(registry);
    }

    private installedRecipeFilepath() {
        let registry = path.resolve(this.config.levainRegistryDir, path.basename(this.filePath));
        return registry;
    }

    get updateAvailable(): boolean {
        if (!existsSync(this.installedRecipeFilepath())) {
            return true;
        }

        let installedRecipe = Deno.readTextFileSync(this.installedRecipeFilepath());
        installedRecipe = JSON.stringify(yaml.parse(installedRecipe));

        let currentRecipe = JSON.stringify(this._yamlStruct);
        return currentRecipe !== installedRecipe;
    }

    get yamlStruct(): any {
        return this._yamlStruct;
    }

    yamlItem(key: string): any | undefined {
        if (this._yamlStruct) {
            return this._yamlStruct[key];
        }

        return undefined;
    }

    toString(): string {
        return "Package["
            + this.name
            + " v" + this.version
            + ", baseDir=" + this.baseDir
            + (this.dependencies ? ", deps=" + this.dependencies : "")
            + ", yaml=" + this.filePath
            + "]"
    }

    private normalizeDeps(deps: string[] | undefined): string[] | undefined {
        if (this.name == "levain") {
            return undefined;
        }

        let set: Set<string> = new Set<string>();
        set.add("levain"); // first dependency

        if (deps) {
            deps.forEach(v => set.add(v));
        }

        return [...set];
    }

    getRecipeTimestamp() {
        return FileUtils.getModificationTimestamp(this.filePath);
    }

    getInstalledTimestamp() {
        let registry = this.installedRecipeFilepath();
        return FileUtils.getModificationTimestamp(registry);
    }


}
