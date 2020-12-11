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

    readonly excludeDirs = ['.git', 'node_modules', 'npm-cache', '$Recycle.Bin', 'temp', 'tmp']

    constructor(
        private config: Config,
        public readonly rootDir: string,
    ) {
        super();
        this.name = `fileSystemRepo for ${this.rootDir}`;

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
        this._packages = undefined
    }

    listPackages(rootDirOnly: boolean = false): Array<FileSystemPackage> {
        if (!rootDirOnly && this._packages) {
            return this._packages;
        }
        if (!existsSync(`${this.rootDir}`)) {
            log.debug(`# listPackages: rootDir not found ${this.rootDir}`);
            return [];
        }

        log.info(`# Scanning ${this.rootDir} - rootDirOnly: ${rootDirOnly}`);
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
        const packages: Array<FileSystemPackage> = this.getPackageFiles(packagesGlob, globOptions)

        log.info(`added ${packages.length} packages in ${timer.humanize()}`)
        log.info("")
        return packages;
    }

    private getPackageFiles(packagesGlob: string, globOptions: ExpandGlobOptions): Array<FileSystemPackage> {
        // FIXME Why, oh my...
        // FIXME globPackages throws error when folder is readonly in Deno 1.5.4
        // if (OsUtils.isWindows()) {
        return this.crawlPackages(globOptions['root'] || '.', globOptions)
        // } else {
        //     return this.globPackages(packagesGlob, globOptions);
        // }
    }

    crawlPackages(dirname: string, options: ExpandGlobOptions, currentLevel = 0): Array<FileSystemPackage> {
        const maxLevels = 5
        const nextLevel = currentLevel + 1;
        let packages: Array<FileSystemPackage> = [];

        if (this.excludeDirs.find(ignoreDir => dirname.toLowerCase().endsWith(ignoreDir.toLowerCase()))) {
            log.debug(`ignoring ${dirname}`)
            return packages;
        }

        log.debug(`crawlPackages ${dirname}`)

        if (FileUtils.canReadSync(dirname)) {
            for (const entry of Deno.readDirSync(dirname)) {
                const fullUri = path.resolve(dirname, entry.name);
                if (FileUtils.canReadSync(fullUri)) {
                    if (entry.isDirectory) {
                        if (currentLevel > maxLevels) {
                            log.debug(`skipping ${fullUri}, more then ${maxLevels} levels deep`)
                        } else {
                            Array.prototype.push.apply(packages, this.crawlPackages(fullUri, options, nextLevel));
                        }
                    }

                    if (entry.isFile) {
                        const pkg = this.readPackage(fullUri);
                        if (pkg) {
                            packages.push(pkg);
                            log.debug(`added package ${entry.name}`)
                        }
                    }
                } else {
                    log.debug(`not crawling ${fullUri}`)
                }
            }
        } else {
            log.debug(`not crawling ${dirname}`)
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

        const fileinfo = Deno.lstatSync(yamlFile);
        if (!fileinfo.isFile) {
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
