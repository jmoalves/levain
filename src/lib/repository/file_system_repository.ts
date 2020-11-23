import * as log from "https://deno.land/std@0.78.0/log/mod.ts";
import * as path from "https://deno.land/std@0.78.0/path/mod.ts";
import {existsSync, ExpandGlobOptions, expandGlobSync} from "https://deno.land/std@0.78.0/fs/mod.ts";


import Repository from './repository.ts'
import FileSystemPackage from '../package/file_system_package.ts'
import Config from '../config.ts';
import Package from "../package/package.ts";

export default class FileSystemRepository implements Repository {
    constructor(private config: Config, private rootDir: string) {
        log.debug(`FSRepo: Root=${this.rootDir}`);

        this.packages = this.listPackages();
    }

    readonly name = `fileSystemRepo for ${this.rootDir}`;

    resolvePackage(packageName: string): FileSystemPackage | undefined {
        if (!existsSync(`${this.rootDir}`)) {
            return undefined;
        }

        let pkg = this.readPackageInDir(packageName, this.rootDir);
        if (pkg) {
            log.debug(`FSRepo: ${packageName} => ${pkg.toString()}`);
        }

        return pkg;
    }

    private readPackageInDir(packageName: string, dirname: string): FileSystemPackage | undefined {
        let pkg: FileSystemPackage | undefined = undefined;
        log.debug(`readDir ${packageName} ${dirname}`)
        const ignoreDirs = ['$RECYCLE.BIN', 'node_modules', '.git']
        if (ignoreDirs.find(ignoreDir => dirname.endsWith(ignoreDir))) {
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
            log.error(`## readPackage - package and filename do not match: ${packageName} with ${path.basename(yamlFile)}`)
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

    packages: Array<Package> = [];

    listPackages() {
        if (!existsSync(`${this.rootDir}`)) {
            log.debug(`# listPackages: rootDir not found ${this.rootDir}`)
            return [];
        }

        const packagesGlob = `**/*.levain.{yaml,yml}`;
        const globOptions: ExpandGlobOptions = {
            root: this.rootDir,
            includeDirs: true,
            extended: true,
        }
        const packageFiles = expandGlobSync(packagesGlob, globOptions)
        log.debug(`# listPackages ${packagesGlob} ${JSON.stringify(globOptions)}`)
        const packages: Array<Package> = []
        for (const file of packageFiles) {
            log.debug(`## listPackages file ${JSON.stringify(file)}`)
            const packageName = file.name.replace(/\.levain\.ya?ml/, '')
            const pkg = this.readPackage(packageName, file.path)
            if (pkg) {
                log.debug(`## listPackages adding package ${pkg}`)
                packages.push(pkg)
            }
        }
        return packages;
    }
}
