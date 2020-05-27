import {Command} from '@oclif/command'

import * as path from 'path';
import * as fs from 'fs';

import 'reflect-metadata'
import getDecorators from 'inversify-inject-decorators'

import * as jsYaml from 'js-yaml';

import Config, {container} from '../lib/config'
import Package from '../lib/package'
import Repository from '../lib/repository'

const {lazyInject} = getDecorators(container)

export default class InstallCommand extends Command {
  @lazyInject(Config)
  private _config: Config | undefined;

  static strict = false;

  async run() {
    if (!this._config) {
      // eslint-disable-next-line no-console
      console.error('No config')
      return
    }

    const {argv} = this.parse(InstallCommand)

    let error:boolean = false;
    let pkgs:Map<string, Package> = new Map();
    for (const pkgName of argv) {
      let myError:boolean = this.resolvePackages(this._config.repositoryChain, pkgs, pkgName);
      error = error || myError;
    }

    if (error) {
      this.error("");
      return 1;
    }

    this.log("");
    this.log("================");
    for (let name of pkgs.keys()) {
      let pkg = pkgs.get(name);
      if (pkg) {
        this.installPackage(pkg);
      }
    }
  }

  private resolvePackages(repo:Repository, pkgs:Map<string, Package>, pkgName:string):boolean {
    if (pkgs.has(pkgName)) {
      return false;
    }

    const pkgDef = repo.resolvePackage(pkgName);
    if (!pkgDef) {
      this.error("PACKAGE NOT FOUND: " + pkgName);
      return true;
    }    

    // Busca dependências primeira - Ordenação topológica por busca em profundidade
    let error:boolean = false;
    if (pkgDef.dependencies) {
      for (let dep of pkgDef.dependencies) {
        let myError:boolean = this.resolvePackages(repo, pkgs, dep);
        error = error || myError;
      }
    }

    pkgs.set(pkgName, pkgDef);
    return error;
  }

  private installPackage(pkg: Package): void {
    if (!this._config) {
      return;
    }

    try {
      let doc = jsYaml.safeLoad(fs.readFileSync(path.resolve(pkg.rootDir, 'install.yaml')));
      
      //this.log(pkg.name, "Install", JSON.stringify(doc));
      for (let action in doc) {
        let handler = this._config.resolveAction(action);
        if (handler) {
          handler.execute(pkg, doc[action]);
        } else {
          this.log(pkg.name + " - No handler for " + action);
        }
      }
    } catch (err) {
      if (err.code == 'ENOENT') {
        this.log(pkg.name + " - No install.yaml at " +pkg.rootDir);
      }
    }
  }
}
