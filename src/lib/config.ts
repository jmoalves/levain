import * as log from "@std/log";
import * as path from "@std/path";
import { ensureDirSync, existsSync } from "@std/fs";

import t from "./i18n.ts";

import PackageManager from "./package/package_manager.ts";
import Registry from "./repository/registry.ts";
import RepositoryManager from "./repository/repository_manager.ts";
import { FileUtils } from "./fs/file_utils.ts";
import VarResolver from "./var_resolver.ts";
import ConfigPersistentAttributes from "./config-persistent-attributes.ts";
import { isNotFoundFileError } from "./utils/error_utils.ts";
import LevainPaths from "./paths/levain_paths.ts";
import HomePaths from "./paths/home_paths.ts";
import ConfigPaths from "./paths/config_paths.ts";

export default class Config {
  packageManager: PackageManager;
  private _repoManager: RepositoryManager;

  public configPaths: ConfigPaths;
  private _env: any = {};
  private _context: any = {}; // Do we really need two of them (_env and _context)?

  public email: string | undefined;
  public fullname: string | undefined;
  private _login: string | undefined;
  private _password: string | undefined;

  private _shellPath: string | undefined;
  private _defaultPackage: string | undefined;

  private _registry: Registry | undefined;

  private _lastKnownVersion: string | undefined;
  private _lastUpdateQuestion: string | undefined;
  private _autoUpdate: boolean | undefined;
  private _shellCheckForUpdate: boolean | undefined;
  private lastCfg?: ConfigPersistentAttributes;

  constructor(args: any = {}) {
    this.configPaths = new ConfigPaths("<unset>");
    this.packageManager = new PackageManager(this);
    this._repoManager = new RepositoryManager(this);
    
    const loaded = this.load(HomePaths.levainConfigFile);

    this.configEnv(args);
    this.configHome(args);

    if (!loaded) {
      this.load(this.configPaths.oldLevainConfigFile); // Backward compatibility
    }

    this.configCache(args);

    log.debug("");
    log.debug(`=== Config: \n${JSON.stringify(this._env, null, 3)}`);
  }

  get repositoryManager(): RepositoryManager {
    return this._repoManager;
  }

  get levainRegistry(): Registry {
    if (this._registry?.rootDir !== this.configPaths.levainRegistryDir) {
      this._registry = new Registry(this, this.configPaths.levainRegistryDir);
    }
    return this._registry;
  }

  get context(): any {
    return this._context;
  }

  get shellPath(): string | undefined {
    if (this._shellPath) {
      if (!existsSync(this._shellPath)) {
        log.debug(`Shell path does not exist - ${this._shellPath}`);
        return undefined;
      }

      if (!FileUtils.isFile(this._shellPath)) {
        log.debug(`Shell path must be the executable - ${this._shellPath}`);
        return undefined;
      }
    }

    return this._shellPath;
  }

  set shellPath(shellPath: string | undefined) {
    if (this._shellPath != shellPath) {
      log.warn("");
      log.warn("***********************************************************************************");
      log.warn(`** ${t("lib.config.shellPath", { oldPath: this._shellPath, newPath: shellPath })}`);
      log.warn("***********************************************************************************");
      log.warn("");
    }

    this._shellPath = shellPath;
  }

  get defaultPackage(): string {
    return this._defaultPackage || "levain";
  }

  set defaultPackage(pkgName: string) {
    if (this._defaultPackage != pkgName) {
      log.warn("");
      log.warn("***********************************************************************************");
      log.warn(`** ${t("lib.config.defaultPackage", { oldPackage: this._defaultPackage, newPackage: pkgName })}`);
      log.warn("***********************************************************************************");
      log.warn("");
    }

    this._defaultPackage = pkgName;
  }

  get lastKnownVersion(): string | undefined {
    return this._lastKnownVersion;
  }

  set lastKnownVersion(version: string | undefined) {
    log.debug(`lastKnownVersion: ${this._lastKnownVersion} => ${version}`);
    this._lastKnownVersion = version;
  }

  get lastUpdateQuestion(): string | undefined {
    return this._lastUpdateQuestion;
  }

  set lastUpdateQuestion(dateTag: string | undefined) {
    log.debug(`lastUpdateQuestion: ${this._lastUpdateQuestion} => ${dateTag}`);
    this._lastUpdateQuestion = dateTag;
  }

  get autoUpdate(): boolean | undefined {
    return this._autoUpdate;
  }

  set autoUpdate(autoUpdate: boolean | undefined) {
    log.debug(`autoUpdate: ${this._autoUpdate} => ${autoUpdate}`);
    this._autoUpdate = autoUpdate;
  }

  get shellCheckForUpdate(): boolean | undefined {
    return this._shellCheckForUpdate;
  }

  set shellCheckForUpdate(shellCheckForUpdate: boolean | undefined) {
    log.debug(`shellCheckForUpdate: ${this._shellCheckForUpdate} => ${shellCheckForUpdate}`);
    this._shellCheckForUpdate = shellCheckForUpdate;
  }

  setVar(name: string, value: string): void {
    if (name == "levainHome") {
      this.setLevainHome(value);
    }
    this._env[name] = value;
  }

  getVar(name: string): string | undefined {
    const value = this._env[name];
    if (value) {
      return "" + value;
    } else {
      return value;
    }
  }

  // deno-lint-ignore require-await
  async replaceVars(text: string, pkgName?: string | undefined): Promise<string> {
    return VarResolver.replaceVars(text, pkgName, this);
  }

  public saveIfChanged(): void {
    log.debug(`Config.saveIfChanged`);

    const currentCfg = this.buildCfg();
    if (currentCfg !== this.lastCfg) {
      log.debug(`saving changed config`);
      return this.save();
    }
  }

  public save(): void {
    const cfg = this.buildCfg();
    this.lastCfg = cfg;

    const fileName = HomePaths.levainConfigFile;

    log.debug(`SAVE ${fileName}`);
    log.debug(`${JSON.stringify(cfg, null, 3)}`);

    ensureDirSync(this.configPaths.levainConfigDir);
    FileUtils.writeTextFileSync(fileName, JSON.stringify(cfg, null, 3));
    log.debug(`saved ${fileName}`);

    try {
      FileUtils.removeSync(this.configPaths.oldLevainConfigFile);
      log.debug(`DEL ${this.configPaths.oldLevainConfigFile}`);
    } catch (err) {
      if (!isNotFoundFileError(err)) {
        log.error(t("lib.config.errorReading", { filename: this.configPaths.oldLevainConfigFile }));
        throw err;
      }
    }
  }

  private buildCfg(): ConfigPersistentAttributes {
    const cfg = new ConfigPersistentAttributes();
    cfg.repos = this.repositoryManager.saveState;
    cfg.defaultPackage = this._defaultPackage;
    cfg.cacheDir = this.configPaths.levainCacheDir;
    cfg.shellPath = this._shellPath;
    cfg.lastKnownVersion = this._lastKnownVersion;
    cfg.lastUpdateQuestion = this._lastUpdateQuestion;
    cfg.autoUpdate = this._autoUpdate;
    cfg.shellCheckForUpdate = this._shellCheckForUpdate;
    cfg.levainHome = this.configPaths.levainHome;
    return cfg;
  }

  private load(configFile: string): boolean {
    if (!configFile) {
      return false;
    }

    const data = this.loadText(configFile);
    if (!data) {
      return false;
    }

    const cfg = JSON.parse(data);
    log.debug(`- PARSE ${JSON.stringify(cfg)}`);
    this.lastCfg = cfg;

    if (cfg.repos) {
      this.repositoryManager.saveState = cfg.repos;
    }

    if (cfg.defaultPackage) {
      this._defaultPackage = cfg.defaultPackage;
      log.debug(`- DEFAULT-PACKAGE ${this._defaultPackage}`);
    }

    if (cfg.cacheDir) {
      this.configPaths.levainCacheDir = cfg.cacheDir;
    }

    if (cfg.shellPath) {
      this._shellPath = cfg.shellPath;
    }

    if (cfg.lastKnownVersion) {
      this._lastKnownVersion = cfg.lastKnownVersion;
    }

    if (cfg.lastUpdateQuestion) {
      this._lastUpdateQuestion = cfg.lastUpdateQuestion;
    }

    if (cfg.autoUpdate) {
      this._autoUpdate = cfg.autoUpdate;
    }

    if (Object.hasOwn(cfg, "shellCheckForUpdate")) {
      this._shellCheckForUpdate = cfg.shellCheckForUpdate;
    } else {
      this._shellCheckForUpdate = true;
    }

    if (cfg.levainHome) {
      this.setLevainHome(cfg.levainHome);
    }

    return true;
  }

  private loadText(filename: string): string | null {
    try {
      log.debug(`LOAD ${filename}`);
      const data = FileUtils.readTextFileSync(filename);
      log.debug(`- DATA ${data}`);
      return data;
    } catch (err) {
      if (!isNotFoundFileError(err)) {
        log.error(t("lib.config.errorReading", { filename: filename }));
        throw err;
      }

      log.debug(`NOTFOUND ${filename}`);
      return null;
    }
  }

  set login(username: string | undefined) {
    this._login = username;
  }

  get login(): string | undefined {
    return this._login;
  }

  set password(password: string | undefined) {
    this._password = password;
  }

  get password(): string | undefined {
    return this._password;
  }

  /////////////////////////////////////////////////////////////////////////////////
  private configEnv(args: any): void {
    Object.keys(args).forEach((key) => {
      if (!key.startsWith("_")) {
        this.setVar(key, args[key]);
      }
    });
  }

  configCache(args: any): void {
    if (args.levainCache) {
      this.configPaths.levainCacheDir = args.levainCache;
    }
  }

  private configHome(args: any): void {
    if (this.configPaths.levainHome != "<unset>") {
      return;
    }
  



    if (args["levainHome"]) {
      const dirs: string[] = args["levainHome"];
      const homeDir = dirs.find((dir) => {
        const home = path.resolve(Deno.cwd(), dir);
        log.debug(`Checking home at ${home}`);
        try {
          ensureDirSync(home);
          return true;
        } catch (_err) {
          log.debug(`${home} not available`);
          return false;
        }
      });

      if (!homeDir) {
        throw `${t("lib.config.noHomeValid")}\n-> ${args["levainHome"]}`;
      }

      this.setLevainHome(path.resolve(Deno.cwd(), homeDir));
      log.debug(`ARG levainHome=${this.configPaths.levainHome}`);
      return;
    }

    const config = path.resolve(LevainPaths.levainSrcDir, "..", ".levain", "config.json");
    try {
      if (FileUtils.getFileInfoSync(config)) {
        this.setLevainHome(path.resolve(LevainPaths.levainSrcDir, ".."));
        log.debug(`CFG levainHome=${this.configPaths.levainHome}`);
        return;
      }
    } catch (_err) {
      //ignore
    }

    const levainHome = Deno.env.get("levainHome");
    if (levainHome) {
      this.setLevainHome(path.resolve(levainHome));
      log.debug(`ENV levainHome=${this.configPaths.levainHome}`);
      return;
    }

    this.setLevainHome(HomePaths.levainFallbackHome);
    log.debug(`DEFAULT levainHome=${this.configPaths.levainHome}`);
  }

  private setLevainHome(levainHome: string | string[]) {
    if (Array.isArray(levainHome)) {
      this.setLevainHome(levainHome[0]);
    } else {
      this._env["levainHome"] = levainHome;
      this.configPaths.levainHome = levainHome;
    }
  }
}
