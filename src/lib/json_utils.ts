import * as path from "https://deno.land/std/path/mod.ts";

export default class JsonUtils {
    static load(filename: string): any {
        return JSON.parse(Deno.readTextFileSync(path.resolve(filename)));
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

    static set(json: any, property: string, value: any, ifNotExists = false): boolean {
        let jsonPath = this.translatePath(property);

        // console.log(`\njsonPath ${jsonPath} - json: ${JSON.stringify(json)} - length ${jsonPath.length}`);

        let level = 0;
        let obj = json;
        for (let item of jsonPath) {
            level++;
            // console.log(`level: ${level} obj: ${JSON.stringify(obj)} - length ${jsonPath.length}`);

            if (level == jsonPath.length) {
                if (obj[item] != undefined && ifNotExists) {
                    return false;
                }

                obj[item] = value;
                return true;
            }

            if (obj[item] != undefined) {
                obj = obj[item];
                continue;
            }

            if (obj[item+1] instanceof Number) {
                obj[item] = []
            } else {
                obj[item] = {}
            }
        }

        throw Error(`We must not arrive here...`);
    }
}
