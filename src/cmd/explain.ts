import t from "../lib/i18n.ts";

import type Config from "../lib/config.ts";
import OsUtils from "../lib/os/os_utils.ts";
import { parseArgs } from "../lib/parse_args.ts";
import type Package from "../lib/package/package.ts";
import PackageManager from "../lib/package/package_manager.ts";
import { findDefinedActionPlatforms, resolvePackageActions } from "../lib/package/package_actions.ts";
import { explainActionLine } from "../lib/explain/action_explainer.ts";
import { PlaybookVarResolver } from "../lib/explain/playbook_resolver.ts";
import {
  buildLevainFinalCleanupSteps,
  buildPackageUninstallPlan,
  findInstalledDependents,
  orderPackagesForUninstall,
} from "../lib/explain/uninstall_explainer.ts";

import type Command from "./command.ts";

export default class ExplainCommand implements Command {
  constructor(private config: Config) {}

  async execute(args: string[]): Promise<void> {
    const markdown = await this.render(args);
    console.log(markdown);
  }

  async render(args: string[]): Promise<string> {
    const myArgs = parseArgs(args, {
      boolean: ["raw", "uninstall"],
      stopEarly: false,
    });

    const rawMode = Boolean(myArgs.raw);
    const uninstallMode = Boolean(myArgs.uninstall);
    const explicitArgs: string[] = [...(myArgs._ ?? [])];

    if (uninstallMode) {
      if (rawMode) {
        throw new Error(t("cmd.explain.uninstall.rawConflict"));
      }
      return this.renderUninstall(explicitArgs);
    }

    let pkgNames: string[] = [...explicitArgs];
    let curDirPkg: Package | undefined;

    if (pkgNames.length === 0) {
      curDirPkg = await this.config.repositoryManager.currentDirPackage();
      if (curDirPkg && curDirPkg.dependencies && curDirPkg.dependencies.length > 0) {
        const declaredDeps = curDirPkg.yamlItem("dependencies");
        pkgNames = Array.isArray(declaredDeps)
          ? [...declaredDeps]
          : curDirPkg.dependencies.filter((dep) => dep !== "levain");
      }
    }

    const projectShell = curDirPkg ? resolvePackageActions(curDirPkg, "cmd.shell") : [];
    const projectEnv = curDirPkg ? resolvePackageActions(curDirPkg, "cmd.env") : [];
    const hasProjectActions = projectShell.length > 0 || projectEnv.length > 0;

    if (pkgNames.length === 0 && !hasProjectActions) {
      throw new Error(t("cmd.explain.noPackages"));
    }

    let visiblePkgs: Package[] = [];
    if (pkgNames.length > 0) {
      const explicitlyRequestedLevain = explicitArgs.includes("levain") || pkgNames.includes("levain");
      const pkgs: Package[] | null = this.config.packageManager.resolvePackages(pkgNames, false, false);
      if (!pkgs) {
        const missing = pkgNames.filter((name) => !this.config.packageManager.getSimilarNames(name).has(name));
        if (missing.length > 0) {
          console.error("");
          console.error(t("cmd.install.unableToFind", { pkgNames: missing.join(", ") }));

          const suggestionLines: string[] = [];
          for (const name of missing) {
            const suggestions = [...this.config.packageManager.getSimilarNames(name)].filter((s) => s !== name);
            if (suggestions.length > 0) {
              suggestionLines.push(`${name} => ${suggestions.join(", ")}`);
            }
          }
          if (suggestionLines.length > 0) {
            console.error("");
            console.error(t("cmd.install.similar"));
            for (const line of suggestionLines) {
              console.error(line);
            }
          }
          console.error("");
          throw new Error(t("cmd.explain.errorNotFound", { pkgNames: missing.join(", ") }));
        }

        const errMsg = t("cmd.explain.errorMissingDep", { pkgNames: pkgNames.join(", ") });
        console.error("");
        console.error(errMsg);
        console.error("");
        throw new Error(errMsg);
      }

      // Omit the implicit `levain` engine dependency unless the user explicitly asked for it.
      visiblePkgs = explicitlyRequestedLevain
        ? pkgs
        : pkgs.filter((pkg) => pkg.name !== "levain");
    }

    const titlePackages = pkgNames.length > 0 ? pkgNames.join(", ") : curDirPkg!.name;
    const lines: string[] = [];

    if (rawMode) {
      lines.push(`# ${t("cmd.explain.rawTitle", { packages: titlePackages })}`);
    } else {
      lines.push(`# ${t("cmd.explain.title", { packages: titlePackages })}`);
      lines.push("");
      lines.push(t("cmd.explain.subtitle"));
    }

    lines.push("");
    if (visiblePkgs.length > 0) {
      const orderSummary = visiblePkgs
        .map((pkg, idx) => `${idx + 1}. ${pkg.name}${pkg.version ? `@${pkg.version}` : ""}`)
        .join(" → ");
      lines.push(`- ${t("cmd.explain.order", { order: orderSummary })}`);
    }
    lines.push(`- ${t("cmd.explain.baseDir", { dir: this.config.configPaths.levainHome })}`);

    const resolver = new PlaybookVarResolver(this.config);

    visiblePkgs.forEach((pkg, index) => {
      lines.push("");
      lines.push("---");
      lines.push("");
      this.appendPackageSection(lines, pkg, index + 1, rawMode, resolver);
    });

    if (curDirPkg && hasProjectActions) {
      lines.push("");
      lines.push("---");
      lines.push("");
      lines.push(`## ${t("cmd.explain.sectionProject", { name: curDirPkg.name })}`);
      if (projectShell.length > 0) {
        this.appendActionSubsection(
          lines,
          curDirPkg,
          t("cmd.explain.sectionShell"),
          projectShell,
          rawMode,
          resolver,
          true,
        );
      }
      if (projectEnv.length > 0) {
        this.appendActionSubsection(
          lines,
          curDirPkg,
          t("cmd.explain.sectionEnv"),
          projectEnv,
          rawMode,
          resolver,
          false,
        );
      }
    }

    return lines.join("\n");
  }

  private appendPackageSection(
    lines: string[],
    pkg: Package,
    stepIndex: number,
    rawMode: boolean,
    resolver: PlaybookVarResolver,
  ): void {
    const status = !pkg.installed
      ? t("cmd.explain.statusNotInstalled")
      : pkg.updateAvailable
      ? t("cmd.explain.statusUpdateAvailable")
      : t("cmd.explain.statusInstalled");

    const header = pkg.version
      ? t("cmd.explain.stepHeader", { index: stepIndex, name: pkg.name, version: pkg.version, status })
      : t("cmd.explain.stepHeaderNoVersion", { index: stepIndex, name: pkg.name, status });
    lines.push(`## ${header}`);
    lines.push("");
    lines.push(`- ${t("cmd.explain.recipeSource", { path: pkg.filePath })}`);
    if (!pkg.skipInstallDir()) {
      lines.push(`- ${t("cmd.explain.installDir", { dir: pkg.baseDir })}`);
    }

    const installActions = resolvePackageActions(pkg, "cmd.install");
    const shellActions = resolvePackageActions(pkg, "cmd.shell");
    const envActions = resolvePackageActions(pkg, "cmd.env");

    const effectiveInstallActions = [...installActions];
    if (!rawMode && !pkg.skipInstallDir() && effectiveInstallActions.length > 0) {
      const createsBaseDir = effectiveInstallActions[0].trim().startsWith("mkdir ");
      if (!createsBaseDir) {
        effectiveInstallActions.unshift("mkdir ${baseDir}");
      }
    }

    if (effectiveInstallActions.length === 0 && shellActions.length === 0 && envActions.length === 0) {
      lines.push("");
      const otherPlatforms = findDefinedActionPlatforms(pkg, ["cmd.install", "cmd.shell", "cmd.env"]);
      if (otherPlatforms.length > 0) {
        lines.push(t("cmd.explain.otherOsOnly", { os: OsUtils.getOs(), platforms: otherPlatforms.join(", ") }));
      } else {
        lines.push(t("cmd.explain.noSteps"));
      }
      return;
    }

    if (effectiveInstallActions.length > 0) {
      this.appendActionSubsection(
        lines,
        pkg,
        t("cmd.explain.sectionInstall"),
        effectiveInstallActions,
        rawMode,
        resolver,
        true,
      );
    }

    if (shellActions.length > 0) {
      this.appendActionSubsection(
        lines,
        pkg,
        t("cmd.explain.sectionShell"),
        shellActions,
        rawMode,
        resolver,
        true,
      );
    }

    if (envActions.length > 0) {
      this.appendActionSubsection(
        lines,
        pkg,
        t("cmd.explain.sectionEnv"),
        envActions,
        rawMode,
        resolver,
        false,
      );
    }
  }

  private appendActionSubsection(
    lines: string[],
    pkg: Package,
    title: string,
    actions: string[],
    rawMode: boolean,
    resolver: PlaybookVarResolver,
    numbered: boolean,
  ): void {
    lines.push("");
    lines.push(`### ${title}`);
    lines.push("");
    actions.forEach((rawLine, idx) => {
      const prefix = numbered ? `${idx + 1}.` : "-";
      if (rawMode) {
        lines.push(`${prefix} \`${rawLine}\``);
      } else {
        const explained = explainActionLine(pkg, rawLine, resolver);
        lines.push(`${prefix} ${explained.text}`);
      }
    });
  }

  private renderUninstall(explicitArgs: string[]): string {
    const installedRepo = this.config.repositoryManager.repositoryInstalled;
    const regularRepo = this.config.repositoryManager.repository;
    const installedPackages = installedRepo.listPackages();

    const fullCleanup = explicitArgs.length === 0;
    let targetPackages: Package[] = [];

    if (fullCleanup) {
      if (installedPackages.length === 0) {
        throw new Error(t("cmd.explain.uninstall.noInstalled"));
      }
      targetPackages = orderPackagesForUninstall(installedPackages);
    } else {
      const requestedNames = [...explicitArgs];
      PackageManager.removeExtension(requestedNames);

      const missing: string[] = [];
      const seen = new Set<string>();
      for (const name of requestedNames) {
        if (seen.has(name)) continue;
        seen.add(name);
        const pkg = installedRepo.resolvePackage(name) ?? regularRepo.resolvePackage(name);
        if (!pkg) {
          missing.push(name);
        } else {
          targetPackages.push(pkg);
        }
      }

      if (missing.length > 0) {
        console.error("");
        console.error(t("cmd.install.unableToFind", { pkgNames: missing.join(", ") }));

        const suggestionLines: string[] = [];
        for (const name of missing) {
          const installedSuggestions = [...this.config.packageManager.getSimilarNames(name, true)];
          const regularSuggestions = [...this.config.packageManager.getSimilarNames(name, false)];
          const suggestions = [...new Set([...installedSuggestions, ...regularSuggestions])].filter((s) => s !== name);
          if (suggestions.length > 0) {
            suggestionLines.push(`${name} => ${suggestions.join(", ")}`);
          }
        }
        if (suggestionLines.length > 0) {
          console.error("");
          console.error(t("cmd.install.similar"));
          for (const line of suggestionLines) {
            console.error(line);
          }
        }
        console.error("");
        throw new Error(t("cmd.explain.errorNotFound", { pkgNames: missing.join(", ") }));
      }

      targetPackages = orderPackagesForUninstall(targetPackages);
    }

    const includesLevain = fullCleanup || targetPackages.some((pkg) => pkg.name === "levain");
    const title = fullCleanup
      ? t("cmd.explain.uninstall.titleAll")
      : t("cmd.explain.uninstall.title", { packages: targetPackages.map((pkg) => pkg.name).join(", ") });

    const lines: string[] = [];
    lines.push(`# ${title}`);
    lines.push("");
    lines.push(t("cmd.explain.uninstall.subtitle"));
    lines.push("");

    const orderSummary = targetPackages
      .map((pkg, idx) => `${idx + 1}. ${pkg.name}${pkg.version ? `@${pkg.version}` : ""}`)
      .join(" → ");
    lines.push(`- ${t("cmd.explain.uninstall.order", { order: orderSummary })}`);
    lines.push(`- ${t("cmd.explain.baseDir", { dir: this.config.configPaths.levainHome })}`);

    if (OsUtils.isWindows()) {
      lines.push("");
      lines.push(`> ${t("cmd.explain.uninstall.windowsShellNote")}`);
    }

    if (!fullCleanup) {
      const targetSet = new Set(targetPackages.map((pkg) => pkg.name));
      const dependents = findInstalledDependents(installedPackages, targetSet);
      const otherInstalled = installedPackages
        .filter((pkg) => !targetSet.has(pkg.name))
        .map((pkg) => pkg.name)
        .sort();

      if (includesLevain && otherInstalled.length > 0) {
        lines.push("");
        lines.push(
          `> ${t("cmd.explain.uninstall.levainFullRemovalWarning", {
            packages: otherInstalled.map((name) => `\`${name}\``).join(", "),
          })}`,
        );
      } else if (dependents.size > 0) {
        lines.push("");
        for (const [depName, users] of dependents.entries()) {
          lines.push(
            `> ${t("cmd.explain.uninstall.dependentWarning", {
              pkg: depName,
              dependents: users.map((u) => `\`${u}\``).join(", "),
            })}`,
          );
        }
      }
    }

    const resolver = new PlaybookVarResolver(this.config);

    targetPackages.forEach((pkg, index) => {
      lines.push("");
      lines.push("---");
      lines.push("");

      const status = pkg.installed
        ? t("cmd.explain.uninstall.statusInstalled")
        : t("cmd.explain.statusNotInstalled");
      const header = pkg.version
        ? t("cmd.explain.stepHeader", { index: index + 1, name: pkg.name, version: pkg.version, status })
        : t("cmd.explain.stepHeaderNoVersion", { index: index + 1, name: pkg.name, status });
      lines.push(`## ${header}`);
      lines.push("");
      lines.push(`- ${t("cmd.explain.recipeSource", { path: pkg.filePath })}`);
      if (!pkg.skipInstallDir()) {
        lines.push(`- ${t("cmd.explain.installDir", { dir: pkg.baseDir })}`);
      }

      const plan = buildPackageUninstallPlan(pkg, this.config, resolver, { fullCleanup: includesLevain });

      if (plan.steps.length === 0 && plan.manualReview.length === 0) {
        lines.push("");
        if (plan.otherOsOnly.length > 0) {
          lines.push(
            t("cmd.explain.otherOsOnly", { os: OsUtils.getOs(), platforms: plan.otherOsOnly.join(", ") }),
          );
        } else {
          lines.push(t("cmd.explain.uninstall.noSteps"));
        }
        return;
      }

      if (plan.steps.length > 0) {
        lines.push("");
        lines.push(`### ${t("cmd.explain.uninstall.sectionSteps")}`);
        lines.push("");
        plan.steps.forEach((step, idx) => {
          lines.push(`${idx + 1}. ${step}`);
        });
      }

      if (plan.manualReview.length > 0) {
        lines.push("");
        lines.push(`### ${t("cmd.explain.uninstall.sectionReview")}`);
        lines.push("");
        for (const item of plan.manualReview) {
          lines.push(`- ${item}`);
        }
      }
    });

    if (includesLevain) {
      lines.push("");
      lines.push("---");
      lines.push("");
      lines.push(`## ${t("cmd.explain.uninstall.sectionFinalCleanup")}`);
      lines.push("");
      const finalSteps = buildLevainFinalCleanupSteps(this.config);
      finalSteps.forEach((step, idx) => {
        lines.push(`${idx + 1}. ${step}`);
      });
    }

    return lines.join("\n");
  }

  readonly oneLineExample = t("cmd.explain.example");
}
