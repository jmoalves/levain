import * as log from "https://deno.land/std/log/mod.ts"
import * as path from "https://deno.land/std/path/mod.ts";
import * as deno_validator from 'https://deno.land/x/deno_validator/mod.ts'

export default class HttpUtils {
    static async get(url: string, tries: number = 3): Promise<Response> {
        if (tries <= 0) {
            throw new Error(`Invalid value for tries: ${tries}`)
        }

        let error = undefined

        log.debug(`FETCH ${url} - GET`)
        for (let t = 1; t <= tries; t++) {
            try {
                const c = new AbortController();
                const id = setTimeout(() => c.abort(), 5000);
                let response = await fetch(url, {signal: c.signal});
                clearTimeout(id);

                if (response) {
                    log.debug(`FETCH ${url} - RESP - STATUS ${response.status} - ${response.statusText}`)
                }

                return response
            } catch(e) {
                log.debug(`FETCH ${url} - Error ${e} - attempt: ${t}/${tries}`)
                error = e
            }
        }

        throw error
    }

    static resolve(uri: string) {
        if (deno_validator.isURL(uri, {})) {
            return uri
        }
        return path.resolve(uri)
    }

}
