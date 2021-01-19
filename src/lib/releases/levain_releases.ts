import * as log from "https://deno.land/std/log/mod.ts";

import Config from "../config.ts";
import HttpUtils from "../http_utils.ts";
import OsUtils from "../os_utils.ts";

export default class LevainReleases { 
    private apiUrl = 'https://api.github.com/repos/jmoalves/levain/releases'
    private downloadUrl = 'https://github.com/jmoalves/levain/releases/download'

    private releasesCache: any | undefined;

    constructor(private config: Config) {
    }

    async releases(): Promise<any> {
        if (this.releasesCache) {
            return this.releasesCache
        }

        let response = await HttpUtils.get(`${this.apiUrl}`)
        this.releasesCache = await response.json()
        return this.releasesCache
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
        const releases = this;
        return new Promise((resolve, reject) => {
            releases.releases()
                .then((list) => {
                    if (!list || list.length == 0) {
                        reject(Error(`No release found`))
                    }

                    resolve(list[0].tag_name)
                })
                .catch((error) => reject(error))
        })
    }
}
