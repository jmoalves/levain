import * as path from "https://deno.land/std/path/mod.ts";
import {ensureDirSync} from "https://deno.land/std/fs/mod.ts"

export default class JsonUtils {
    static load(filename: string): any {
        try {
            return JSON.parse(Deno.readTextFileSync(path.resolve(filename)));
        } catch (err) {
            if (err.name == "NotFound") {
                throw Error(`File ${filename} not found`);
            }
        }
    }

    static save(fileName: string, json: any) {
        try {
            const filePath = path.dirname(fileName)
            ensureDirSync(filePath)
            Deno.writeTextFileSync(fileName, JSON.stringify(json, null, 3))
        } catch (err) {
            if (err.name == "NotFound") {
                throw Error(`File ${fileName} not found`);
            }
        }
    }

    static translatePath(propertyPath: string): string[] {
        let matches = propertyPath.match(/\[[^[\]]+\]/g);
        if (!matches || matches.length == 0) {
            return [propertyPath];
        }

        return matches.map(match => match
            .replace(/^\[(.*)\]$/, "$1")
            .replace(/^"(.*)"$/, "$1")
            .replace(/^'(.*)'$/, "$1")
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
        // log.debug(`\nValue: ${value} jsonPath ${jsonPath} - json: ${JSON.stringify(json)} - length ${jsonPath.length}`);

        let level = 0;
        let obj: any = json;
        for (let item of jsonPath) {
            level++;

            // log.debug(`level: ${level} item: ${item} obj: ${JSON.stringify(obj)} - length ${jsonPath.length}`);

            if (this.isArrayTask(item)) {
                item = this.itemForArrayTask(obj, item);
                // log.debug(`PLUS item - ${item}`);
            }

            if (level == jsonPath.length) {
                if (obj[item] != undefined && ifNotExists) {
                    return false;
                }

                if (obj[item] == value) {
                    return false;
                }

                if (this.isNumeric(value)) {
                    obj[item] = +value;
                } else if (this.isBoolean(value)) {
                    obj[item] = this.toBoolean(value);
                } else {
                    obj[item] = value;
                }

                // log.debug(`=> ${JSON.stringify(obj)}[${item}] = ${value} ==> ${obj[item]}`);
                return true;
            }

            if (obj[item] == undefined) {
                if (this.isNumeric(jsonPath[level]) || this.isArrayTask(jsonPath[level])) {
                    // log.debug(`new array for ${item}`);
                    obj[item] = []
                } else {
                    // log.debug(`new object for ${item}`);
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

        let s: any = str;
        return !isNaN(s) && // use type coercion to parse the _entirety_ of the string (`parseFloat` alone does not do this)...
            !isNaN(parseFloat(s)) // ...and ensure strings of whitespace fail
    }

    static isBoolean(str: any) {
        return this.toBoolean(str) != undefined;
    }

    static toBoolean(str: any): boolean | undefined {
        if (typeof str == "boolean") {
            return str;
        }

        if (typeof str != "string") {
            return false; // we only process strings! 
        }

        switch (str.toLowerCase().trim()) {
            case "true":
                return true;
            case "false":
                return false;
            default:
                return undefined;
        }
    }

    private static isArrayTask(item: string): boolean {
        return item.match(/^:.*:$/) != null;
    }

    private static itemForArrayTask(obj: any, item: string): string {
        if (!Array.isArray(obj)) {
            throw Error(`Target must be an array: ${obj}`);
        }

        switch (item) {
            case ":+1:":
                return "" + obj.length;

            case ":last:":
                return "" + (obj.length - 1);

            default:
                throw Error(`Invalid array task ${item}`);
        }
    }
}
