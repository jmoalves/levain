import * as log from "https://deno.land/std/log/mod.ts";
import * as path from "https://deno.land/std/path/mod.ts";
import {copySync, ensureDirSync, existsSync} from "https://deno.land/std/fs/mod.ts";

import Config from '../config.ts';
import FileSystemPackage from '../package/file_system_package.ts';

import FileSystemRepository from './file_system_repository.ts';

export default class Registry extends FileSystemRepository {

    constructor(
        config: Config,
        rootDir: string
    ) {
        super(config, rootDir)
    }

    add(pkg: FileSystemPackage) {
        log.debug(`Registry.add ${pkg.fullPath} ${this.rootDir}`)
        if (!existsSync(pkg.fullPath)) {
            throw Error(`Cannot find package ${pkg.fullPath}`)
        }
        ensureDirSync(this.rootDir)

        log.debug(`COPY ${pkg.fullPath} ${path.join(this.rootDir, pkg.filePath)}`)
        copySync(pkg.fullPath, path.join(this.rootDir, pkg.filePath))

        this.invalidatePackages()
    }

    remove(name: string) {
        log.debug(`Registry.remove ${name} ${this.rootDir}`)
        let shouldInvalidate = false
        const possibleFiles = [
            path.join(this.rootDir, `${name}.levain.yaml`),
            path.join(this.rootDir, `${name}.levain.yml`),
        ]
        possibleFiles.forEach(it => {
            log.debug(`Trying to remove ${it}`)
            if (existsSync(it)) {
                Deno.removeSync(it)
                shouldInvalidate = true
            }
        })
        if (shouldInvalidate) {
            this.invalidatePackages()
        }
    }
}
