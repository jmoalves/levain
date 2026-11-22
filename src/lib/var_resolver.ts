import UserInfoUtil from "./user_info/userinfo_util.ts";
import type Config from "./config.ts";
import HomePaths from "./paths/home_paths.ts";

export interface VarResolutionContext {
  depth: number;
  deferredSecrets: Map<string, string>;
}

export default class VarResolver {
  static readonly MAX_EXPANSION_DEPTH = 20;

  static async replaceVars(
    text: string,
    pkgName: string | undefined,
    config: Config,
    parentCtx?: VarResolutionContext,
  ): Promise<string> {
    const isRoot = !parentCtx;
    const baseDepth = parentCtx?.depth ?? 0;
    const deferredSecrets = parentCtx?.deferredSecrets ?? new Map<string, string>();

    let replacedText: string = text;
    let vars = VarResolver.findVarsInText(replacedText);
    let loopDepth = 0;

    while (vars.length) {
      if (baseDepth + loopDepth >= VarResolver.MAX_EXPANSION_DEPTH) {
        throw new Error(
          `Maximum variable expansion depth (${VarResolver.MAX_EXPANSION_DEPTH}) exceeded while resolving: ${text}`,
        );
      }
      loopDepth++;
      const childCtx: VarResolutionContext = {
        depth: baseDepth + loopDepth,
        deferredSecrets,
      };

      for (const myVar of vars) {
        const varText = myVar.text;
        const varName = myVar.name;
        const varValue = await VarResolver.getVarValue(varName, pkgName, config, childCtx);

        if (!varValue) {
          throw new Error(`Var ${varName} not defined`);
        }

        if (varName === "levain.password") {
          const sentinel = `__LEVAIN_SECRET_${deferredSecrets.size}_${crypto.randomUUID()}__`;
          deferredSecrets.set(sentinel, varValue);
          replacedText = replacedText.replace(varText, () => sentinel);
        } else {
          replacedText = replacedText.replace(varText, () => varValue);
        }
      }

      vars = VarResolver.findVarsInText(replacedText);
    }

    if (isRoot) {
      for (const [sentinel, secretValue] of deferredSecrets.entries()) {
        replacedText = replacedText.replace(sentinel, () => secretValue);
      }
    }

    return replacedText;
  }

  static findVarsInText(text: string): { text: string; name: string }[] {
    const varInTextRegExp = /(?<text>\${(?<name>[^${}]+)})/mg;
    const matches = text.matchAll(varInTextRegExp);
    if (!matches) {
      return [];
    }
    return [...matches]
      .map((myVar) => {
        const text = myVar?.groups?.text ?? "<should be defined>";
        const name = myVar?.groups?.name ?? "<should be defined>";
        return { text, name };
      });
  }

  static async getVarValue(
    vName: string,
    pkgName: string | undefined,
    config: Config,
    ctx?: VarResolutionContext,
  ): Promise<string | undefined> {
    // TODO: Refactor this... Use ChainOfResponsibility Pattern...

    // We handle reserved words first
    if (vName.match(/^levain\./)) {
      switch (vName) {
        case "levain.login":
          if (!config.login) {
            await new UserInfoUtil().askLogin(config);
          }
          return config.login;

        case "levain.password":
          if (!config.password) {
            await new UserInfoUtil().askPassword(config);
          }
          return config.password;

        case "levain.email":
          if (!config.email) {
            await new UserInfoUtil().askEmail(config);
          }
          return config.email;

        case "levain.fullname":
          if (!config.fullname) {
            await new UserInfoUtil().askFullName(config);
          }
          return config.fullname;

        case "levain.homeDir":
          return config.configPaths.levainHome;

        case "levain.cacheDir":
          return config.configPaths.levainCacheDir;

        default:
          throw new Error(`Levain attribute ${vName} is undefined`);
      }
    } else if (vName == "home") {
      return HomePaths.homedir();
    } else if (vName.search(/^pkg\.(.+)\.([^.]*)/) != -1) {
      const pkgVarPkg = vName.replace(/^pkg\.(.+)\.([^.]*)/, "$1");
      const pkgVarName = vName.replace(/^pkg\.(.+)\.([^.]*)/, "$2");
      return await config.packageManager.getVar(pkgVarPkg, pkgVarName, ctx) ?? "";
    } else {
      // General items

      if (pkgName) {
        const pkgVarValue = await config.packageManager.getVar(pkgName, vName, ctx);
        if (pkgVarValue) {
          return pkgVarValue;
        }
      }

      if (config?.getVar(vName)) {
        return config.getVar(vName);
      }

      if (Deno.env.get(vName)) {
        return Deno.env.get(vName);
      }

      if (config?.getVar(`levain.var.default.${vName}`)) {
        return config.getVar(`levain.var.default.${vName}`);
      }

      return undefined;
    }
  }
}
