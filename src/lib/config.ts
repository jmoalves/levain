import * as log from "https://deno.land/std/log/mod.ts";
import * as path from "https://deno.land/std/path/mod.ts";
import {ensureDirSync, existsSync} from "https://deno.land/std/fs/mod.ts";

import LevainVersion from "../levain_version.ts";

import PackageManager from "./package/package_manager.ts";
import Registry from './repository/registry.ts';
import RepositoryManager from "./repository/repository_manager.ts";
import {FileUtils} from './fs/file_utils.ts';
import {homedir} from './utils/utils.ts';
import VarResolver from "./var_resolver.ts";
import ConfigPersistentAttributes from "./config-persistent-attributes.ts";

export default class Config {
    packageManager: PackageManager;
    private _repoManager: RepositoryManager;

    private _env: any = {};
    private _context: any = {}; // Do we really need two of them (_env and _context)?

    public email: string | undefined;
    public fullname: string | undefined;
    private _login: string | undefined;
    private _password: string | undefined;

    private _shellPath: string | undefined;
    private _defaultPackage: string | undefined;

    private _registry: Registry | undefined;

    private _levainBackupDir: string | undefined;
    private _levainCacheDir: string | undefined;

    private _lastKnownVersion: string | undefined;
    private _lastUpdateQuestion: string | undefined;
    private _autoUpdate: boolean | undefined
    private _shellCheckForUpdate: boolean | undefined
    private lastCfg?: ConfigPersistentAttributes;

    constructor(args: any = {}) {
        this.packageManager = new PackageManager(this);
        this._repoManager = new RepositoryManager(this);

        this.configEnv(args);
        this.configHome(args);

        this.load();

        this.configCache(args);

        log.debug("");
        log.debug(`=== Config: \n${JSON.stringify(this._env, null, 3)}`);
    }

    get repositoryManager(): RepositoryManager {
        return this._repoManager;
    }

    get levainHome(): string {
        return this._env["levainHome"];
    }

    get levainBaseDir(): string {
        return path.resolve(this.levainHome, "levain");
    }

    get levainConfigDir(): string {
        const dir = path.resolve(this.levainHome, ".levain");
        ensureDirSync(dir)
        return dir;
    }

    get levainConfigFile(): string {
        return path.resolve(this.levainConfigDir, "config.json");
    }

    get levainRegistryDir(): string {
        const dir = path.resolve(this.levainConfigDir, "registry");
        ensureDirSync(dir)
        return dir;
    }

    get levainRegistry(): Registry {
        if (this._registry?.rootDir !== this.levainRegistryDir) {
            this._registry = new Registry(this, this.levainRegistryDir)
        }
        return this._registry
    }

    get levainSafeTempDir(): string {
        const dir = path.resolve(this.levainConfigDir, "temp");
        ensureDirSync(dir)
        return dir;
    }

    set levainBackupDir(dir: string) {
        this._levainBackupDir = dir
    }

    get levainBackupDir(): string {
        if (!this._levainBackupDir) {
            this._levainBackupDir = path.resolve(this.levainConfigDir, "backup");
        }
        ensureDirSync(this._levainBackupDir)
        return this._levainBackupDir;
    }

    set levainCacheDir(dir: string) {
        this._levainCacheDir = dir
    }

    get levainCacheDir(): string {
        if (!this._levainCacheDir) {
            this._levainCacheDir = path.resolve(this.levainHome, '.levainCache');
        }
        ensureDirSync(this._levainCacheDir)
        return this._levainCacheDir;
    }

    get context(): any {
        return this._context;
    }

    get shellPath(): string | undefined {
        if (this._shellPath) {
            if (!existsSync(this._shellPath)) {
                log.debug(`Shell path does not exist - ${this._shellPath}`)
                return undefined
            }

            if (!FileUtils.isFile(this._shellPath)) {
                log.debug(`Shell path must be the executable - ${this._shellPath}`)
                return undefined
            }
        }

        return this._shellPath
    }

    set shellPath(shellPath: string | undefined) {
        if (this._shellPath != shellPath) {
            log.warning("");
            log.warning("***********************************************************************************");
            log.warning(`** Changing shell path: ${this._shellPath} => ${shellPath}`);
            log.warning("***********************************************************************************");
            log.warning("");
        }

        this._shellPath = shellPath;
    }

    get defaultPackage(): string {
        return this._defaultPackage || "levain";
    }

    set defaultPackage(pkgName: string) {
        if (this._defaultPackage != pkgName) {
            log.warning("");
            log.warning("***********************************************************************************");
            log.warning(`** Changing default package: ${this._defaultPackage} => ${pkgName}`);
            log.warning("***********************************************************************************");
            log.warning("");
        }

        this._defaultPackage = pkgName;
    }

    get lastKnownVersion(): string | undefined {
        return this._lastKnownVersion
    }

    set lastKnownVersion(version: string | undefined) {
        log.debug(`lastKnownVersion: ${this._lastKnownVersion} => ${version}`);
        this._lastKnownVersion = version
    }

    get lastUpdateQuestion(): string | undefined {
        return this._lastUpdateQuestion
    }

    set lastUpdateQuestion(dateTag: string | undefined) {
        log.debug(`lastUpdateQuestion: ${this._lastUpdateQuestion} => ${dateTag}`);
        this._lastUpdateQuestion = dateTag
    }

    get autoUpdate(): boolean | undefined {
        return this._autoUpdate
    }

    set autoUpdate(autoUpdate: boolean | undefined) {
        log.debug(`autoUpdate: ${this._autoUpdate} => ${autoUpdate}`);
        this._autoUpdate = autoUpdate
    }

    get shellCheckForUpdate(): boolean | undefined {
        return this._shellCheckForUpdate
    }

    set shellCheckForUpdate(shellCheckForUpdate: boolean | undefined) {
        log.debug(`shellCheckForUpdate: ${this._shellCheckForUpdate} => ${shellCheckForUpdate}`);
        this._shellCheckForUpdate = shellCheckForUpdate
    }

    setVar(name: string, value: string): void {
        this._env[name] = value;
    }

    getVar(name: string): string {
        return this._env[name];
    }

    async replaceVars(text: string, pkgName?: string | undefined): Promise<string> {
        return VarResolver.replaceVars(text, pkgName, this)
    }

    public saveIfChanged(): void {
        log.debug(`Config.saveIfChanged`)

        const currentCfg = this.buildCfg()
        if (currentCfg !== this.lastCfg) {
            log.debug(`saving changed config`)
            return this.save()
        }
    }

    public save(): void {
        let cfg = this.buildCfg()
        this.lastCfg = cfg

        let fileName = this.levainConfigFile;

        log.debug(`SAVE ${fileName}`);
        log.debug(`${JSON.stringify(cfg, null, 3)}`);

        ensureDirSync(this.levainConfigDir)
        Deno.writeTextFileSync(fileName, JSON.stringify(cfg, null, 3));
        log.debug(`saved ${fileName}`);
    }

    private buildCfg(): ConfigPersistentAttributes {
        let cfg = new ConfigPersistentAttributes();
        cfg.repos = this.repositoryManager.saveState;
        cfg.defaultPackage = this._defaultPackage;
        cfg.cacheDir = this.levainCacheDir;
        cfg.shellPath = this._shellPath;
        cfg.lastKnownVersion = this._lastKnownVersion;
        cfg.lastUpdateQuestion = this._lastUpdateQuestion;
        cfg.autoUpdate = this._autoUpdate;
        cfg.shellCheckForUpdate = this._shellCheckForUpdate;
        return cfg;
    }

    public load(): void {
        let filename = this.levainConfigFile;
        if (!filename) {
            return;
        }

        try {
            log.debug(`LOAD ${filename}`);

            let data = Deno.readTextFileSync(filename);
            log.debug(`- DATA ${data}`);

            let cfg = JSON.parse(data);
            log.debug(`- PARSE ${JSON.stringify(cfg)}`);
            this.lastCfg = cfg

            if (cfg.repos) {
                this.repositoryManager.saveState = cfg.repos;
            }

            if (cfg.defaultPackage) {
                this._defaultPackage = cfg.defaultPackage;
                log.debug(`- DEFAULT-PACKAGE ${this._defaultPackage}`);
            }

            if (cfg.cacheDir) {
                this.levainCacheDir = cfg.cacheDir;
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

            if (cfg.hasOwnProperty('shellCheckForUpdate')) {
                this._shellCheckForUpdate = cfg.shellCheckForUpdate;
            } else {
                this._shellCheckForUpdate = true
            }
        } catch (err) {
            if (err.name != "NotFound") {
                log.error(`Error reading config - ${filename}`);
                throw err;
            }
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
        Object.keys(args).forEach(key => {
            if (!key.startsWith("_")) {
                this._env[key] = args[key];
            }
        });
    }

    configCache(args: any): void {
        if (args.levainCache) {
            this.levainCacheDir = args.levainCache
        }
    }

    private configHome(args: any): void {
        delete this._env["levainHome"];

        if (args["levainHome"]) {
            let dirs: string[] = args["levainHome"];
            let homeDir = dirs.find(dir => {
                let home = path.resolve(Deno.cwd(), dir);
                log.debug(`Checking home at ${home}`);
                try {
                    ensureDirSync(home);
                    return true;
                } catch (err) {
                    log.debug(`${home} not available`);
                    return false;
                }
            });

            if (!homeDir) {
                throw `No valid levainHome in your list\n-> ${args["levainHome"]}`;
            }

            this._env["levainHome"] = path.resolve(Deno.cwd(), homeDir);
            log.debug(`ARG levainHome=${this._env["levainHome"]}`)
            return;
        }

        let config = path.resolve(this.levainSrcDir, "..", ".levain", "config.json");
        try {
            if (Deno.statSync(config)) {
                this._env["levainHome"] = path.resolve(this.levainSrcDir, "..");
                log.debug(`CFG levainHome=${this._env["levainHome"]}`)
                return;
            }
        } catch (err) {
            //ignore
        }

        let levainHome = Deno.env.get("levainHome");
        if (levainHome) {
            this._env["levainHome"] = path.resolve(levainHome);
            log.debug(`ENV levainHome=${this._env["levainHome"]}`)
            return;
        }

        let home = homedir();
        if (home) {
            this._env["levainHome"] = path.resolve(home, "levain");
            log.debug(`DEFAULT levainHome=${this._env["levainHome"]}`)
            return;
        }
    }

    get levainSrcDir(): string {
        return LevainVersion.levainSrcDir
    }
}
