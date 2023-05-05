import * as log from "https://deno.land/std/log/mod.ts";
import * as path from "https://deno.land/std/path/mod.ts";
import * as yaml from "https://deno.land/std/yaml/mod.ts";
import {existsSync} from "https://deno.land/std/fs/mod.ts";

import Repository from '../repository/repository.ts'
import Config from "../config.ts";
import {FileUtils} from '../fs/file_utils.ts';
import AbstractPackage from './abstract_package.ts';
import VersionNumber from "../utils/version_number.ts";

export default class FileSystemPackage extends AbstractPackage {
    readonly name: string
    readonly version: VersionNumber|undefined
    readonly filePath: string
    readonly baseDir: string
    readonly pkgDir: string
    readonly dependencies: string[] | undefined
    readonly repo: Repository | undefined
    readonly installed: boolean
    readonly updateAvailable: boolean
    readonly yamlStruct: any

    readonly fileName: string
    readonly fullPath: string

    constructor(
        private config: Config,
        name: string,
        baseDir: string,
        filePath: string,
        yamlStr: string,
        repo?: Repository
    ) {
        super();
        this.name = name
        this.baseDir = path.resolve(baseDir)
        this.filePath = filePath
        this.pkgDir = path.resolve(path.dirname(this.filePath))
        this.repo = repo

        this.yamlStruct = yaml.parse(yamlStr)

        const versionStr = this.yamlStruct?.version;
        this.version = ( versionStr ? new VersionNumber(versionStr) : undefined );
        this.dependencies = this.normalizeDeps(this.yamlStruct?.dependencies);

        // check installed
        this.installed = existsSync(this.installedRecipeFilepath())

        // check updateAvailable
        if (!this.installed) {
            this.updateAvailable = true
        } else {
            let installedRecipe = Deno.readTextFileSync(this.installedRecipeFilepath());
            installedRecipe = JSON.stringify(yaml.parse(installedRecipe));
    
            const currentRecipe = JSON.stringify(this.yamlStruct);
            this.updateAvailable =  currentRecipe !== installedRecipe;    
        }

        this.fileName = path.basename(this.filePath)
        this.fullPath = path.resolve(path.join(this.baseDir, this.filePath))
    }

    private installedRecipeFilepath() {
        return path.resolve(this.config.levainRegistryDir, path.basename(this.filePath));
    }

    yamlItem(key: string): any | undefined {
        if (this.yamlStruct) {
            return this.yamlStruct[key];
        }

        return undefined;
    }

    toString(): string {
        return "FSPackage["
            + this.name
            + ( this.version ? ` v${this.version}` : "")
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
        const registry = this.installedRecipeFilepath();
        return FileUtils.getModificationTimestamp(registry);
    }
}
