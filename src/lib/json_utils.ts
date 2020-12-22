import * as path from "https://deno.land/std/path/mod.ts";

export default class JsonUtils {
    static load(filename: string): any {
        return JSON.parse(Deno.readTextFileSync(path.resolve(filename)));
    }

    static save(filename: string, json: any) {
        Deno.writeTextFileSync(filename, JSON.stringify(json, null, 3));
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
        // console.log(`\nValue: ${value} jsonPath ${jsonPath} - json: ${JSON.stringify(json)} - length ${jsonPath.length}`);

        let level = 0;
        let obj:any = json;
        for (let item of jsonPath) {
            level++;
            // console.log(`level: ${level} obj: ${JSON.stringify(obj)} - length ${jsonPath.length}`);

            if (level == jsonPath.length) {
                if (obj[item] != undefined && ifNotExists) {
                    return false;
                }

                if (JsonUtils.isNumeric(value)) {
                    obj[item] = +value;
                } else if (JsonUtils.isBoolean(value)) {
                    obj[item] = JsonUtils.toBoolean(value);
                } else {
                    obj[item] = value;
                }

                // console.log(`${JSON.stringify(obj)}[${item}] = ${value} ==> ${obj[item]}`);
                return true;
            }

            if (obj[item] == undefined) {
                if (JsonUtils.isNumeric(jsonPath[level])) {
                    obj[item] = []
                } else {
                    obj[item] = {}
                }
            }

            obj = obj[item];
        }

        throw Error(`We must not arrive here...`);
    }

    // https://stackoverflow.com/questions/175739/built-in-way-in-javascript-to-check-if-a-string-is-a-valid-number
    static isNumeric(str: any) {
        if (typeof str == "number") {
            return true; 
        }

        if (typeof str != "string") {
            return false; // we only process strings! 
        }

        let s:any = str;
        return !isNaN(s) && // use type coercion to parse the _entirety_ of the string (`parseFloat` alone does not do this)...
               !isNaN(parseFloat(s)) // ...and ensure strings of whitespace fail
    }

    static isBoolean(str: any) {
        return this.toBoolean(str) != undefined;
    }

    static toBoolean(str: any): boolean|undefined {
        if (typeof str == "boolean") {
            return str; 
        }

        if (typeof str != "string") {
            return false; // we only process strings! 
        }

        switch(str.toLowerCase().trim()){
            case "true": return true;
            case "false": return false;
            default: return undefined;
        }
    }
}
