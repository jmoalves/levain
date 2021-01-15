import * as log from "https://deno.land/std/log/mod.ts";
import * as path from "https://deno.land/std/path/mod.ts";
import {ensureDirSync, existsSync} from "https://deno.land/std/fs/mod.ts";

import {homedir} from './utils.ts';

import Repository from './repository/repository.ts'
import CacheRepository from './repository/cache_repository.ts'
import ChainRepository from './repository/chain_repository.ts'
import PackageManager from "./package/manager.ts";
import RepositoryFactory from "./repository/repository_factory.ts";
import Package from "./package/package.ts";
import UserInfoUtil from './user_info/userinfo_util.ts';
import Registry from './repository/registry.ts';
import OsUtils from './os_utils.ts';
import RepositoryManager from "./repository/repository_manager.ts";
import LevainVersion from "../levain_version.ts";
import FileUtils from '../lib/file_utils.ts';

export default class Config {
    private _pkgManager: PackageManager;
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

    constructor(args: any) {
        this._pkgManager = new PackageManager(this);
        this._repoManager = new RepositoryManager(this);

        this.configEnv(args);
        this.configHome(args);
        this.configCache(args);

        this.load();

        log.debug("");
        log.debug(`=== Config: \n${JSON.stringify(this._env, null, 3)}`);
    }

    get packageManager(): PackageManager {
        return this._pkgManager;
    }

    get repositoryManager(): RepositoryManager {
        return this._repoManager;
    }

    get levainHome(): string {
        return this._env["levainHome"];
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
        log.warning("");
        log.warning("***********************************************************************************");
        log.warning(`** Changing shell path: ${shellPath}`);
        log.warning("***********************************************************************************");
        log.warning("");

        this._shellPath = shellPath;
    }

    get defaultPackage(): string {
        return this._defaultPackage || "levain";
    }

    set defaultPackage(pkgName: string) {
        if (this._defaultPackage) {
            log.warning("");
            log.warning("***********************************************************************************");
            log.warning(`** Changing default package: ${this._defaultPackage} => ${pkgName}`);
            log.warning("***********************************************************************************");
            log.warning("");
        }

        this._defaultPackage = pkgName;
    }

    setVar(name: string, value: string): void {
        this._env[name] = value;
    }

    getVar(name: string): string {
        return this._env[name];
    }

    replaceVars(text: string, pkgName?: string | undefined): string {
        // TODO: Refactor this... Use ChainOfResponsibility Pattern...

        let myText: string = text;
        let vars = myText.match(/\${[^${}]+}/);
        while (vars) {
            for (let v of vars) {
                let vName = v.replace("$", "").replace("{", "").replace("}", "");
                let value: string | undefined = undefined;

                if (!value && vName.match(/^levain\./)) {
                    switch (vName) {
                        case "levain.login":
                            if (!this.login) {
                                new UserInfoUtil().askLogin(this)
                            }
                            value = this.login;
                            break;

                        case "levain.password":
                            if (!this.password) {
                                new UserInfoUtil().askPassword(this)
                            }
                            value = this.password;
                            break;

                        case "levain.email":
                            if (!this.email) {
                                new UserInfoUtil().askEmail(this)
                            }
                            value = this.email;
                            break;

                        case "levain.fullname":
                            if (!this.fullname) {
                                new UserInfoUtil().askFullName(this)
                            }
                            value = this.fullname;
                            break;

                        default:
                        // nothing
                    }

                    if (!value) {
                        throw new Error(`Global attribute ${vName} is undefined`);
                    }
                }

                if (!value && vName.search(/^pkg\.(.+)\.([^.]*)/) != -1) {
                    let pkgVarPkg = vName.replace(/^pkg\.(.+)\.([^.]*)/, "$1");
                    let pkgVarName = vName.replace(/^pkg\.(.+)\.([^.]*)/, "$2");
                    value = this.packageManager.getVar(pkgVarPkg, pkgVarName);
                }

                if (!value) {
                    value = Deno.env.get(vName);
                }

                if (!value && this._env) {
                    value = this._env[vName];
                }

                if (!value && pkgName) {
                    value = this.packageManager.getVar(pkgName, vName);
                }

                if (!value && vName == "home") {
                    value = homedir();
                }

                if (value) {
                    myText = myText.replace(v, value);
                } else {
                    throw new Error(`${v} is undefined`);
                }
            }

            vars = myText.match(/\${[^${}]+}/);
        }

        return myText;
    }

    public save(): void {
        let cfg: any = {};
        cfg.repos = this.repositoryManager.saveState;
        cfg.defaultPackage = this._defaultPackage;
        cfg.cacheDir = this.levainCacheDir;
        cfg.shellPath = this._shellPath;

        let fileName = this.levainConfigFile;

        log.info(`SAVE ${fileName}`);
        log.debug(`${JSON.stringify(cfg, null, 3)}`);

        ensureDirSync(this.levainConfigDir)
        Deno.writeTextFileSync(fileName, JSON.stringify(cfg, null, 3));
        log.debug(`saved ${fileName}`);
    }

    public load(): void {
        let filename = this.levainConfigFile;
        if (!filename) {
            return;
        }

        try {
            log.info(`LOAD ${filename}`);

            let data = Deno.readTextFileSync(filename);
            log.debug(`- DATA ${data}`);

            let cfg = JSON.parse(data);
            log.debug(`- PARSE ${JSON.stringify(cfg)}`);
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
            log.info(`ARG levainHome=${this._env["levainHome"]}`)
            return;
        }

        let config = path.resolve(this.levainSrcDir, "..", ".levain", "config.json");
        try {
            if (Deno.statSync(config)) {
                this._env["levainHome"] = path.resolve(this.levainSrcDir, "..");
                log.info(`CFG levainHome=${this._env["levainHome"]}`)
                return;
            }
        } catch (err) {
            //ignore
        }

        let levainHome = Deno.env.get("levainHome");
        if (levainHome) {
            this._env["levainHome"] = path.resolve(levainHome);
            log.info(`ENV levainHome=${this._env["levainHome"]}`)
            return;
        }

        let home = homedir();
        if (home) {
            this._env["levainHome"] = path.resolve(home, "levain");
            log.info(`DEFAULT levainHome=${this._env["levainHome"]}`)
            return;
        }
    }

    get levainSrcDir(): string {
        return LevainVersion.levainSrcDir
    }
}
