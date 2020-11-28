import * as path from "https://deno.land/std/path/mod.ts";
import * as yaml from "https://deno.land/std/encoding/yaml.ts";
import {existsSync} from "https://deno.land/std/fs/mod.ts";

import Repository from '../repository/repository.ts'
import Config from "../config.ts";
import {FileUtils} from '../file_utils.ts';
import Package from "./package.ts";


export default class FileSystemPackage implements Package {
    private _version: string;
    private _dependencies: string[] | undefined = undefined;
    private _yamlStruct: any;

    constructor(
        private config: Config,
        public readonly name: string,
        private _baseDir: string,
        public readonly filePath: string,
        yamlStr: string,
        private _repo?: Repository
    ) {
        this._yamlStruct = yaml.parse(yamlStr);

        this._version = this._yamlStruct.version;
        if (this._yamlStruct.dependencies) {
            this._dependencies = this._yamlStruct.dependencies;
        }
        this._dependencies = this.normalizeDeps(this._dependencies);
    }

    get version(): string {
        return this._version;
    }

    get baseDir(): string {
        return path.resolve(this._baseDir);
    }

    get pkgDir(): string {
        return path.resolve(path.dirname(this.filePath));
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
        let registry = path.resolve(this.config.levainRegistry, path.basename(this.filePath));
        return registry;
    }

    get updateAvailable(): boolean {
        const recipeTimestamp = this.getRecipeTimestamp();
        const installedTimestamp = this.getInstalledTimestamp();

        if (recipeTimestamp === undefined) {
            return false;
        }

        if (installedTimestamp === undefined) {
            return true;
        }

        return recipeTimestamp > installedTimestamp;
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
