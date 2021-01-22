import * as log from "https://deno.land/std/log/mod.ts";

import Config from "../config.ts";
import HttpUtils from "../utils/http_utils.ts";
import OsUtils from "../os/os_utils.ts";

export default class LevainReleases { 
    private apiUrl = 'https://api.github.com/repos/jmoalves/levain/releases'
    private downloadUrl = 'https://github.com/jmoalves/levain/releases/download'

    private static releasesCache: any | undefined;
    private static latestCache: any | undefined;
    private static latestNotFound: boolean = false;

    constructor(private config: Config) {
    }

    async releases(): Promise<any> {
        if (LevainReleases.releasesCache) {
            return Promise.resolve(LevainReleases.releasesCache)
        }

        return new Promise((resolve, reject) => {
            HttpUtils.get(`${this.apiUrl}`)
                .then(response => {
                    if (response.status == 404) {
                        reject(Error("No release found"))
                        return
                    }

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

        if (!version) {
            throw Error(`No zip for undefined version`)
        }

        if (!version.startsWith("v")) {
            version = "v" + version
        }

        OsUtils.isWindows()
        return `${this.downloadUrl}/${version}/levain-${version}-windows-x86_64.zip`
    }

    async latest(): Promise<any> {
        if (LevainReleases.latestNotFound) {
            return Promise.resolve(undefined)
        }

        if (LevainReleases.latestCache) {
            return Promise.resolve(LevainReleases.latestCache)
        }

        return new Promise((resolve, reject) => {
            HttpUtils.get(`${this.apiUrl}/latest`)
                .then(response => {
                    if (response.status == 404) {
                        log.debug(`404 at latest release`)
                        LevainReleases.latestNotFound = true
                        LevainReleases.latestCache = undefined
                        resolve(undefined)
                    }

                    response.json()
                        .then(json => {
                            LevainReleases.latestCache = json
                            resolve(json)
                            return
                        })
                        .catch(error => {
                            log.debug(`1-Error - ${JSON.stringify(error)}`)
                            log.error(`Error looking for Levain latest release ${error}`)
                            reject(error)
                            return
                        })
                })
                .catch(error => {
                    log.debug(`2-Error - ${JSON.stringify(error)}`)
                    log.error(`Error looking for Levain latest release ${error}`)
                    reject(error)
                    return
                })
        })
    }

    async latestVersion(): Promise<string|undefined> {
        const obj = this;
        return new Promise((resolve, reject) => {
            obj.latest()
                .then((release) => {
                    if (!release) {
                        log.debug(`No latest release found`)
                        resolve(undefined)
                        return
                    }

                    if (release.tag_name) {
                        if (LevainReleases.isValidReleaseTag(release.tag_name)) {
                            resolve(release.tag_name.replace("v", ""))
                            return
                        }

                        log.error(`Invalid release tag format - ${release.tag_name}`)
                        resolve(undefined)
                        return
                    }

                    resolve(undefined)
                    return
                })
                .catch((error) => {
                    log.error(`Error - ${error}`)
                    reject(error)
                })
        })
    }

    static isValidReleaseTag(tag?: string): boolean {
        return (tag?.match(/^v[0-9]+\.[0-9]+\.[0-9]+$/) != null)
    }

    async releasesRepositoryUrl(): Promise<string> {
        return await this.levainZipUrl()
    }
}
