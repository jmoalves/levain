import * as log from "https://deno.land/std/log/mod.ts";

import * as path from "https://deno.land/std/path/mod.ts";

import {homedir} from './utils.ts';

import Repository from './repository/repository.ts'
import CacheRepository from './repository/cache_repository.ts'
import ChainRepository from './repository/chain_repository.ts'
import FileSystemRepository from './repository/file_system_repository.ts'
import PackageManager from "./package/manager.ts";

export default class Config {
    private _pkgManager: PackageManager;
    private _repository: Repository;
    private _env: any = {};
    private _context: any = {}; // Do we really need two of them (_env and _context)?

    private _extraRepos: string[] = [];

    public email: string | undefined;
    public fullname: string | undefined;
    private _username: string | undefined;
    private _password: string | undefined;

    private _defaultPackage: string | undefined;

    constructor(args: any) {
        this.configEnv(args);
        this.configHome();
        this._repository = this.configRepo(args);
        this._pkgManager = new PackageManager(this);

        this.load();

        log.info("");
        log.info(`=== Config: \n${JSON.stringify(this._env, null, 3)}`);
    }

    get repository(): Repository {
        return this._repository;
    }

    set repository(repository: Repository) {
        this._repository = repository;
    }

    get packageManager(): PackageManager {
        return this._pkgManager;
    }

    get levainHome(): string {
        return this._env["levainHome"];
    }

    get levainConfigFile(): string {
        return path.resolve(this.levainHome, ".levain", "config.json");
    }

    get levainRegistry(): string {
        return path.resolve(this.levainHome, ".levain", "registry");
    }

    get levainSafeTempDir(): string {
        return path.resolve(this.levainHome, ".levain", "temp");
    }

    get context(): any {
        return this._context;
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

    get defaultPackage(): string {
        // Looking for package at current dir
        let curDirRepo = new FileSystemRepository(this, Deno.cwd());
        let pkgs = curDirRepo.listPackages(true);
        if (pkgs && pkgs.length == 1) {
            // TODO: Could we provide a default mechanism?
            let pkg = curDirRepo.resolvePackage(pkgs[0].name);
            if (pkg) {
                if (pkg.installed) {
                    return pkg.name;
                } else {
                    // TODO: install package?
                    log.warning("");
                    log.warning("***********************************************************************************");
                    log.warning(`** Default package "${pkg.name}" found but NOT installed. Use levain install ${pkg.name}`);
                    log.warning("***********************************************************************************");
                    log.warning("");
                }
            }
        } else {
            log.warning("");
            log.warning("***********************************************************************************");
            log.warning(`** Found more than one .levain.yaml file in this folder. Which one should I use? => ${pkgs}`);
            log.warning("***********************************************************************************");
            log.warning("");
        }

        return this._defaultPackage || "levain";
    }

    setVar(name: string, value: string): void {
        this._env[name] = value;
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
                        case "levain.username":
                            value = this.username;
                            break;

                        case "levain.password":
                            value = this.password;
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

    get extraBinDir(): string {
        return path.resolve(this.levainSrcDir, "extra-bin", Deno.build.os);
    }

    public save(): void {
        let cfg: any = {};
        cfg.repos = this._extraRepos;
        cfg.defaultPackage = this._defaultPackage;

        let fileName = this.levainConfigFile;

        log.info(`SAVE ${fileName}`);
        Deno.writeTextFileSync(fileName, JSON.stringify(cfg, null, 3));
    }

    public load(): void {
        let fileName = this.levainConfigFile;
        try {
            log.info(`LOAD ${fileName}`);
            let data = Deno.readTextFileSync(fileName);
            log.debug(`- DATA ${data}`);

            let cfg = JSON.parse(data);
            if (cfg.repos) {
                this._extraRepos.push(cfg.repos);
            }

            if (cfg.defaultPackage) {
                this._defaultPackage = cfg.defaultPackage;
            }
        } catch (err) {
            if (err.name != "NotFound") {
                log.error(`Error reading config - ${fileName}`);
                throw err;
            }
        }
    }

    set username(username: string | undefined) {
        this._username = username;
    }

    get username(): string | undefined {
        return this._username;
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

    private configHome(): void {
        log.info("");

        if (this._env["levainHome"]) {
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

    private configRepo(args: any): Repository {
        let repos: Repository[] = [];

        log.info("");
        log.info("=== LevainRepos");
        this.addLevainRepo(repos);
        this.addCurrentDirRepo(repos);
        this.addRepos(repos, args.addRepo);
        this.addLevainRegistryRepo(repos);

        return new CacheRepository(this,
            new ChainRepository(this, repos)
        );
    }

    private get levainSrcDir(): string {
        // https://stackoverflow.com/questions/61829367/node-js-dirname-filename-equivalent-in-deno
        return path.resolve(path.dirname(path.fromFileUrl(import.meta.url)), "../..");
    }

    private addLevainRepo(repos: Repository[]) {
        log.info(`LevainRepo: DEFAULT ${this.levainSrcDir} --> Levain src dir`);
        repos.push(new FileSystemRepository(this, this.levainSrcDir));
    }

    private addLevainRegistryRepo(repos: Repository[]) {
        log.info(`LevainRepo: DEFAULT ${this.levainRegistry} --> Levain registry dir`);
        repos.push(new FileSystemRepository(this, this.levainRegistry));
    }

    private addCurrentDirRepo(repos: Repository[]) {
        log.info(`LevainRepo: DEFAULT ${Deno.cwd()} --> Current working dir`);
        repos.push(new FileSystemRepository(this, Deno.cwd()));
    }

    private addRepos(repos: Repository[], addRepo: undefined | string[]) {
        if (!addRepo) {
            return;
        }

        addRepo?.forEach((repo) => {
            try {
                const fileInfo = Deno.statSync(repo);
                if (!fileInfo || !fileInfo.isDirectory) {
                    throw `addRepo - invalid dir ${repo}`;
                }
            } catch (err) {
                if (err.name != "NotFound") {
                    throw err;
                }
            }

            let repoPath = path.resolve(repo);
            log.info(`LevainRepo: addRepo ${repoPath}`);
            this._extraRepos.push(repoPath);
            repos.push(new FileSystemRepository(this, repoPath));
        });
    }
}
