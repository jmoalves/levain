import * as fs from 'fs';
import * as path from 'path';

import Repository from '../repository'
import Package from '../package'

import 'reflect-metadata'
import getDecorators from 'inversify-inject-decorators'
import Config, {container} from '../../lib/config'
import { ENOENT } from 'constants';

const {lazyInject} = getDecorators(container)

export default class FileSystemRepository implements Repository {
  @lazyInject(Config)
  private _config: Config | undefined;

  // eslint-disable-next-line no-useless-constructor
  constructor(private rootDir: string) {
  }


  resolvePackage(packageName: string): Package | undefined {
    let pkg = this.readDir(packageName, this.rootDir);

    if (pkg) {
      console.log("FileSystemRepository - Package[name=" + pkg?.name + ", dir=" + pkg?.rootDir + (pkg?.dependencies ? ", deps=" + pkg?.dependencies : "") + "]");
      console.log("");  
    }

    return pkg;
  }

  private readDir(packageName:string, dirname: string): Package | undefined  {
    let pkg:Package|undefined = undefined;

    console.log("FileSystemRepository - DIR => " + dirname);

    let dir:fs.Dir = fs.opendirSync(dirname);
    let entry:fs.Dirent;
    while (entry = dir.readSync()) {
      if (entry.isDirectory()) {
        pkg = pkg || this.readPackage(packageName, path.resolve(dirname, entry.name));
        pkg = pkg || this.readDir(packageName, path.resolve(dirname, entry.name));
      }

      if (pkg) {
        return pkg;
      }
    }

    return undefined;
  }

  private readPackage(packageName:string, dirname: string): Package|undefined {
    if (!dirname.match(packageName + "\.package")) {
      return undefined;
    }

    console.log(`FileSystemRepository - PKG[${packageName}] => ${dirname}`);

    let deps:string[]|undefined = this.loadDeps(path.resolve(dirname, "dependencies.json"));
    let pkg:Package = new Package(packageName, dirname, deps, this);
    return pkg;
  }

  private loadDeps(depsFilename:string): string[]|undefined {
    try {
      fs.accessSync(depsFilename, fs.constants.R_OK);

      let jsonDeps:string = fs.readFileSync(depsFilename);
      let deps:string[] = JSON.parse(jsonDeps);

      console.log("FileSystemRepository - DEPS[" + depsFilename + "] => " + JSON.stringify(deps));
      return deps;

    } catch (err) {
      //console.error("ERROR: " + JSON.stringify(err));
      if (err.code != "ENOENT") { // Se o arquivo não existe, ok. Sem dependências.
        console.error("");
        console.error("ERROR in " + depsFilename);
        throw err;
      }
      return undefined;
    }
  }
}
