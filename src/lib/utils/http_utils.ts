import * as log from "https://deno.land/std/log/mod.ts"
import * as path from "https://deno.land/std/path/mod.ts";
import * as deno_validator from 'https://deno.land/x/deno_validator/mod.ts'

export default class HttpUtils {
    static async get(url: string): Promise<Response> {
        return new Promise((resolve, reject) => {
            log.debug(`FETCH ${url} - GET`)

            fetch(url)
                .then((response) => {
                    log.debug(`FETCH ${url} - RESP - STATUS ${response.status} - ${response.statusText}`);
                    resolve(response)
                }).catch((error) => {
                log.debug(`FETCH ${url} - Error ${error}`);
                reject(error);
            })
        })
    }

    static resolve(uri: string) {
        if (deno_validator.isURL(uri, {})) {
            return uri
        }
        return path.resolve(uri)
    }

}
