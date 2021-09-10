import UserInfoUtil from "./user_info/userinfo_util.ts";
import Config from "./config.ts";

export default class VarResolver {
    static async replaceVars(text: string, pkgName: string | undefined, config: Config): Promise<string> {

        let replacedText: string = text;
        let vars = VarResolver.matchVarsInText(replacedText);
        while (vars) {
            for (let myVar of vars) {
                let varName = VarResolver.removeVarMarkers(myVar);
                let varValue = await VarResolver.getVarValue(varName, pkgName, config);

                if (!varValue) {
                    throw new Error(`Var ${varName} is undefined`);
                }

                replacedText = replacedText.replace(myVar, varValue);
            }

            vars = VarResolver.matchVarsInText(replacedText);
        }

        return replacedText;
    }

    static async getVarValue(vName: string, pkgName: string | undefined, config: Config): Promise<string | undefined> {
        // TODO: Refactor this... Use ChainOfResponsibility Pattern...

        // We handle reserved words first
        if (vName.match(/^levain\./)) {
            switch (vName) {
                case "levain.login":
                    if (!config.login) {
                        new UserInfoUtil().askLogin(config)
                    }
                    return config.login

                case "levain.password":
                    if (!config.password) {
                        new UserInfoUtil().askPassword(config)
                    }
                    return config.password

                case "levain.email":
                    if (!config.email) {
                        await new UserInfoUtil().askEmail(config)
                    }
                    return config.email

                case "levain.fullname":
                    if (!config.fullname) {
                        await new UserInfoUtil().askFullName(config)
                    }
                    return config.fullname

                case 'levain.homeDir':
                    return config.levainHome

                case 'levain.cacheDir':
                    return config.levainCacheDir
                
                default:
                    throw new Error(`Levain attribute ${vName} is undefined`);
            }

        } else if (vName == "home") {
            return config.levainHome;
        } else if (vName.search(/^pkg\.(.+)\.([^.]*)/) != -1) {
            let pkgVarPkg = vName.replace(/^pkg\.(.+)\.([^.]*)/, "$1");
            let pkgVarName = vName.replace(/^pkg\.(.+)\.([^.]*)/, "$2");
            return await config.packageManager.getVar(pkgVarPkg, pkgVarName) ?? '';
        } else {
            // General items

            if (pkgName && await config.packageManager.getVar(pkgName, vName)) {
                return await config.packageManager.getVar(pkgName, vName) ?? '';
            }

            if (config?.getVar(vName)) {
                return config.getVar(vName)
            }

            if (Deno.env.get(vName)) {
                return Deno.env.get(vName)
            }

            return undefined
        }
    }

    static removeVarMarkers(v: string) {
        return v.replace("$", "").replace("{", "").replace("}", "");
    }

    static matchVarsInText(text: string): RegExpMatchArray | null {
        return text.match(/\${[^${}]+}/);
    }

}
