import type Config from "../config.ts";
import t from "../i18n.ts";
import LogUtils from "../logger/log_utils.ts";
import type Package from "../package/package.ts";
import HomePaths from "../paths/home_paths.ts";
import StringUtils from "../utils/string_utils.ts";
import VarResolver from "../var_resolver.ts";

/**
 * Resolves `${...}` variables for `levain explain` without side effects:
 * - Never triggers interactive prompts (`askLogin`, `askPassword`, `askEmail`, `askFullName`)
 * - Never exposes secrets (`levain.password` is always replaced with a descriptive placeholder)
 * - Tracks variables defined earlier in the playbook (`setVar`, `setEnv`) in an isolated map
 * - Renders unresolved/runtime variables as human-readable placeholders instead of throwing
 */
export class PlaybookVarResolver {
  private readonly scopedVars = new Map<string, string>();
  private readonly runtimeVars = new Set<string>();

  constructor(private readonly config: Config) {}

  setScopedVar(name: string, value: string): void {
    this.scopedVars.set(name, value);
    this.runtimeVars.delete(name);
  }

  markRuntimeVar(name: string): void {
    this.runtimeVars.add(name);
    this.scopedVars.delete(name);
  }

  resolve(text: string, pkg?: Package, depth = 0): string {
    if (!text || !text.includes("${") || depth >= VarResolver.MAX_EXPANSION_DEPTH) {
      return LogUtils.hidePassword(this.config, text);
    }

    const vars = VarResolver.findVarsInText(text);
    if (vars.length === 0) {
      return LogUtils.hidePassword(this.config, text);
    }

    let result = text;
    let changed = false;

    for (const match of vars) {
      const resolved = this.resolveExpression(match.name, pkg, depth + 1);
      if (resolved !== match.text) {
        result = result.replace(match.text, () => resolved);
        changed = true;
      }
    }

    if (changed && result.includes("${") && depth + 1 < VarResolver.MAX_EXPANSION_DEPTH) {
      return this.resolve(result, pkg, depth + 1);
    }

    return LogUtils.hidePassword(this.config, result);
  }

  private resolveExpression(expr: string, pkg: Package | undefined, depth: number): string {
    const parts = expr.split("|");
    const varName = (parts.shift() ?? "").trim();
    const filters = parts.map((f) => f.trim()).filter((f) => f.length > 0);
    const hasUrlEncode = filters.includes("urlEncode");

    if (varName === "levain.password") {
      return hasUrlEncode
        ? t("cmd.explain.placeholder.passwordUrlEncoded")
        : t("cmd.explain.placeholder.password");
    }

    const raw = this.lookupVar(varName, pkg, depth);
    if (raw === undefined || raw === "") {
      return t("cmd.explain.placeholder.runtimeVar", { name: varName });
    }

    // Preserve descriptive placeholders without URL-encoding angle brackets
    if (raw.startsWith("<") && raw.endsWith(">")) {
      return hasUrlEncode
        ? t("cmd.explain.placeholder.urlEncoded", { value: raw.slice(1, -1) })
        : raw;
    }

    let value = raw;
    for (const filter of filters) {
      if (filter === "urlEncode") {
        value = StringUtils.encodeUrlComponent(value);
      }
    }
    return value;
  }

  private lookupVar(varName: string, pkg: Package | undefined, depth: number): string | undefined {
    if (varName.startsWith("levain.")) {
      switch (varName) {
        case "levain.login":
          return this.config.login || t("cmd.explain.placeholder.login");
        case "levain.email":
          return this.config.email || t("cmd.explain.placeholder.email");
        case "levain.fullname":
          return this.config.fullname || t("cmd.explain.placeholder.fullname");
        case "levain.homeDir":
          return this.config.configPaths.levainHome;
        case "levain.cacheDir":
          return this.config.configPaths.levainCacheDir;
        default:
          return undefined;
      }
    }

    if (varName === "home") {
      try {
        return HomePaths.homedir();
      } catch {
        return undefined;
      }
    }

    if (varName === "levainHome") {
      return this.config.configPaths.levainHome;
    }

    const pkgRefMatch = varName.match(/^pkg\.(.+)\.([^.]*)$/);
    if (pkgRefMatch) {
      const targetPkg = this.config.packageManager.package(pkgRefMatch[1]);
      if (targetPkg) {
        return this.lookupPackageAttr(targetPkg, pkgRefMatch[2], depth);
      }
      return undefined;
    }

    if (this.runtimeVars.has(varName)) {
      return undefined;
    }

    if (this.scopedVars.has(varName)) {
      return this.scopedVars.get(varName);
    }

    if (pkg) {
      const fromPkg = this.lookupPackageAttr(pkg, varName, depth);
      if (fromPkg !== undefined && fromPkg !== "") {
        return fromPkg;
      }
    }

    const fromConfig = this.config.getVar(varName);
    if (fromConfig) {
      return fromConfig;
    }

    const fromEnv = Deno.env.get(varName);
    if (fromEnv) {
      return fromEnv;
    }

    const fromDefault = this.config.getVar(`levain.var.default.${varName}`);
    if (fromDefault) {
      return fromDefault;
    }

    return undefined;
  }

  private lookupPackageAttr(pkg: Package, attr: string, depth: number): string | undefined {
    let raw: unknown;
    switch (attr) {
      case "baseDir":
        raw = pkg.baseDir;
        break;
      case "pkgDir":
        raw = pkg.pkgDir;
        break;
      case "name":
        raw = pkg.name;
        break;
      case "version":
        raw = pkg.version?.versionNumber;
        break;
      default: {
        raw = pkg.yamlItem(attr);
        if (raw === undefined || raw === null) {
          const pkgConfig = pkg.yamlItem("config");
          if (pkgConfig && typeof pkgConfig === "object") {
            raw = pkgConfig[attr];
          }
        }
        break;
      }
    }

    if (raw === undefined || raw === null) {
      return undefined;
    }

    const strVal = String(raw);
    if (strVal.includes("${")) {
      return this.resolve(strVal, pkg, depth + 1);
    }
    return strVal;
  }
}
