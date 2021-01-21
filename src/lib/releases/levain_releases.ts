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
                        return
                    })
                    .catch(error => {
                        log.error(`Error looking for Levain releases ${error}`)
                        reject(error)
                        return
                    })    
                })
                .catch(error => {
                    log.error(`Error looking for Levain releases ${error}`)
                    reject(error)
                    return
                })
        })
    }

    async levainZipUrl(version?: string): Promise<string> {
        version = version || await this.latestVersion()

        if (!version.startsWith("v")) {
            version = "v" + version
        }

        OsUtils.isWindows()
        return `${this.downloadUrl}/${version}/levain-${version}-windows-x86_64.zip`
    }

    async latest(): Promise<any> {
        const obj = this;
        return new Promise((resolve, reject) => {
            obj.releases()
                .then((list) => {
                    if (!list || list.length == 0) {
                        reject(Error(`No release found`))
                        return
                    }

                    resolve(list[0])
                    return
                })
                .catch((error) => reject(error))
        })
    }

    async latestVersion(): Promise<string> {
        const obj = this;
        return new Promise((resolve, reject) => {
            obj.latest()
                .then((release) => {
                    if (!release) {
                        reject(Error(`No release found`))
                        return
                    }

                    if (release.tag_name) {
                        if (LevainReleases.isValidReleaseTag(release.tag_name)) {
                            resolve(release.tag_name.replace("v", ""))
                            return
                        }

                        log.error(`Invalid release tag format - ${release.tag_name}`)
                        reject(Error(`No release found`))    
                        return
                    }

                    reject(Error(`No release found`))
                    return
                })
                .catch((error) => reject(error))
        })
    }

    static isValidReleaseTag(tag?: string): boolean {
        return (tag?.match(/^v[0-9]+\.[0-9]+\.[0-9]+$/) != null)
    }

    async releasesRepositoryUrl(): Promise<string> {
        return await this.levainZipUrl()
    }
}
