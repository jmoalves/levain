import * as log from "@std/log";
import * as path from "@std/path";
import { sleepRandomAmountOfSeconds } from "./utils.ts";

export default class HttpUtils {
  static async get(url: string, tries: number = 3): Promise<Response> {
    if (tries <= 0) {
      throw new Error(`Invalid value for tries: ${tries}`);
    }

    let error = undefined;

    log.debug(`FETCH ${url} - GET`);
    for (let t = 1; t <= tries; t++) {
      const c = new AbortController();
      const id = setTimeout(() => c.abort(), 5000);
      try {
        const response = await fetch(url, { signal: c.signal, redirect: "follow" });

        if (response) {
          log.debug(`FETCH ${url} - RESP - STATUS ${response.status} - ${response.statusText}`);
        }

        return response;
      } catch (e) {
        log.debug(`FETCH ${url} - Error ${e} - attempt: ${t}/${tries}`);
        error = e;
        if (t < tries) {
          await sleepRandomAmountOfSeconds(0, Math.max(1, 5));
        }
      } finally {
        clearTimeout(id);
      }
    }

    throw error;
  }

  static isUrl(uri: string): boolean {
    if (!uri || /\s/.test(uri) || !/^(https?|ftp):\/\//i.test(uri)) {
      return false;
    }
    try {
      const parsed = new URL(uri);
      return Boolean(parsed.hostname);
    } catch {
      return false;
    }
  }

  static resolve(uri: string) {
    if (HttpUtils.isUrl(uri)) {
      return uri;
    }
    return path.resolve(uri);
  }
}
