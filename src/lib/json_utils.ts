import * as log from "https://deno.land/std/log/mod.ts";
import * as path from "https://deno.land/std/path/mod.ts";

export default class JsonUtils {
    static load(filename: string): any {
        return JSON.parse(Deno.readTextFileSync(path.resolve(filename)));
    }

    static get(json: any, property: string, defaultValue?: any): any {
        return json[property] || defaultValue;
    }
}
