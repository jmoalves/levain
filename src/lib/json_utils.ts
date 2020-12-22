import * as path from "https://deno.land/std/path/mod.ts";

export default class JsonUtils {
    static load(filename: string): any {
        return JSON.parse(Deno.readTextFileSync(path.resolve(filename)));
    }

    static get(json: any, property: string, defaultValue?: any): any {
        let jsonPath = this.translatePath(property);

        let obj = json;
        for (let item of jsonPath) {
            if (obj[item] != undefined) {
                obj = obj[item];
            } else {
                return defaultValue;
            }
        }

        if (obj != undefined) {
            return obj;
        }

        return defaultValue;
    }

    static translatePath(propertyPath: string): string[] {
        let matches = propertyPath.match(/\[[^[\]]+\]/g);
        if (!matches || matches.length == 0) {
            return [propertyPath];
        }

        return matches.map(match => match
            .replace(/^\[(.*)\]$/,"$1")
            .replace(/^"(.*)"$/,"$1")
            .replace(/^'(.*)'$/,"$1")
        )
    }
}
