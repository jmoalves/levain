import * as log from "@std/log";
import * as path from "@std/path";
import { existsSync, ExpandGlobOptions } from "@std/fs";

import t from "../i18n.ts";

import type Config from "../config.ts";
import type Package from "../package/package.ts";
import FileSystemPackage from "../package/file_system_package.ts";
import { Timer } from "../timer.ts";
import { FileUtils } from "../fs/file_utils.ts";
import ConsoleFeedback from "../utils/console_feedback.ts";

import AbstractRepository from "./abstract_repository.ts";
import DirUtils from "../fs/dir_utils.ts";
import StringUtils from "../utils/string_utils.ts";

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
      exclude: this.excludeDirs,
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
    return this.crawlPackages(globOptions["root"] || ".", globOptions, rootDirOnly);
  }

  private async crawlPackages(
    dirname: string,
    options: ExpandGlobOptions,
    rootDirOnly: boolean = false,
    currentLevel = 0,
  ): Promise<Array<Package>> {
    // TODO can we use expandGlob to get faster results?
    const maxLevels = 5;
    const nextLevel = currentLevel + 1;

    // User feedback
    this.feedback.show();

    if (currentLevel > maxLevels) {
      log.debug(`skipping ${dirname}, more then ${maxLevels} levels deep`);
      return [];
    }

    if (this.excludeDirs.some((ignoreDir) => dirname.toLowerCase().endsWith(ignoreDir.toLowerCase()))) {
      log.debug(`ignoring ${dirname}`);
      return [];
    }

    log.debug(`crawlPackages ${dirname}`);

    let entries: AsyncIterable<Deno.DirEntry>;
    try {
      entries = Deno.readDir(dirname);
    } catch (error) {
      if (error instanceof Deno.errors.PermissionDenied) {
        log.debug(`not crawling ${dirname} - permission denied`);
        return [];
      }
      log.debug(`error reading ${dirname} - ${error}`);
      return [];
    }


    const promisesDir: Array<Promise<Array<Package>>> = [];
    const promisesFile: Array<Promise<Package | undefined>> = [];

    for await (const entry of entries) {
      // User feedback
      this.feedback.show();
      const fullUri = path.resolve(dirname, entry.name);
      if (entry.isFile) {
        if (this.isPackageFile(entry.name)) {
          promisesFile.push(this.readPackage(fullUri));
        }
        // An attempt to optmize search in a crowded directory without packages
        // Perhaps it would be better to read entries with a pattern
        continue;
      }
      if (!entry.isDirectory || rootDirOnly) {
        continue;
      }
      promisesDir.push(this.crawlPackages(fullUri, options, false, nextLevel));
    }

    const packages: Array<Package> = [];
    const filePackages = await Promise.all(promisesFile);
    packages.push(
      ...filePackages.filter(
        (pkg): pkg is Package => pkg !== undefined,
      ),
    );
    const childPackages = await Promise.all(promisesDir);
    for (const child of childPackages) {
      packages.push(...child);
    }

    return packages;
  }

  private isPackageFile(yamlFile: string): boolean {
    return yamlFile.match(/\.levain(\.ya?ml)?$/) != null;
  }

  private async readPackage(yamlFile: string): Promise<Package | undefined> {
    let yamlStr: string | undefined = undefined;
    try {
      yamlStr = FileUtils.readTextFileSync(yamlFile);
    } catch (error) {
      log.error(`!!! error loading package ${yamlFile}: ${error}`);
      return undefined;
    }

    const packageName = yamlFile.replace(/.*[\/|\\]/g, "").replace(/\.levain(\.ya?ml)?/, "");
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
