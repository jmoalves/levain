import * as log from "https://deno.land/std/log/mod.ts";
import * as path from "https://deno.land/std/path/mod.ts";
import {existsSync, ExpandGlobOptions, expandGlobSync} from "https://deno.land/std/fs/mod.ts";


import Repository from './repository.ts'
import FileSystemPackage from '../package/file_system_package.ts'
import Config from '../config.ts';
import {Timer} from "../timer.ts";
import {OsShell} from '../shellUtils.ts';

export default class FileSystemRepository implements Repository {
    readonly excludeDirs = ['$RECYCLE.BIN', 'node_modules', '.git']

    constructor(private config: Config, private rootDir: string) {
        log.debug(`FSRepo: Root=${this.rootDir}`);
    }


    readonly name = `fileSystemRepo for ${this.rootDir}`;

    resolvePackage(packageName: string): FileSystemPackage | undefined {
        if (!existsSync(`${this.rootDir}`)) {
            return undefined;
        }

        const pkg = this.readPackageFromList(packageName);
        if (pkg) {
            log.debug(`FSRepo: ${packageName} => ${pkg.toString()}`);
        }

        return pkg;
    }

    private readPackageFromList(packageName: string): FileSystemPackage | undefined {
        return this.packages
            .find(pkg => pkg.name == packageName);
    }

    _packages: Array<FileSystemPackage> | undefined;
    get packages(): Array<FileSystemPackage> {
        if (!this._packages) {
            this._packages = this.listPackages();
        }
        return this._packages;
    }

    listPackages(rootDirOnly?: boolean): Array<FileSystemPackage> {
        if (!existsSync(`${this.rootDir}`)) {
            log.debug(`# listPackages: rootDir not found ${this.rootDir}`);
            return [];
        }

        log.info(`# looking for *.levain.yaml files in ${this.rootDir}.`);
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
        if (OsShell.isWindows()) {
            return this.crawlPackages(globOptions['root'] || '.', globOptions)
        } else {
            return this.globPackages(packagesGlob, globOptions);
        }
    }

    crawlPackages(dirname: string, options: ExpandGlobOptions): Array<FileSystemPackage> {
        let packages: Array<FileSystemPackage> = [];
        if (this.excludeDirs.find(ignoreDir => dirname.endsWith(ignoreDir))) {
            log.debug(`ignoring ${dirname}`)
            return packages;
        }

        log.debug(`crawlPackages ${dirname}`)
        for (const entry of Deno.readDirSync(dirname)) {
            if (entry.isDirectory) {
                Array.prototype.push.apply(packages, this.crawlPackages(path.resolve(dirname, entry.name), options));
            }

            if (entry.isFile) {
                const pkg = this.readPackage(path.resolve(dirname, entry.name));
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
