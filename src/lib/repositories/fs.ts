import * as path from "https://deno.land/std/path/mod.ts";
import * as yaml from "https://deno.land/std/encoding/yaml.ts";

import Repository from '../repository.ts'
import Package from '../package.ts'
import Config from '../config.ts';

export default class FileSystemRepository implements Repository {
  constructor(private config:Config, private rootDir: string) {
    console.log("FSRepo: Root=", this.rootDir);
  }

  resolvePackage(packageName: string): Package | undefined {
    let pkg = this.readDir(packageName, this.rootDir);

    if (pkg) {
      console.log("FSRepo:", packageName, "=>", pkg.toString());
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

  private readPackage(packageName:string, filename: string): Package|undefined {
    if (!filename.match(packageName + ".levain.yaml")) {
      return undefined;
    }

    let fileinfo = Deno.lstatSync(filename);
    if (!fileinfo.isFile) {
      return undefined;
    }

    //console.log(`FSRepo: PKG[${packageName}] => ${filename}`);
    let yamlStr:string = Deno.readTextFileSync(filename);

    let yamlStruct:any = yaml.parse(yamlStr);

    let pkg:Package = new Package(packageName, yamlStruct.version, "${levainHome}/" + packageName, filename, yamlStruct, this);
    return pkg;
  }
}
