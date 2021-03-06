import * as log from "https://deno.land/std/log/mod.ts";

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

}
