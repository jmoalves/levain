import * as log from "https://deno.land/std/log/mod.ts";

import * as path from "https://deno.land/std/path/mod.ts";
import { existsSync } from "https://deno.land/std/fs/mod.ts";

import Repository from './repository.ts'
import Package from '../package/package.ts'
import Config from '../config.ts';

export default class FileSystemRepository implements Repository {
  constructor(private config:Config, private rootDir: string) {
    log.info(`FSRepo: Root=${this.rootDir}`);
  }

  resolvePackage(packageName: string): Package | undefined {
    if (!existsSync(`${this.rootDir}`)) {
      return undefined;
    }

    let pkg = this.readDir(packageName, this.rootDir);

    if (pkg) {
      log.debug(`FSRepo: ${packageName} => ${pkg.toString()}`);
    }

    return pkg;
  }

  private readDir(packageName:string, dirname: string): Package | undefined  {
    let pkg:Package|undefined = undefined;

    for (const entry of Deno.readDirSync(dirname)) {
      if (!pkg && entry.isDirectory) {
        pkg = this.readDir(packageName, path.resolve(dirname, entry.name));
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

  private readPackage(packageName:string, yamlFile: string): Package|undefined {
    if (!path.basename(yamlFile).match("^" + packageName + ".levain.yaml$")) {
      return undefined;
    }

    let fileinfo = Deno.lstatSync(yamlFile);
    if (!fileinfo.isFile) {
      return undefined;
    }

    let yamlStr:string = Deno.readTextFileSync(yamlFile);

    let pkg:Package = new Package(
      this.config,
      packageName, 
      this.config.replaceVars(`\${levainHome}/${packageName}`), 
      yamlFile, 
      yamlStr, 
      this);
    return pkg;
  }
}
