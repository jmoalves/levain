import * as log from "https://deno.land/std/log/mod.ts";

import Config from "../config.ts";
import HttpUtils from "../utils/http_utils.ts";
import OsUtils from "../os/os_utils.ts";

export default class LevainReleases { 
    private apiUrl = 'https://api.github.com/repos/jmoalves/levain/releases'
    private downloadUrl = 'https://github.com/jmoalves/levain/releases/download'

    private static releasesCache: any | undefined;

    constructor(private config: Config) {
    }

    async releases(): Promise<any> {
        if (LevainReleases.releasesCache) {
            return Promise.resolve(LevainReleases.releasesCache)
        }

        return new Promise((resolve, reject) => {
            HttpUtils.get(`${this.apiUrl}`)
                .then(response => {
                    response.json()
                    .then(json => {
                        LevainReleases.releasesCache = json
                        resolve(json)
                    })
                    .catch(error => {
                        log.error(`Error looking for Levain releases ${error}`)
                        reject(error)
                    })    
                })
                .catch(error => {
                    log.error(`Error looking for Levain releases ${error}`)
                    reject(error)
                })
        })
    }

    async levainZipUrl(version?: string): Promise<string> {
        version = version || await this.latest()

        if (!version.startsWith("v")) {
            version = "v" + version
        }

        OsUtils.isWindows()
        return `${this.downloadUrl}/${version}/levain-${version}-windows-x86_64.zip`
    }

    async latest(): Promise<string> {
        const obj = this;
        return new Promise((resolve, reject) => {
            obj.releases()
                .then((list) => {
                    if (!list || list.length == 0) {
                        reject(Error(`No release found`))
                    }

                    resolve(list[0].tag_name)
                })
                .catch((error) => reject(error))
        })
    }

    async releasesRepositoryUrl(): Promise<string> {
        return await this.levainZipUrl()
    }
}
