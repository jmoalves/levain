import * as path from "@std/path";

// Paths based on levainHome configuration (pure path resolution; callers create directories on write)
export default class ConfigPaths {

  private _levainBackupDir: string | undefined;
  private _levainCacheDir: string | undefined;

  constructor(public levainHome: string) { }

  get levainBaseDir(): string {
    return path.resolve(this.levainHome, "levain");
  }

  get levainConfigDir(): string {
    return path.resolve(this.levainHome, ".levain");
  }

  get oldLevainConfigFile(): string {
    return path.resolve(this.levainConfigDir, "config.json");
  }

  get levainRegistryDir(): string {
    return path.resolve(this.levainConfigDir, "registry");
  }

  get levainSafeTempDir(): string {
    return path.resolve(this.levainConfigDir, "temp");
  }

  set levainBackupDir(dir: string) {
    this._levainBackupDir = dir;
  }

  get levainBackupDir(): string {
    if (!this._levainBackupDir) {
      this._levainBackupDir = path.resolve(this.levainConfigDir, "backup");
    }
    return this._levainBackupDir;
  }

  set levainCacheDir(dir: string) {
    this._levainCacheDir = dir;
  }

  get levainCacheDir(): string {
    if (!this._levainCacheDir) {
      this._levainCacheDir = path.resolve(this.levainHome, ".levainCache");
    }
    return this._levainCacheDir;
  }

  get levainHookPath(): string {
    return path.join(this.levainConfigDir, "levain-hook.cmd");
  }

  get levainLockPath(): string {
    return path.join(this.levainConfigDir, "levain.lock");
  }
}
