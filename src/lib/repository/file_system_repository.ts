import * as log from "https://deno.land/std/log/mod.ts";
import * as path from "https://deno.land/std/path/mod.ts";
import {existsSync, ExpandGlobOptions, expandGlobSync} from "https://deno.land/std/fs/mod.ts";


import Repository from './repository.ts'
import FileSystemPackage from '../package/file_system_package.ts'
import Config from '../config.ts';
import {Timer} from "../timer.ts";

export default class FileSystemRepository implements Repository {
    readonly excludeDirs = ['$RECYCLE.BIN', 'node_modules', '.git']

    constructor(private config: Config, private rootDir: string) {
        log.debug(`FSRepo: Root=${this.rootDir}`);
    }

    _packages: Array<FileSystemPackage> | undefined;
    get packages(): Array<FileSystemPackage> {
        if (!this._packages) {
            this._packages = this.listPackages();
        }
        return this._packages;
    }

    readonly name = `fileSystemRepo for ${this.rootDir}`;

    resolvePackage(packageName: string): FileSystemPackage | undefined {
        if (!existsSync(`${this.rootDir}`)) {
            return undefined;
        }

        // let pkg = this.readPackageInDir(packageName, this.rootDir);
        const pkg = this.readPackageFromList(packageName);
        if (pkg) {
            log.debug(`FSRepo: ${packageName} => ${pkg.toString()}`);
        }

        return pkg;
    }

    private readPackageInDir(packageName: string, dirname: string): FileSystemPackage | undefined {
        let pkg: FileSystemPackage | undefined = undefined;
        log.debug(`readDir ${packageName} ${dirname}`)
        if (this.excludeDirs.find(ignoreDir => dirname.endsWith(ignoreDir))) {
            log.debug(`ignoring ${dirname}`)
            return
        }

        for (const entry of Deno.readDirSync(dirname)) {
            if (!pkg && entry.isDirectory) {
                pkg = this.readPackageInDir(packageName, path.resolve(dirname, entry.name));
            }

            if (!pkg && entry.isFile) {
                pkg = this.readPackage(packageName, path.resolve(dirname, entry.name));
            }

            if (pkg) {
                return pkg;
            }
        }

        return undefined;
    }

    private readPackage(packageName: string, yamlFile: string): FileSystemPackage | undefined {
        if (!path.basename(yamlFile).match("^" + packageName + ".levain.ya?ml$")) {
            return undefined;
        }

        let fileinfo = Deno.lstatSync(yamlFile);
        if (!fileinfo.isFile) {
            return undefined;
        }

        let yamlStr: string = Deno.readTextFileSync(yamlFile);

        let pkg: FileSystemPackage = new FileSystemPackage(
            this.config,
            packageName,
            this.config.replaceVars(`\${levainHome}/${packageName}`),
            yamlFile,
            yamlStr,
            this);

        return pkg;
    }


    listPackages(rootDirOnly?: boolean): Array<FileSystemPackage> {
        let rootDir = this.rootDir.replace(/\\/g, '/');
        if (!existsSync(`${rootDir}`)) {
            log.debug(`# listPackages: rootDir not found ${rootDir}`);
            return [];
        }

        log.info(`# looking for *.levain.yaml files in ${rootDir}.`);
        log.info(`# Please wait...`);
        const timer = new Timer();
        let pkgPath:string[] = this.listPackagesInDir(rootDir);
        // if (rootDir.startsWith("//")) {
        //     log.warning(`## UNC path ${rootDir}`);
        //     pkgPath = this.listPackagesInDir(rootDir);
        // } else {
        //     pkgPath = this.listPackagesWithGlob(rootDir);
        // }

        const packages: Array<FileSystemPackage> = [];
        for (const name of pkgPath) {
            log.debug(`## checking file ${JSON.stringify(name)}`)
            const packageName = path.basename(name).replace(/\.levain\.ya?ml/, '')
            const pkg = this.readPackage(packageName, name);
            if (pkg) {
                log.debug(`## adding package ${pkg}`)
                packages.push(pkg)
            }
        }
        log.info(`added ${packages.length} packages in ${timer.humanize()}`)
        log.info("")
        return packages;
    }

    private listPackagesWithGlob(dirname: string): string[] {
        // FIXME: UNC path does not work
        const packagesGlob = `**/*.levain.{yaml,yml}`;
        const globOptions: ExpandGlobOptions = {
            root: dirname,
            extended: true,
            includeDirs: true,
            exclude: this.excludeDirs,
        }
        log.debug(`# listPackages: ${packagesGlob} ${JSON.stringify(globOptions)}`)
        const packageFiles = expandGlobSync(packagesGlob, globOptions);

        if (!packageFiles) {
            return [];
        }

        let pkgNames:string[] = [];
        for (const file of packageFiles) {
            pkgNames.push(file.path);
        }

        return pkgNames;
    }

    private listPackagesInDir(dirname: string): string[] {
        log.debug(`listPackagesInDir ${dirname}`)
        if (this.excludeDirs.find(ignoreDir => dirname.endsWith(ignoreDir))) {
            log.debug(`ignoring ${dirname}`)
            return [];
        }

        let pkgNames:string[] = [];
        for (const entry of Deno.readDirSync(dirname)) {
            let name = path.resolve(dirname, entry.name);
            if (entry.isDirectory) {
                let newNames = this.listPackagesInDir(name);
                if (newNames && newNames.length > 0) {
                    Array.prototype.push.apply(pkgNames, newNames);
                }
            } else if (entry.isFile && (name.endsWith(".levain.yaml") || name.endsWith(".levain.yml")) ) {
                pkgNames.push(name);
            }
        }

        return pkgNames;
    }


    private readPackageFromList(packageName: string): FileSystemPackage | undefined {
        return this.packages
            .find(pkg => pkg.name == packageName);
    }
}
