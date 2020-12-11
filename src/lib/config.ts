import * as log from "https://deno.land/std/log/mod.ts";
import * as path from "https://deno.land/std/path/mod.ts";
import {ensureDirSync} from "https://deno.land/std/fs/mod.ts";

import {homedir} from './utils.ts';

import Repository from './repository/repository.ts'
import CacheRepository from './repository/cache_repository.ts'
import ChainRepository from './repository/chain_repository.ts'
import PackageManager from "./package/manager.ts";
import RepositoryFactory from "./repository/repository_factory.ts";
import Package from "./package/package.ts";
import UserInfoUtil from './user_info/userinfo_util.ts';
import Registry from './repository/registry.ts';

export default class Config {
    private _pkgManager: PackageManager;
    private _repository: Repository | undefined;
    private _installedRepository: Repository | undefined;
    private _env: any = {};
    private _context: any = {}; // Do we really need two of them (_env and _context)?

    private _extraRepos: string[] = [];

    public email: string | undefined;
    public fullname: string | undefined;
    private _login: string | undefined;
    private _password: string | undefined;

    private _defaultPackage: string | undefined;

    private savedArgs: any;

    private repoFactory: RepositoryFactory;
    private _registry: Registry | undefined;

    constructor(args: any) {
        this.savedArgs = args;

        this.repoFactory = new RepositoryFactory(this);

        this.configEnv(args);
        this.configHome();

        this.load();

        this._pkgManager = new PackageManager(this);

        log.debug("");
        log.debug(`=== Config: \n${JSON.stringify(this._env, null, 3)}`);
    }

    get repository(): Repository {
        if (!this._repository) {
            // Lazy loading
            this._repository = this.configRepo(this.savedArgs, false);
        }

        return this._repository;
    }

    set repository(repo: Repository) {
        this._repository = repo;
    }

    get repositoryInstalled(): Repository {
        if (!this._installedRepository) {
            // Lazy loading
            this._installedRepository = this.configRepo(this.savedArgs, true);
        }

        return this._installedRepository;
    }

    get packageManager(): PackageManager {
        return this._pkgManager;
    }

    get levainHome(): string {
        return this._env["levainHome"];
    }

    get levainConfigDir(): string {
        return path.resolve(this.levainHome, ".levain");
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

    get levainBackupDir(): string {
        return path.resolve(this.levainConfigDir, "backup");
    }

    get context(): any {
        return this._context;
    }

    get defaultPackage(): string {
        return this.currentDirPackage?.name || this._defaultPackage || "levain";
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

    get currentDirPackage(): Package | undefined {
        // Looking for package at current dir
        let curDirRepo = this.repoFactory.create(Deno.cwd());
        let pkgs = curDirRepo.listPackages(true);
        if (pkgs && pkgs.length == 1) {
            return curDirRepo.resolvePackage(pkgs[0].name);
        }

        // TODO: Could we provide a default mechanism?
        if (pkgs && pkgs.length > 1) {
            log.warning("");
            log.warning("***********************************************************************************");
            log.warning(`** Found more than one .levain.yaml file in this folder. Which one should I use? => ${pkgs}`);
            log.warning("***********************************************************************************");
            log.warning("");
        }

        return undefined;
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

    get extraBinDir(): string {
        return path.resolve(this.levainSrcDir, "extra-bin", Deno.build.os);
    }

    public save(): void {
        let cfg: any = {};
        cfg.repos = this._extraRepos;
        cfg.defaultPackage = this._defaultPackage;

        let fileName = this.levainConfigFile;

        log.info(`SAVE ${fileName}`);

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
                this._extraRepos = cfg.repos;
                log.debug(`- REPOS ${this._extraRepos}`);
            }

            if (cfg.defaultPackage) {
                this._defaultPackage = cfg.defaultPackage;
                log.debug(`- DEFAULT-PACKAGE ${this._defaultPackage}`);
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

    private configHome(): void {
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

    configRepo(args: any, installedOnly: boolean): Repository {
        let repos: Repository[] = [];

        log.debug("");
        log.debug(`=== configRepo - args: ${JSON.stringify(args)} installedOnly: ${installedOnly}`);
        this.addLevainRepo(repos);
        this.addCurrentDirRepo(repos);

        if (installedOnly) {
            this.addLevainRegistryRepo(repos);
        } else {
            let savedRepos = this._extraRepos;
            this._extraRepos = [];
            log.debug(`savedRepos ${JSON.stringify(savedRepos)}`)
            this.addRepos(repos, savedRepos);
            log.debug(`args.addRepo ${JSON.stringify(args.addRepo)}`)
            this.addRepos(repos, args.addRepo);
        }

        log.debug("");
        return new CacheRepository(this,
            new ChainRepository(this, repos)
        );
    }

    private get levainSrcDir(): string {
        // https://stackoverflow.com/questions/61829367/node-js-dirname-filename-equivalent-in-deno
        return path.resolve(path.dirname(path.fromFileUrl(import.meta.url)), "../..");
    }

    private addLevainRepo(repos: Repository[]) {
        log.info(`addRepo DEFAULT ${this.levainSrcDir} --> Levain src dir`);
        repos.push(this.repoFactory.create(this.levainSrcDir));
    }

    private addLevainRegistryRepo(repos: Repository[]) {
        log.info(`addRepo DEFAULT ${this.levainRegistryDir} --> Levain registry dir`);
        repos.push(this.repoFactory.create(this.levainRegistryDir));
    }

    private addCurrentDirRepo(repos: Repository[]) {
        log.info(`addRepo DEFAULT ${Deno.cwd()} --> Current working dir`);
        repos.push(this.repoFactory.create(Deno.cwd()));
    }

    addRepos(repos: Repository[], reposPath: undefined | string[]) {
        if (!reposPath) {
            return;
        }

        log.debug(`addRepos ${reposPath.length} ${JSON.stringify(reposPath)}`)
        reposPath?.forEach(repoPath => this.addRepo(repos, repoPath));
        log.debug(`addRepos after ${reposPath.length}`)
    }

    addRepo(repos: Repository[], repoPath: string | undefined) {
        log.debug(`addRepo ${repoPath}`);

        if (!repoPath || repoPath === 'undefined') {
            return;
        }

        log.info(`addRepo ${repoPath}`);
        let repo = this.repoFactory.create(repoPath);
        if (this._extraRepos?.includes(repo.absoluteURI)) {
            log.debug(`addRepo - ignoring repeated ${repoPath}`);
        } else {
            log.debug(`addRepo ${repo.absoluteURI}`);
            repos.push(repo);
            this._extraRepos.push(repo.absoluteURI);
        }
    }
}
