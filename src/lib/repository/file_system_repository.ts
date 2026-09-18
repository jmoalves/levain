import * as log from "@std/log";
import * as path from "@std/path";
import { existsSync, expandGlob, ExpandGlobOptions } from "@std/fs";

import t from "../i18n.ts";

import type Config from "../config.ts";
import type Package from "../package/package.ts";
import FileSystemPackage from "../package/file_system_package.ts";
import { Timer } from "../timer.ts";
import ConsoleFeedback from "../utils/console_feedback.ts";

import AbstractRepository from "./abstract_repository.ts";
import DirUtils from "../fs/dir_utils.ts";
import StringUtils from "../utils/string_utils.ts";
import { FileUtils } from "../fs/file_utils.ts";

export class FileSystemRepository extends AbstractRepository {
  readonly excludeDirs = [
    ".git",
    "node_modules",
    "npm-cache",
    "$Recycle.Bin",
    "temp",
    "tmp",
    "windows",
    "system",
    "system32",
    "bin",
    "extra-bin",
  ];

  readonly feedback = new ConsoleFeedback();

  private _packages: Map<string, Package> = new Map();

  constructor(
    private config: Config,
    public readonly rootDir: string,
    private rootOnly: boolean = false,
  ) {
    super(`FileSystemRepo`, path.resolve(rootDir));
  }

  override describe(): string {
    const description: string = super.describe();
    if (this.rootDir !== this.absoluteURI) {
      return description.replace(/\)/, t("lib.repository.file_system_repository.resolvedFrom", { dir: this.rootDir }));
    }
    return description;
  }

  async init(): Promise<void> {
    if (this.initialized()) {
      log.debug(`FSRepo: Root=${this.rootDir} - already initialized`);
      return;
    }

    log.debug(`FSRepo init: Root=${this.rootDir} - BEGIN`);

    if (!existsSync(this.rootDir)) {
      throw new Error(`addRepo - dir not found: ${this.rootDir}`);
    }

    if (!DirUtils.isDirectory(this.rootDir)) {
      throw new Error(`addRepo - repository should exist and be a dir: ${this.rootDir}`);
    }

    await this.reload();

    log.debug(`FSRepo init: Root=${this.rootDir} - END`);
    this.setInitialized();
  }

  listPackages(): Array<Package> {
    return [...this._packages.values()];
  }

  resolvePackage(packageName: string): Package | undefined {
    log.debug(`resolvePackage - looking for ${packageName} in ${this.describe()}`);

    const pkg = this._packages.get(packageName);

    if (pkg) {
      log.debug(`${this.name}: found package ${packageName} => ${pkg.toString()}`);
    } else {
      log.debug(`${this.name}: package ${packageName} not found in ${this.describe()}`);
      log.debug(`Known packages: ${this._packages}`);
    }

    return pkg;
  }

  async reload(): Promise<void> {
    const newPackages = await this.readPackages();
    this._packages.clear();
    newPackages.forEach((pkg) => {
      this._packages.set(pkg.name, pkg);
    });
  }

  ///////////////////////////////////////////////////

  private async readPackages(): Promise<Array<Package>> {
    if (!DirUtils.isDirectory(this.rootDir)) {
      log.debug(`# readPackages: rootDir not found ${this.rootDir}`);
      return [];
    }

    this.feedback.start(t("lib.repository.file_system_repository.scanning", { dir: this.rootDir }));

    const timer = new Timer();

    const globOptions: ExpandGlobOptions = {
      root: this.rootDir,
      extended: true,
      includeDirs: true,
      exclude: this.excludeDirs.flatMap((dir) => [
        `**/${dir}`,
        `**/${dir}/**`,
      ]),
    };
    const packages: Array<Package> = await this.getPackageFiles(globOptions, this.rootOnly);

    this.feedback.reset(t(
      "lib.repository.file_system_repository.found",
      { pkgNum: StringUtils.padNum(packages.length, 3), dir: this.rootDir, timer: timer.humanize() },
    ));
    return packages;
  }

  // deno-lint-ignore require-await
  private async getPackageFiles(globOptions: ExpandGlobOptions, rootDirOnly: boolean = false): Promise<Array<Package>> {
    log.debug(`# readPackages: ${JSON.stringify(globOptions)}`);
    return this.crawlPackages(globOptions, rootDirOnly);
  }

  private async crawlPackages(
    options: ExpandGlobOptions,
    rootDirOnly: boolean = false
  ): Promise<Array<Package>> {
    const packages: Package[] = [];
    const promises: Array<Promise<Package | undefined>> = [];

    const pattern = rootDirOnly
      ? "*.levain{,.yaml,.yml}"
      : "**/*.levain{,.yaml,.yml}";

    for await (const entry of expandGlob(pattern, options)) {
      this.feedback.show();

      if (!entry.isFile) {
        continue;
      }

      promises.push(this.readPackage(entry.path));
    }

    const results = await Promise.all(promises);

    for (const pkg of results) {
      if (pkg) {
        packages.push(pkg);
      }
    }

    return packages;
  }


  private async readPackage(yamlFile: string): Promise<Package | undefined> {

    let yamlStr: string | undefined = undefined;
    try {
      yamlStr = FileUtils.readTextFileSync(yamlFile);
    } catch (error) {
      log.error(`!!! error loading package ${yamlFile}: ${error}`);
      return undefined;
    }

    const packageName = path.basename(yamlFile).replace(/\.levain(\.ya?ml)?$/, "");

    log.debug(`readPackage ${packageName} ${yamlFile}`);

    // log.debug(`yaml ${packageName} -> ${yamlStr}`)

    // log.debug(`pkg ${packageName} -> ${pkg}`)

    const packageHome = await this.config.replaceVars(`\${levainHome}/${packageName}`);

    return new FileSystemPackage(
      this.config,
      packageName,
      packageHome,
      yamlFile,
      yamlStr,
      this,
    );
  }
}
