import * as log from "@std/log";

import LevainVersion from "../levain_version.ts";
import t from "../lib/i18n.ts";

import type Config from "../lib/config.ts";
import type Package from "../lib/package/package.ts";
import PackageManager from "../lib/package/package_manager.ts";
import { parseArgs } from "../lib/parse_args.ts";

import type Command from "./command.ts";

export interface PackageInfoJson {
  name: string;
  exists: boolean;
  installed: boolean;
  version: string | null;
  installedVersion: string | null;
  updateAvailable: boolean;
  baseDir: string | null;
  pkgDir: string | null;
  repo: string | null;
  filePath: string | null;
  dependencies: string[];
}

export interface InfoJsonOutput {
  levain: {
    version: string;
    denoVersion: string;
    levainHome: string;
    installed: boolean;
    updateAvailable: boolean;
    baseDir: string | null;
  };
  packages: PackageInfoJson[];
  installationOrder: string[] | null;
}

export default class InfoCommand implements Command {
  constructor(private config: Config) {
  }

  // deno-lint-ignore require-await
  async execute(args: string[]) {
    const myArgs = parseArgs(args, {
      boolean: [
        "verbose",
        "json",
      ],
      stopEarly: false,
    });

    if (myArgs.json) {
      const output = this.buildJsonOutput(myArgs._ ?? []);
      console.log(JSON.stringify(output, null, 2));
      return;
    }

    let pkgs: Package[] | null = null;
    if (myArgs._ && myArgs._.length > 0) {
      const pkgNames: string[] = myArgs._;

      pkgs = this.config.packageManager.resolvePackages(pkgNames, false, false);
      if (!pkgs) {
        this.config.packageManager.resolvePackages(["levain"], false, false);
      }

      log.info("");
      log.info(t("cmd.info.yourPackages"));
      pkgNames.forEach((pkg) => this.showPackage(myArgs, 0, pkg, new Set()));
    } else {
      this.config.packageManager.resolvePackages(["levain"], false, false);
    }

    log.info("");
    log.info("=== Levain");
    this.showPackage(myArgs, 0, "levain", new Set());

    if (pkgs) {
      log.info("");
      log.info(t("cmd.info.installationOrder"));
      pkgs.forEach((pkg) => log.info(pkg.name));
    }
  }

  buildJsonOutput(rawPkgNames: string[]): InfoJsonOutput {
    const pkgNames = [...rawPkgNames];
    PackageManager.removeExtension(pkgNames);

    let resolvedOrder: Package[] | null = null;
    if (pkgNames.length > 0) {
      resolvedOrder = this.config.packageManager.resolvePackages([...pkgNames], false, false);
      if (!resolvedOrder) {
        this.config.packageManager.resolvePackages(["levain"], false, false);
      }
    } else {
      this.config.packageManager.resolvePackages(["levain"], false, false);
    }

    const levainPkg = this.config.packageManager.package("levain") ??
      this.config.repositoryManager.repository.resolvePackage("levain") ??
      this.config.repositoryManager.repositoryInstalled.resolvePackage("levain");

    const packages = pkgNames.map((pkgName) => this.describePackageJson(pkgName));

    return {
      levain: {
        version: LevainVersion.levainVersion.versionNumber,
        denoVersion: Deno.version.deno,
        levainHome: this.config.configPaths.levainHome,
        installed: Boolean(levainPkg?.installed),
        updateAvailable: Boolean(levainPkg?.installed && levainPkg.updateAvailable),
        baseDir: levainPkg?.baseDir ?? null,
      },
      packages,
      installationOrder: resolvedOrder ? resolvedOrder.map((pkg) => pkg.name) : null,
    };
  }

  private describePackageJson(pkgName: string): PackageInfoJson {
    const repoPkg = this.config.packageManager.package(pkgName) ??
      this.config.repositoryManager.repository.resolvePackage(pkgName);
    const installedPkg = this.config.repositoryManager.repositoryInstalled.resolvePackage(pkgName);

    if (repoPkg) {
      const installed = Boolean(repoPkg.installed || installedPkg);
      const installedVersion = installedPkg?.version?.versionNumber ??
        (repoPkg.installed ? (repoPkg.version?.versionNumber ?? null) : null);

      return {
        name: repoPkg.name,
        exists: true,
        installed,
        version: repoPkg.version?.versionNumber ?? null,
        installedVersion,
        updateAvailable: Boolean(repoPkg.installed && repoPkg.updateAvailable),
        baseDir: repoPkg.baseDir ?? null,
        pkgDir: repoPkg.pkgDir ?? null,
        repo: repoPkg.repo?.name ?? null,
        filePath: repoPkg.filePath ?? null,
        dependencies: repoPkg.dependencies ? [...repoPkg.dependencies] : [],
      };
    }

    if (installedPkg) {
      return {
        name: installedPkg.name,
        exists: false,
        installed: true,
        version: null,
        installedVersion: installedPkg.version?.versionNumber ?? null,
        updateAvailable: false,
        baseDir: installedPkg.baseDir ?? null,
        pkgDir: installedPkg.pkgDir ?? null,
        repo: installedPkg.repo?.name ?? null,
        filePath: installedPkg.filePath ?? null,
        dependencies: installedPkg.dependencies ? [...installedPkg.dependencies] : [],
      };
    }

    return {
      name: pkgName,
      exists: false,
      installed: false,
      version: null,
      installedVersion: null,
      updateAvailable: false,
      baseDir: null,
      pkgDir: null,
      repo: null,
      filePath: null,
      dependencies: [],
    };
  }

  showPackage(args: any, level: number, pkgName: string, visited: Set<string> = new Set()) {
    if (pkgName == "levain" && level != 0) {
      return;
    }
    if (visited.has(pkgName)) {
      return;
    }

    const ident = "  ".repeat(level);
    const pkg: Package | undefined = this.config.packageManager.package(pkgName) ??
      this.config.repositoryManager.repository.resolvePackage(pkgName);

    if (!pkg) {
      log.info("");
      log.info(t("cmd.info.packageNotFound", { pkgName: pkgName }));
      const similar = [...this.config.packageManager.getSimilarNames(pkgName)];
      if (similar.length > 0) {
        log.info(`${t("cmd.install.similar")}: ${similar.join(", ")}`);
      }
      return;
    }

    log.info(
      `${ident}+ ${pkg.name} - ${pkg.version}${pkg.installed ? "" : t("cmd.info.notInstalled")}${
        pkg.installed && pkg.updateAvailable ? t("cmd.info.needUpdate") : ""
      }`,
    );
    if (args.verbose) {
      log.info(`${ident}| baseDir...: ${pkg.baseDir}`);
      log.info(`${ident}| pkgDir....: ${pkg.pkgDir}`);
      log.info(`${ident}| repo......: ${pkg.repo?.name}`);
      log.info(`${ident}\\ filePath..: ${pkg.filePath}`);
    }

    const nextVisited = new Set(visited);
    nextVisited.add(pkgName);
    pkg.dependencies?.forEach((dep) => this.showPackage(args, level + 1, dep, nextVisited));
  }

  readonly oneLineExample = t("cmd.info.example");
}
