import * as log from "https://deno.land/std/log/mod.ts";
import * as path from "https://deno.land/std/path/mod.ts";
import {existsSync, ExpandGlobOptions} from "https://deno.land/std/fs/mod.ts";

import t from '../i18n.ts'

import Config from '../config.ts';
import Package from '../package/package.ts'
import FileSystemPackage from '../package/file_system_package.ts'
import {Timer} from "../timer.ts";
import {FileUtils} from "../fs/file_utils.ts";
import ConsoleFeedback from "../utils/console_feedback.ts";

import AbstractRepository from './abstract_repository.ts';
import DirUtils from "../fs/dir_utils.ts";
import StringUtils from "../utils/string_utils.ts";

export default class FileSystemRepository extends AbstractRepository {

    readonly excludeDirs = ['.git', 'node_modules', 'npm-cache', '$Recycle.Bin', 'temp', 'tmp', 'windows', 'system', 'system32', 'bin', 'extra-bin']

    readonly feedback = new ConsoleFeedback();

    private _packages:Map<string, Package> = new Map()

    constructor(
        private config: Config,
        public readonly rootDir: string,
        private rootOnly: boolean = false
    ) {
        super(`FileSystemRepo`, path.resolve(rootDir))
    }

    describe(): string {
        const description: string = super.describe()
        if (this.rootDir !== this.absoluteURI) {
            return description.replace(/\)/, t("lib.repository.file_system_repository.resolvedFrom", { dir: this.rootDir }))
        }
        return description
    }

    async init(): Promise<void> {
        if (this.initialized()) {
            log.debug(`FSRepo: Root=${this.rootDir} - already initialized`);
            return;
        }

        log.debug(`FSRepo init: Root=${this.rootDir} - BEGIN`)

        if (!existsSync(this.rootDir)) {
            throw new Error(`addRepo - dir not found: ${this.rootDir}`)
        }

        if (!DirUtils.isDirectory(this.rootDir)) {
            throw new Error(`addRepo - repository should exist and be a dir: ${this.rootDir}`)
        }

        await this.reload()

        log.debug(`FSRepo init: Root=${this.rootDir} - END`)
        this.setInitialized()
    }

    listPackages(): Array<Package> {
        return [...this._packages.values()]
    }

    resolvePackage(packageName: string): Package | undefined {
        log.debug(`resolvePackage - looking for ${packageName} in ${this.describe()}`)

        const pkg = this._packages.get(packageName)

        if (pkg) {
            log.debug(`${this.name}: found package ${packageName} => ${pkg.toString()}`);
        } else {
            log.debug(`${this.name}: package ${packageName} not found in ${this.describe()}`);
            log.debug(`Known packages: ${this._packages}`)
        }

        return pkg;
    }

    async reload(): Promise<void> {
        const newPackages = await this.readPackages()
        this._packages.clear();
        newPackages.forEach( pkg => {
            this._packages.set(pkg.name, pkg)
        })
    }

    ///////////////////////////////////////////////////

    private async readPackages(): Promise<Array<Package>> {
        if (!DirUtils.isDirectory(this.rootDir)) {
            log.debug(`# readPackages: rootDir not found ${this.rootDir}`);
            return [];
        }

        this.feedback.start(t("lib.repository.file_system_repository.scanning", { dir: this.rootDir }));

        const timer = new Timer()

        const globOptions: ExpandGlobOptions = {
            root: this.rootDir,
            extended: true,
            includeDirs: true,
            exclude: this.excludeDirs,
        }
        const packages: Array<Package> = await this.getPackageFiles(globOptions, this.rootOnly)

        this.feedback.reset(t(
            "lib.repository.file_system_repository.found", 
            { pkgNum: StringUtils.padNum(packages.length, 3), dir: this.rootDir, timer: timer.humanize() }
        ))

        return packages
    }

    private async getPackageFiles(globOptions: ExpandGlobOptions, rootDirOnly: boolean = false): Promise<Array<Package>> {
        log.debug(`# readPackages: ${JSON.stringify(globOptions)}`)
        return this.crawlPackages(globOptions['root'] || '.', globOptions, rootDirOnly)
    }

    private async crawlPackages(dirname: string, options: ExpandGlobOptions, rootDirOnly: boolean = false, currentLevel = 0): Promise<Array<Package>> {
        // TODO can we use expandGlob to get faster results?
        const maxLevels = 5
        const nextLevel = currentLevel + 1;

        // User feedback
        this.feedback.show();

        if (this.excludeDirs.find(ignoreDir => dirname.toLowerCase().endsWith(ignoreDir.toLowerCase()))) {
            log.debug(`ignoring ${dirname}`)
            return []
        }

        log.debug(`crawlPackages ${dirname}`)
        if (!FileUtils.canReadSync(dirname)) {
            log.debug(`not crawling ${dirname} - can't read`)
            return []
        }

        let entries = undefined;
        try {
            entries = Deno.readDirSync(dirname)
        } catch (error) {
            log.debug(`error reading ${dirname} - ${error}`)
        }

        if (!entries) {
            log.debug(`not crawling ${dirname} - no entries`)
            return []
        }

        let promisesDir: Array<Promise<Array<Package>>> = []
        let promisesFile: Array<Promise<Package | undefined>> = []

        for (const entry of entries) {
            // User feedback
            this.feedback.show();

            if (entry.isFile && !this.isPackageFile(entry.name)) {
                // An attempt to optmize search in a crowded directory without packages
                // Perhaps it would be better to read entries with a pattern
                continue
            }

            const fullUri = path.resolve(dirname, entry.name);
            if (!FileUtils.canReadSync(fullUri)) {
                log.debug(`not crawling ${fullUri} - can't read`)
                continue
            }
            
            if (entry.isDirectory && !rootDirOnly) {
                if (currentLevel > maxLevels) {
                    log.debug(`skipping ${fullUri}, more then ${maxLevels} levels deep`)
                } else {
                    promisesDir.push(this.crawlPackages(fullUri, options, false, nextLevel))
                }
            } else if (entry.isFile && this.isPackageFile(fullUri)) {
                promisesFile.push(this.readPackage(fullUri))
            }
        }

        let packages: Array<Package> = [];

        if (promisesFile.length > 0) {
            let pkgsFile = await Promise.all(promisesFile)
            for (let pkg of pkgsFile) {
                if (pkg) {
                    packages.push(pkg)
                }
            }    
        }

        if (promisesDir.length > 0) {
            let pkgsDir = await Promise.all(promisesDir)
            for (let pkgArr of pkgsDir) {
                Array.prototype.push.apply(packages, pkgArr)    
            }
        }

        return packages;
    }

    private isPackageFile(yamlFile: string): boolean {
        return yamlFile.match(/\.levain\.ya?ml$/) != null
    }

    private async readPackage(yamlFile: string): Promise<Package | undefined> {
        if (!this.isPackageFile(yamlFile)) {
            return undefined;
        }

        let fileinfo = undefined
        try {
            fileinfo = Deno.lstatSync(yamlFile)
        } catch (error) {
            log.error(`!!! error loading package ${yamlFile}: ${error}`)
        }

        if (!fileinfo || !fileinfo.isFile) {
            return undefined;
        }

        const packageName = yamlFile.replace(/.*[\/|\\]/g, '').replace(/\.levain\.ya?ml/, '')
        log.debug(`readPackage ${packageName} ${yamlFile}`)

        const yamlStr: string = Deno.readTextFileSync(yamlFile)
        // log.debug(`yaml ${packageName} -> ${yamlStr}`)

        // log.debug(`pkg ${packageName} -> ${pkg}`)

        const packageHome = await this.config.replaceVars(`\${levainHome}/${packageName}`);

        return new FileSystemPackage(
            this.config,
            packageName,
            packageHome,
            yamlFile,
            yamlStr,
            this)
    }
}
