import * as path from "@std/path";

import { FileUtils } from "../fs/file_utils.ts";
import t from "../i18n.ts";
import type Package from "../package/package.ts";
import { parseArgs, tokenizeArgs } from "../parse_args.ts";
import type { PlaybookVarResolver } from "./playbook_resolver.ts";

export interface ExplainedStep {
  readonly text: string;
  readonly raw: string;
  readonly action: string;
}

function resolveMaybePath(baseDir: string | undefined, value: string): string {
  if (!value || value.includes("<") || !FileUtils.isFileSystemUrl(value)) {
    return value;
  }
  return baseDir ? path.resolve(baseDir, value) : path.resolve(value);
}

function normalizeAbsolutePath(value: string): string {
  if (!value || value.includes("<") || !FileUtils.isFileSystemUrl(value)) {
    return value;
  }
  return path.isAbsolute(value) ? path.normalize(value) : value;
}

function quoteShellArg(arg: string): string {
  if (/\s/.test(arg) && !(arg.startsWith('"') && arg.endsWith('"'))) {
    return `"${arg.replace(/"/g, '\\"')}"`;
  }
  return arg;
}

function formatCodeList(items: string[]): string {
  return items.map((item) => `\`${item}\``).join(", ");
}

/**
 * Translates a single recipe action line into a clear, human-readable manual instruction
 * so a user can execute the setup themselves without running Levain.
 */
export function explainActionLine(
  pkg: Package | undefined,
  rawLine: string,
  resolver: PlaybookVarResolver,
): ExplainedStep {
  const tokens = tokenizeArgs(rawLine);
  const action = tokens.shift() ?? "";
  if (!action) {
    return { action: "", raw: rawLine, text: rawLine };
  }

  const resolvedArgs = tokens.map((token) => resolver.resolve(token, pkg));
  const fallback = () => t("cmd.explain.step.fallback", { line: [action, ...resolvedArgs].join(" ") });

  try {
    const text = translateAction(action, resolvedArgs, pkg, resolver) ?? fallback();
    return { action, raw: rawLine, text };
  } catch {
    return { action, raw: rawLine, text: fallback() };
  }
}

function translateAction(
  action: string,
  args: string[],
  pkg: Package | undefined,
  resolver: PlaybookVarResolver,
): string | undefined {
  switch (action) {
    case "mkdir": {
      const parsed = parseArgs(args, { boolean: ["compact"], stopEarly: false });
      const target = parsed._[0];
      if (!target) return undefined;
      const dir = resolveMaybePath(pkg?.baseDir, target);
      return parsed.compact
        ? t("cmd.explain.step.mkdirCompact", { dir })
        : t("cmd.explain.step.mkdir", { dir });
    }

    case "copy": {
      const parsed = parseArgs(args, { boolean: ["verbose", "strip", "ifNotExists"], stopEarly: false });
      if (parsed._.length < 2) return undefined;
      const items: string[] = [...parsed._];
      const dstRaw = items.pop()!;
      const dst = resolveMaybePath(pkg?.baseDir, dstRaw);
      const sources = items.map((src) => resolveMaybePath(pkg?.pkgDir, src));
      const allUrls = sources.every((src) => !FileUtils.isFileSystemUrl(src));
      const srcList = formatCodeList(sources);
      const notes: string[] = [];
      if (parsed.strip) notes.push(t("cmd.explain.step.noteStripDir"));
      if (parsed.ifNotExists) notes.push(t("cmd.explain.step.noteIfNotExists"));
      const suffix = notes.length > 0 ? ` (${notes.join("; ")})` : "";
      return allUrls
        ? t("cmd.explain.step.download", { src: srcList, dst, suffix })
        : t("cmd.explain.step.copy", { src: srcList, dst, suffix });
    }

    case "extract": {
      const parsed = parseArgs(args, { boolean: ["strip"], stringOnce: ["type"], stopEarly: false });
      if (parsed._.length < 2) return undefined;
      const src = resolveMaybePath(pkg?.pkgDir, parsed._[0]);
      const dst = resolveMaybePath(pkg?.baseDir, parsed._[1]);
      const isRemote = !FileUtils.isFileSystemUrl(src);
      const stripNote = parsed.strip ? ` (${t("cmd.explain.step.noteStripArchive")})` : "";
      return isRemote
        ? t("cmd.explain.step.downloadAndExtract", { src, dst, suffix: stripNote })
        : t("cmd.explain.step.extract", { src, dst, suffix: stripNote });
    }

    case "clone": {
      const parsed = parseArgs(args, {});
      if (parsed._.length < 2) return undefined;
      const [rawUrl, dstRaw] = parsed._;
      const dst = resolveMaybePath(pkg?.baseDir, dstRaw);
      const hashIdx = rawUrl.indexOf("#");
      if (hashIdx > 0) {
        const url = rawUrl.slice(0, hashIdx);
        const branch = rawUrl.slice(hashIdx + 1);
        return t("cmd.explain.step.cloneBranch", { url, branch, dst });
      }
      return t("cmd.explain.step.clone", { url: rawUrl, dst });
    }

    case "addPath": {
      const parsed = parseArgs(args, { boolean: ["permanent"], stopEarly: false });
      const rawDir = parsed._[0];
      if (!rawDir) return undefined;
      const dir = resolveMaybePath(pkg?.baseDir, rawDir);
      return parsed.permanent
        ? t("cmd.explain.step.addPathPermanent", { dir })
        : t("cmd.explain.step.addPath", { dir });
    }

    case "setEnv": {
      const parsed = parseArgs(args, { boolean: ["permanent"] });
      if (parsed._.length < 2) return undefined;
      const [key, value] = parsed._;
      resolver.setScopedVar(key, value);
      return parsed.permanent
        ? t("cmd.explain.step.setEnvPermanent", { key, value })
        : t("cmd.explain.step.setEnv", { key, value });
    }

    case "setVar": {
      if (args.length < 2) return undefined;
      const [name, value] = args;
      resolver.setScopedVar(name, value);
      return t("cmd.explain.step.setVar", { name, value });
    }

    case "levainShell": {
      const parsed = parseArgs(args, {
        stringOnce: ["saveVar"],
        boolean: ["stripCRLF", "ignoreErrors"],
      });
      if (parsed._.length === 0) return undefined;
      const command = parsed._.map((token: string) => quoteShellArg(token)).join(" ");
      if (parsed.saveVar) {
        resolver.markRuntimeVar(parsed.saveVar);
        return t("cmd.explain.step.runCommandSaveVar", { command, varName: parsed.saveVar });
      }
      return parsed.ignoreErrors
        ? t("cmd.explain.step.runCommandIgnoreErrors", { command })
        : t("cmd.explain.step.runCommand", { command });
    }

    case "template": {
      const parsed = parseArgs(args, {
        stringMany: ["replace", "with"],
        boolean: ["doubleBackslash"],
      });
      if (parsed._.length < 2) return undefined;
      const src = resolveMaybePath(pkg?.pkgDir, parsed._[0]);
      const dst = resolveMaybePath(pkg?.baseDir, parsed._[1]);
      const pairs: string[] = [];
      const count = Math.min(parsed.replace?.length ?? 0, parsed.with?.length ?? 0);
      for (let i = 0; i < count; i++) {
        let replacement: string = parsed.with[i];
        if (parsed.doubleBackslash) {
          replacement = replacement
            .replace(/\//g, "\\")
            .replace(/\\([^\\])/g, "\\\\$1");
        }
        pairs.push(`\`${parsed.replace[i]}\` → \`${replacement}\``);
      }
      const replacements = pairs.length > 0 ? pairs.join(", ") : "-";
      return t("cmd.explain.step.template", { src, dst, replacements });
    }

    case "jsonSet": {
      const parsed = parseArgs(args, { boolean: ["ifNotExists"] });
      if (parsed._.length < 3) return undefined;
      const [rawFile, property, value] = parsed._;
      const file = normalizeAbsolutePath(rawFile);
      return parsed.ifNotExists
        ? t("cmd.explain.step.jsonSetIfNotExists", { file, property, value })
        : t("cmd.explain.step.jsonSet", { file, property, value });
    }

    case "jsonGet": {
      const parsed = parseArgs(args, { stringOnce: ["setVar", "default"], stopEarly: false });
      if (!parsed.setVar || parsed._.length < 2) return undefined;
      resolver.markRuntimeVar(parsed.setVar);
      const [rawFile, property] = parsed._;
      const file = normalizeAbsolutePath(rawFile);
      const suffix = parsed.default !== undefined
        ? ` (${t("cmd.explain.step.noteDefault", { value: parsed.default })})`
        : "";
      return t("cmd.explain.step.jsonGet", { file, property, varName: parsed.setVar, suffix });
    }

    case "jsonRemove": {
      const parsed = parseArgs(args, { stopEarly: true });
      if (parsed._.length < 2) return undefined;
      const [rawFile, property] = parsed._;
      const file = normalizeAbsolutePath(rawFile);
      return t("cmd.explain.step.jsonRemove", { file, property });
    }

    case "propertySet": {
      const parsed = parseArgs(args, { boolean: ["ifNotExists"] });
      if (parsed._.length < 3) return undefined;
      const [rawFile, property, value] = parsed._;
      const file = normalizeAbsolutePath(rawFile);
      return parsed.ifNotExists
        ? t("cmd.explain.step.propertySetIfNotExists", { file, property, value })
        : t("cmd.explain.step.propertySet", { file, property, value });
    }

    case "propertyGet": {
      const parsed = parseArgs(args, { stringOnce: ["setVar", "default"], stopEarly: false });
      if (!parsed.setVar || parsed._.length < 2) return undefined;
      resolver.markRuntimeVar(parsed.setVar);
      const [rawFile, property] = parsed._;
      const file = normalizeAbsolutePath(rawFile);
      const suffix = parsed.default !== undefined
        ? ` (${t("cmd.explain.step.noteDefault", { value: parsed.default })})`
        : "";
      return t("cmd.explain.step.propertyGet", { file, property, varName: parsed.setVar, suffix });
    }

    case "mavenCopy": {
      const parsed = parseArgs(args, { boolean: ["ifNotExists"], stopEarly: false });
      if (parsed._.length < 2) return undefined;
      const [coordinates, dstRaw] = parsed._;
      const dst = resolveMaybePath(pkg?.baseDir, dstRaw);
      const suffix = parsed.ifNotExists ? ` (${t("cmd.explain.step.noteIfNotExists")})` : "";
      return t("cmd.explain.step.mavenCopy", { coordinates, dst, suffix });
    }

    case "backupFile": {
      const rawFile = args[0];
      if (!rawFile) return undefined;
      const file = normalizeAbsolutePath(rawFile);
      return t("cmd.explain.step.backupFile", { file });
    }

    case "checkFileExists": {
      if (args.length === 0) return undefined;
      const normalized = args.map((f) => normalizeAbsolutePath(f));
      return normalized.length === 1
        ? t("cmd.explain.step.checkFileExists", { file: normalized[0] })
        : t("cmd.explain.step.checkAnyFileExists", { files: formatCodeList(normalized) });
    }

    case "checkChainDirExists": {
      const parsed = parseArgs(args, { stringOnce: ["saveVar", "default"], stopEarly: false });
      if (parsed._.length === 0) return undefined;
      const dirs = formatCodeList(parsed._.map((d: string) => normalizeAbsolutePath(d)));
      const suffix = parsed.default !== undefined
        ? ` (${t("cmd.explain.step.noteDefault", { value: parsed.default })})`
        : "";
      if (parsed.saveVar) {
        resolver.markRuntimeVar(parsed.saveVar);
        return t("cmd.explain.step.checkChainDirSaveVar", { dirs, varName: parsed.saveVar, suffix });
      }
      return t("cmd.explain.step.checkChainDir", { dirs });
    }

    case "checkPort": {
      const parsed = parseArgs(args, { stringOnce: ["port", "transport", "address"], stopEarly: false });
      if (!parsed.port) return undefined;
      const transport = (parsed.transport || "tcp").toUpperCase();
      const port = parsed.address ? `${parsed.address}:${parsed.port}` : parsed.port;
      return t("cmd.explain.step.checkPort", { port, transport });
    }

    case "checkUrl": {
      const url = args[0];
      if (!url) return undefined;
      return t("cmd.explain.step.checkUrl", { url });
    }

    case "assertContains": {
      const parsed = parseArgs(args, { stringOnce: ["message"] });
      if (parsed._.length < 2) return undefined;
      return t("cmd.explain.step.assertContains", { text: parsed._[0], fullText: parsed._[1] });
    }

    case "inspect": {
      const parsed = parseArgs(args, { stringMany: ["regExp", "saveVar"], stopEarly: false });
      if (parsed._.length < 1 || !parsed.saveVar?.length) return undefined;
      for (const v of parsed.saveVar) {
        resolver.markRuntimeVar(v);
      }
      const file = normalizeAbsolutePath(parsed._[0]);
      const vars = formatCodeList(parsed.saveVar);
      if (parsed.regExp?.length) {
        return t("cmd.explain.step.inspectWithPatterns", {
          file,
          patterns: formatCodeList(parsed.regExp),
          vars,
        });
      }
      return t("cmd.explain.step.inspect", { file, vars });
    }

    case "addToDesktop": {
      const target = args[0];
      if (!target) return undefined;
      return t("cmd.explain.step.addToDesktop", { target: normalizeAbsolutePath(target) });
    }

    case "addToStartMenu": {
      const target = args[0];
      if (!target) return undefined;
      const normalizedTarget = normalizeAbsolutePath(target);
      const folder = args[1];
      return folder
        ? t("cmd.explain.step.addToStartMenuFolder", { target: normalizedTarget, folder })
        : t("cmd.explain.step.addToStartMenu", { target: normalizedTarget });
    }

    case "addToStartup": {
      const target = args[0];
      if (!target) return undefined;
      return t("cmd.explain.step.addToStartup", { target: normalizeAbsolutePath(target) });
    }

    case "contextMenu": {
      const rest = args[0] === "folders" ? args.slice(1) : args;
      const parsed = parseArgs(rest, { stringOnce: ["id", "name", "cmd", "icon"], stopEarly: false });
      if (!parsed.name || !parsed.cmd) return undefined;
      return t("cmd.explain.step.contextMenu", { name: parsed.name, cmd: parsed.cmd });
    }

    case "contextMenuRemove": {
      const rest = args[0] === "folders" ? args.slice(1) : args;
      const parsed = parseArgs(rest, { stringOnce: ["id"], stopEarly: false });
      if (!parsed.id) return undefined;
      return t("cmd.explain.step.contextMenuRemove", { id: parsed.id });
    }

    case "killProcess": {
      const processName = args[0];
      if (!processName) return undefined;
      return t("cmd.explain.step.killProcess", { processName });
    }

    case "echo": {
      return t("cmd.explain.step.echo", { message: args.join(" ") });
    }

    case "defaultPackage": {
      const pkgName = args[0];
      if (!pkgName) return undefined;
      return t("cmd.explain.step.defaultPackage", { pkgName });
    }

    case "shellPath": {
      const shellPath = args[0];
      if (!shellPath) return undefined;
      return t("cmd.explain.step.shellPath", { shellPath: normalizeAbsolutePath(shellPath) });
    }

    case "removeFromRegistry": {
      if (args.length === 0) return undefined;
      return t("cmd.explain.step.removeFromRegistry", { packages: formatCodeList(args) });
    }

    case "activateInit": {
      return t("cmd.explain.step.activateInit");
    }

    case "activatePre":
    case "activateCmd": {
      return t("cmd.explain.step.activateInternal", { action });
    }

    case "saveConfig": {
      return t("cmd.explain.step.saveConfig");
    }

    default:
      return undefined;
  }
}
