import * as log from "https://deno.land/std/log/mod.ts";
import * as path from "https://deno.land/std/path/mod.ts";
import {existsSync, ExpandGlobOptions, expandGlobSync} from "https://deno.land/std/fs/mod.ts";

import Config from '../config.ts';
import Package from '../package/package.ts'
import FileSystemPackage from '../package/file_system_package.ts'
import {Timer} from "../timer.ts";
import {FileUtils} from "../fs/file_utils.ts";
import ConsoleFeedback from "../utils/console_feedback.ts";

import AbstractRepository from './abstract_repository.ts';

export default class FileSystemRepository extends AbstractRepository {
    readonly name: string

    readonly excludeDirs = ['.git', 'node_modules', 'npm-cache', '$Recycle.Bin', 'temp', 'tmp', 'windows', 'system', 'system32', 'bin', 'extra-bin']

    readonly feedback = new ConsoleFeedback();

    constructor(
        private config: Config,
        public readonly rootDir: string,
        private rootOnly: boolean = false
    ) {
        super();
        this.name = `fileSystemRepo (${this.rootDir})`;
    }

    async init(): Promise<void> {
        if (this._packages) {
            log.debug(`FSRepo: Root=${this.rootDir} - already initialized`);
            return;
        }

        log.debug(`FSRepo init: Root=${this.rootDir}`)

        if (!existsSync(this.rootDir)) {
            throw new Error(`addRepo - dir not found: ${this.rootDir}`)
        }

        const fileInfo = Deno.statSync(this.rootDir)
        if (!fileInfo || !fileInfo.isDirectory) {
            throw new Error(`addRepo - repository should be a dir: ${this.rootDir}`)
        }

        this.loadPackages()
    }

    get absoluteURI(): string {
        return this.rootDir;
    }

    resolvePackage(packageName: string): Package | undefined {
        if (!existsSync(`${this.rootDir}`)) {
            return undefined;
        }

        const pkg = this.listPackages()
            ?.find(pkg => pkg.name === packageName);

        if (pkg) {
            log.debug(`FSRepo: found package ${packageName} => ${pkg.toString()}`);
        } else {
            log.debug(`FSRepo: package ${packageName} not found in ${this.name} - ${this.rootDir}`);
            log.debug(`_packages: ${this._packages}`)
        }

        return pkg;
    }

    private _packages: Array<Package> | undefined;

    listPackages(): Array<Package> {
        if (!this._packages) {
            this.loadPackages()
        }
        log.debug(`get packages _packages: ${this._packages}`)
        return this._packages || [];
    }

    loadPackages() {
        this._packages = this.readPackages()
            .sort((a, b) => a?.name?.localeCompare(b?.name));

        log.debug(`FSRepo: Root=${this.rootDir} - pkgs: ${this._packages}`)
        log.debug(``)
    }

    invalidatePackages() {
        log.debug(`invalidatePackages - ${this.name}`)
        this._packages = undefined
    }

    readPackages(): Array<Package> {
        if (!existsSync(`${this.rootDir}`)) {
            log.debug(`# readPackages: rootDir not found ${this.rootDir}`);
            return [];
        }

        this.feedback.start(`# Scanning ${this.rootDir} - rootDirOnly: ${this.rootOnly}. Please wait...`);

        const timer = new Timer()

        const packagesGlob = `**/*.levain.{yaml,yml}`.replace(/\\/g, '/');
        const globOptions: ExpandGlobOptions = {
            root: this.rootDir,
            extended: true,
            includeDirs: true,
            exclude: this.excludeDirs,
        }
        log.debug(`# readPackages: ${packagesGlob} ${JSON.stringify(globOptions)}`)
        const packages: Array<Package> = this.getPackageFiles(packagesGlob, globOptions, this.rootOnly)

        this.feedback.reset("#");
        log.info(`added ${packages.length} packages in ${timer.humanize()}`)
        log.info("")

        return packages
    }

    private getPackageFiles(packagesGlob: string, globOptions: ExpandGlobOptions, rootDirOnly: boolean = false): Array<Package> {
        // FIXME Why, oh my...
        // FIXME globPackages throws error when folder is readonly in Deno 1.5.4
        // if (OsUtils.isWindows()) {
        return this.crawlPackages(globOptions['root'] || '.', globOptions, rootDirOnly)
        // } else {
        //     return this.globPackages(packagesGlob, globOptions);
        // }
    }

    crawlPackages(dirname: string, options: ExpandGlobOptions, rootDirOnly: boolean = false, currentLevel = 0): Array<Package> {
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

        let packages: Array<Package> = [];
        for (const entry of entries) {
            // User feedback
            this.feedback.show();

            const fullUri = path.resolve(dirname, entry.name);
            if (!FileUtils.canReadSync(fullUri)) {
                log.debug(`not crawling ${fullUri}`)
                continue
            }

            if (entry.isDirectory && !rootDirOnly) {
                if (currentLevel > maxLevels) {
                    log.debug(`skipping ${fullUri}, more then ${maxLevels} levels deep`)
                } else {
                    Array.prototype.push.apply(packages, this.crawlPackages(fullUri, options, false, nextLevel));
                }
            } else if (entry.isFile) {
                const pkg = this.readPackage(fullUri);
                if (pkg) {
                    packages.push(pkg);
                    log.debug(`added package ${pkg?.name} ${pkg?.version}`)
                }
            }
        }

        return packages;
    }

    globPackages(packagesGlob: string, globOptions: ExpandGlobOptions): Array<Package> {
        const packages = []
        const packageFiles = expandGlobSync(packagesGlob, globOptions);
        for (const file of packageFiles) {
            log.debug(`## checking file ${JSON.stringify(file)}`)
            const pkg = this.readPackage(file.path)
            if (pkg) {
                log.debug(`## adding package ${pkg}`)
                packages.push(pkg)
            }
        }
        return packages
    }

    private readPackage(yamlFile: string): Package | undefined {
        if (!yamlFile.match(/\.levain\.ya?ml$/)) {
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

        return new FileSystemPackage(
            this.config,
            packageName,
            this.config.replaceVars(`\${levainHome}/${packageName}`),
            yamlFile,
            yamlStr,
            this)
    }
}
