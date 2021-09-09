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
import DirUtils from "../fs/dir_utils.ts";

export default class FileSystemRepository extends AbstractRepository {

    readonly excludeDirs = ['.git', 'node_modules', 'npm-cache', '$Recycle.Bin', 'temp', 'tmp', 'windows', 'system', 'system32', 'bin', 'extra-bin']

    readonly feedback = new ConsoleFeedback();

    constructor(
        private config: Config,
        public readonly rootDir: string,
        private rootOnly: boolean = false
    ) {
        const name = `FileSystemRepo`
        const absoluteURI = path.resolve(rootDir)
        super(name, absoluteURI)
    }

    describe(): string {
        let description: string = super.describe()
        if (this.rootDir !== this.absoluteURI) {
            description += ` from ${this.rootDir}`
        }
        return description
    }

    async init(): Promise<void> {
        if (this._packages) {
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

        log.debug(`FSRepo init: Root=${this.rootDir} - loadPackages`)
        await super.init()
        log.debug(`FSRepo init: Root=${this.rootDir} - END`)
    }

    async readPackages(): Promise<Array<Package>> {
        if (!DirUtils.isDirectory(this.rootDir)) {
            log.debug(`# readPackages: rootDir not found ${this.rootDir}`);
            return [];
        }

        this.feedback.start(`# ${this.rootDir}...`);

        const timer = new Timer()

        const packagesGlob = `**/*.levain.{yaml,yml}`.replace(/\\/g, '/');
        const globOptions: ExpandGlobOptions = {
            root: this.rootDir,
            extended: true,
            includeDirs: true,
            exclude: this.excludeDirs,
        }
        log.debug(`# readPackages: ${packagesGlob} ${JSON.stringify(globOptions)}`)
        const packages: Array<Package> = await this.getPackageFiles(packagesGlob, globOptions, this.rootOnly)

        this.feedback.reset(`# ${this.rootDir} -> ${packages.length} packages in ${timer.humanize()}`)

        return packages
    }

    private async getPackageFiles(packagesGlob: string, globOptions: ExpandGlobOptions, rootDirOnly: boolean = false): Promise<Array<Package>> {
        // FIXME Why, oh my...
        // FIXME globPackages throws error when folder is readonly in Deno 1.5.4
        // if (OsUtils.isWindows()) {
        return await this.crawlPackages(globOptions['root'] || '.', globOptions, rootDirOnly)
        // } else {
        //     return this.globPackages(packagesGlob, globOptions);
        // }
    }

    async crawlPackages(dirname: string, options: ExpandGlobOptions, rootDirOnly: boolean = false, currentLevel = 0): Promise<Array<Package>> {
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
                    Array.prototype.push.apply(
                        packages,
                        await this.crawlPackages(fullUri, options, false, nextLevel)
                    )
                }
            } else if (entry.isFile) {
                const pkg = await this.readPackage(fullUri);
                if (pkg) {
                    packages.push(pkg);
                    log.debug(`added package ${pkg?.name} ${pkg?.version}`)
                }
            }
        }

        return packages;
    }

    async globPackages(packagesGlob: string, globOptions: ExpandGlobOptions): Promise<Array<Package>> {
        const packages = []
        const packageFiles = expandGlobSync(packagesGlob, globOptions);
        for (const file of packageFiles) {
            log.debug(`## checking file ${JSON.stringify(file)}`)
            const pkg = await this.readPackage(file.path)
            if (pkg) {
                log.debug(`## adding package ${pkg}`)
                packages.push(pkg)
            }
        }
        return packages
    }

    private async readPackage(yamlFile: string): Promise<Package | undefined> {
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
