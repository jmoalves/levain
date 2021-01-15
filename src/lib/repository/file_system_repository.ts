import * as log from "https://deno.land/std/log/mod.ts";
import * as path from "https://deno.land/std/path/mod.ts";
import {existsSync, ExpandGlobOptions, expandGlobSync} from "https://deno.land/std/fs/mod.ts";

import Config from '../config.ts';
import Package from '../package/package.ts'
import FileSystemPackage from '../package/file_system_package.ts'
import {Timer} from "../timer.ts";
import FileUtils from "../file_utils.ts";
import AbstractRepository from './abstract_repository.ts';

export default class FileSystemRepository extends AbstractRepository {
    readonly name;

    readonly excludeDirs = ['.git', 'node_modules', 'npm-cache', '$Recycle.Bin', 'temp', 'tmp', 'windows', 'system', 'system32']

    constructor(
        private config: Config,
        public readonly rootDir: string,
        private rootOnly: boolean = false
    ) {
        super();
        this.name = `fileSystemRepo for ${this.rootDir}`;
    }

    async init(): Promise<void> {
        if (this._packages) {
            log.debug(`FSRepo: Root=${this.rootDir} - already initialized`);
            return;
        }

        log.debug(`FSRepo: Root=${this.rootDir}`);
        try {
            const fileInfo = Deno.statSync(this.rootDir);
            if (!fileInfo || !fileInfo.isDirectory) {
                throw `addRepo - invalid dir ${this.rootDir}`;
            }
        } catch (err) {
            if (err.name != "NotFound") {
                throw err;
            }
        }

        this.packages; // Force load packages
    }

    get absoluteURI(): string {
        return this.rootDir;
    }

    resolvePackage(packageName: string): Package | undefined {
        if (!existsSync(`${this.rootDir}`)) {
            return undefined;
        }

        const pkg = this.readPackageFromList(packageName);
        if (pkg) {
            log.debug(`FSRepo: ${packageName} => ${pkg.toString()}`);
        }

        return pkg;
    }

    private readPackageFromList(packageName: string): Package | undefined {
        return this.packages
            .find(pkg => pkg.name == packageName);
    }

    _packages: Array<FileSystemPackage> | undefined;
    get packages(): Array<Package> {
        if (!this._packages) {
            this._packages = this.listPackages()
                .sort((a, b) => a.name.localeCompare(b.name));
        }

        return this._packages;
    }

    invalidatePackages() {
        log.debug(`invalidatePackages - ${this.name}`)
        this._packages = undefined
    }

    listPackages(): Array<FileSystemPackage> {
        if (this._packages) {
            return this._packages;
        }

        if (!existsSync(`${this.rootDir}`)) {
            log.debug(`# listPackages: rootDir not found ${this.rootDir}`);
            return [];
        }

        log.info(`# Scanning ${this.rootDir} - rootDirOnly: ${this.rootOnly}`);
        log.info(`# Please wait...`);
        const timer = new Timer()

        const packagesGlob = `**/*.levain.{yaml,yml}`.replace(/\\/g, '/');
        const globOptions: ExpandGlobOptions = {
            root: this.rootDir,
            extended: true,
            includeDirs: true,
            exclude: this.excludeDirs,
        }
        log.debug(`# listPackages: ${packagesGlob} ${JSON.stringify(globOptions)}`)
        const packages: Array<FileSystemPackage> = this.getPackageFiles(packagesGlob, globOptions, this.rootOnly)

        log.info("")
        log.info(`added ${packages.length} packages in ${timer.humanize()}`)
        log.info("")
        return packages;
    }

    private getPackageFiles(packagesGlob: string, globOptions: ExpandGlobOptions, rootDirOnly: boolean = false): Array<FileSystemPackage> {
        // FIXME Why, oh my...
        // FIXME globPackages throws error when folder is readonly in Deno 1.5.4
        // if (OsUtils.isWindows()) {
        return this.crawlPackages(globOptions['root'] || '.', globOptions, rootDirOnly)
        // } else {
        //     return this.globPackages(packagesGlob, globOptions);
        // }
    }

    crawlPackages(dirname: string, options: ExpandGlobOptions, rootDirOnly: boolean = false, currentLevel = 0): Array<FileSystemPackage> {
        const maxLevels = 5
        const nextLevel = currentLevel + 1;

        if (this.excludeDirs.find(ignoreDir => dirname.toLowerCase().endsWith(ignoreDir.toLowerCase()))) {
            log.debug(`ignoring ${dirname}`)
            return []
        }

        log.debug(`crawlPackages ${dirname}`)
        if (!FileUtils.canReadSync(dirname)) {
            log.debug(`not crawling ${dirname}`)
            return []
        }

        let entries = undefined;
        try {
            entries = Deno.readDirSync(dirname)
        } catch (error) {
            log.debug(`error reading ${dirname} - ${error}`)
        }

        if (!entries) {
            log.debug(`not crawling ${dirname}`)
            return []
        }

        let packages: Array<FileSystemPackage> = [];
        for (const entry of entries) {
            const fullUri = path.resolve(dirname, entry.name);
            if (!FileUtils.canReadSync(fullUri)) {
                log.debug(`not crawling ${fullUri}`)
                continue
            }

            if (entry.isDirectory && !rootDirOnly) {
                // User feedback
                Deno.stdout.writeSync(new TextEncoder().encode("."));

                if (currentLevel > maxLevels) {
                    log.debug(`skipping ${fullUri}, more then ${maxLevels} levels deep`)
                } else {
                    Array.prototype.push.apply(packages, this.crawlPackages(fullUri, options, false, nextLevel));
                }
            } else if (entry.isFile) {
                const pkg = this.readPackage(fullUri);
                if (pkg) {
                    packages.push(pkg);
                    log.debug(`added package ${entry.name}`)
                }
            }
        }

        return packages;
    }

    globPackages(packagesGlob: string, globOptions: ExpandGlobOptions): Array<FileSystemPackage> {
        const packages = []
        const packageFiles = expandGlobSync(packagesGlob, globOptions);
        for (const file of packageFiles) {
            console.log(`## checking file ${JSON.stringify(file)}`)
            const pkg = this.readPackage(file.path)
            if (pkg) {
                console.log(`## adding package ${pkg}`)
                packages.push(pkg)
            }
        }
        return packages
    }

    private readPackage(yamlFile: string): FileSystemPackage | undefined {
        if (!yamlFile.match(/\.levain\.ya?ml$/)) {
            return undefined;
        }

        let fileinfo = undefined
        try {
            fileinfo = Deno.lstatSync(yamlFile)
        } catch (error) {
        }

        if (!fileinfo || !fileinfo.isFile) {
            return undefined;
        }

        const packageName = yamlFile.replace(/.*[\/|\\]/g, '').replace(/\.levain\.ya?ml/, '')
        log.debug(`readPackage ${packageName} ${yamlFile}`);
        const yamlStr: string = Deno.readTextFileSync(yamlFile);

        const pkg = new FileSystemPackage(
            this.config,
            packageName,
            this.config.replaceVars(`\${levainHome}/${packageName}`),
            yamlFile,
            yamlStr,
            this);

        return pkg;
    }
}
