import * as log from "https://deno.land/std/log/mod.ts";

import Config from "./config.ts";

export default class HttpUtils {
    constructor(config: Config) {
    }

    async getJson(url: string): Promise<any> {
        return new Promise((resolve, reject) => {
            log.debug(`FETCH ${url} - GET`)

            fetch(url)
                .then((response) => {
                    log.debug(`FETCH ${url} - RESP - STATUS ${response.status} - ${response.statusText}`);
                    response.json().then((json => {
                        // log.debug(`FETCH ${url} - RESP - JSON ${JSON.stringify(json)}`);
                        resolve(json)
                    })
                ).catch((error) => {
                    log.debug(`FETCH ${url} - Error ${error}`);
                    reject(error);
                })
            })
        })
    }

    async getStream(url: string): Promise<ReadableStream<Uint8Array> | null> {
        return new Promise((resolve, reject) => {
            log.debug(`FETCH ${url} - GET`)

            fetch(url)
                .then((response) => {
                    log.debug(`FETCH ${url} - RESP - STATUS ${response.status} - ${response.statusText}`);
                    resolve(response.body)
                }).catch((error) => {
                    log.debug(`FETCH ${url} - Error ${error}`);
                    reject(error);
                })
        })
    }
}
