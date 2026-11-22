import * as path from "@std/path";
import { ensureDirSync } from "@std/fs";

// Paths based on levainHome configuration
export default class ConfigPaths {

  private _levainBackupDir: string | undefined;
  private _levainCacheDir: string | undefined;

  constructor(public levainHome: string) { }

  get levainBaseDir(): string {
    return path.resolve(this.levainHome, "levain");
  }

  get levainConfigDir(): string {
    const dir = path.resolve(this.levainHome, ".levain");
    ensureDirSync(dir);
    return dir;
  }

  get oldLevainConfigFile(): string {
    return path.resolve(this.levainConfigDir, "config.json");
  }

  get levainRegistryDir(): string {
    const dir = path.resolve(this.levainConfigDir, "registry");
    ensureDirSync(dir);
    return dir;
  }

  get levainSafeTempDir(): string {
    const dir = path.resolve(this.levainConfigDir, "temp");
    ensureDirSync(dir);
    return dir;
  }

  set levainBackupDir(dir: string) {
    this._levainBackupDir = dir;
  }

  get levainBackupDir(): string {
    if (!this._levainBackupDir) {
      this._levainBackupDir = path.resolve(this.levainConfigDir, "backup");
    }
    ensureDirSync(this._levainBackupDir);
    return this._levainBackupDir;
  }

  set levainCacheDir(dir: string) {
    this._levainCacheDir = dir;
  }

  get levainCacheDir(): string {
    if (!this._levainCacheDir) {
      this._levainCacheDir = path.resolve(this.levainHome, ".levainCache");
    }
    ensureDirSync(this._levainCacheDir);
    return this._levainCacheDir;
  }

  get levainHookPath(): string {
    return path.join(this.levainConfigDir, "levain-hook.cmd");
  }
}
