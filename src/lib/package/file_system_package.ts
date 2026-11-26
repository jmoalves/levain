import * as log from "@std/log";
import * as path from "@std/path";
import * as yaml from "@std/yaml";
import { existsSync } from "@std/fs";

import t from "../i18n.ts";
import type Repository from "../repository/repository.ts";
import type Config from "../config.ts";
import { FileUtils } from "../fs/file_utils.ts";
import OsUtils from "../os/os_utils.ts";
import { isReservedPackageName, isUnknownReservedYamlKey } from "../reserved_words.ts";
import { isNotFoundFileError } from "../utils/error_utils.ts";
import AbstractPackage from "./abstract_package.ts";
import VersionNumber from "../utils/version_number.ts";

export default class FileSystemPackage extends AbstractPackage {
  readonly name: string;
  readonly version: VersionNumber | undefined;
  readonly filePath: string;
  readonly baseDir: string;
  readonly pkgDir: string;
  readonly dependencies: string[] | undefined;
  readonly repo: Repository | undefined;
  readonly installed: boolean;
  readonly yamlStruct: any;

  readonly fileName: string;
  readonly fullPath: string;

  private readonly rawYaml: string;
  private _updateAvailable: boolean | undefined;

  constructor(
    private config: Config,
    name: string,
    baseDir: string,
    filePath: string,
    yamlStr: string,
    repo?: Repository,
    installedOverride?: boolean,
  ) {
    super();
    this.name = name;
    this.baseDir = path.resolve(baseDir);
    this.filePath = filePath;
    this.pkgDir = path.resolve(path.dirname(this.filePath));
    this.repo = repo;
    this.rawYaml = yamlStr;

    this.yamlStruct = yaml.parse(yamlStr);

    if (this.yamlStruct && typeof this.yamlStruct === "object") {
      const keysToCheck: string[] = [];
      for (const [key, val] of Object.entries(this.yamlStruct)) {
        if (key === "levain" && val && typeof val === "object" && !Array.isArray(val)) {
          FileSystemPackage.collectYamlPaths("levain", val as Record<string, unknown>, keysToCheck);
        } else {
          keysToCheck.push(key);
        }
      }
      for (const key of keysToCheck) {
        if (isUnknownReservedYamlKey(key)) {
          log.warn(t("lib.reserved_words.unknownYamlKey", { key, pkg: this.name, file: this.filePath }));
        }
      }
    }

    const versionStr = this.yamlStruct?.version;
    this.version = versionStr ? new VersionNumber(versionStr) : undefined;
    this.dependencies = this.normalizeDeps(this.yamlStruct?.dependencies);

    // check installed (reusing pre-scanned registry set when provided)
    this.installed = installedOverride !== undefined
      ? installedOverride
      : existsSync(this.installedRecipeFilepath());

    this.fileName = path.basename(this.filePath);
    this.fullPath = path.resolve(path.join(this.baseDir, this.filePath));
  }

  get updateAvailable(): boolean {
    if (this._updateAvailable !== undefined) {
      return this._updateAvailable;
    }

    if (!this.installed) {
      this._updateAvailable = true;
      return true;
    }

    const installedPath = this.installedRecipeFilepath();
    const resolvedFile = path.resolve(this.filePath);
    const sameFile = OsUtils.isWindows()
      ? resolvedFile.toLowerCase() === installedPath.toLowerCase()
      : resolvedFile === installedPath;
    // Registry package comparing against itself is always up to date
    if (sameFile) {
      this._updateAvailable = false;
      return false;
    }

    let installedRaw: string;
    try {
      installedRaw = FileUtils.readTextFileSync(installedPath);
    } catch (err) {
      if (isNotFoundFileError(err)) {
        this._updateAvailable = true;
        return true;
      }
      throw err;
    }

    // Fast path: identical YAML bytes require neither YAML parsing nor JSON serialization
    if (installedRaw === this.rawYaml) {
      this._updateAvailable = false;
      return false;
    }

    const installedRecipe = JSON.stringify(yaml.parse(installedRaw));
    const currentRecipe = JSON.stringify(this.yamlStruct);
    this._updateAvailable = currentRecipe !== installedRecipe;
    return this._updateAvailable;
  }

  private installedRecipeFilepath() {
    return path.resolve(this.config.configPaths.levainRegistryDir, path.basename(this.filePath));
  }

  yamlItem(key: string): any | undefined {
    if (this.yamlStruct) {
      return this.yamlStruct[key];
    }

    return undefined;
  }

  override toString(): string {
    return "FSPackage[" +
      this.name +
      (this.version ? ` v${this.version}` : "") +
      ", baseDir=" + this.baseDir +
      (this.dependencies ? ", deps=" + this.dependencies : "") +
      ", yaml=" + this.filePath +
      "]";
  }

  private static collectYamlPaths(prefix: string, obj: Record<string, unknown>, out: string[]): void {
    for (const [subKey, subVal] of Object.entries(obj)) {
      const fullKey = `${prefix}.${subKey}`;
      if (subVal && typeof subVal === "object" && !Array.isArray(subVal)) {
        FileSystemPackage.collectYamlPaths(fullKey, subVal as Record<string, unknown>, out);
      } else {
        out.push(fullKey);
      }
    }
  }

  private normalizeDeps(deps: string[] | undefined): string[] | undefined {
    if (isReservedPackageName(this.name)) {
      return undefined;
    }

    const set: Set<string> = new Set<string>();
    set.add("levain"); // first dependency

    if (deps) {
      deps.forEach((v) => set.add(v));
    }

    return [...set];
  }

  getRecipeTimestamp() {
    return FileUtils.getModificationTimestamp(this.filePath);
  }

  getInstalledTimestamp() {
    const registry = this.installedRecipeFilepath();
    return FileUtils.getModificationTimestamp(registry);
  }
}
