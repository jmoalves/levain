import * as log from "@std/log";
import * as path from "@std/path";
import validator from "validator";
import { sleepRandomAmountOfSeconds } from "./utils.ts";

export default class HttpUtils {
  static async get(url: string, tries: number = 3): Promise<Response> {
    if (tries <= 0) {
      throw new Error(`Invalid value for tries: ${tries}`);
    }

    let error = undefined;

    log.debug(`FETCH ${url} - GET`);
    for (let t = 1; t <= tries; t++) {
      try {
        const c = new AbortController();
        const id = setTimeout(() => c.abort(), 5000);
        const response = await fetch(url, { signal: c.signal, redirect: "follow" });
        clearTimeout(id);

        if (response) {
          log.debug(`FETCH ${url} - RESP - STATUS ${response.status} - ${response.statusText}`);
        }

        return response;
      } catch (e) {
        log.debug(`FETCH ${url} - Error ${e} - attempt: ${t}/${tries}`);
        error = e;
        await sleepRandomAmountOfSeconds(0, Math.max(1, 5));
      }
    }

    throw error;
  }

  static resolve(uri: string) {
    if (validator.isURL(uri, {})) {
      return uri;
    }
    return path.resolve(uri);
  }
}
