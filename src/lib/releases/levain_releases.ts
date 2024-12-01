import * as log from "jsr:@std/log";
import * as path from "jsr:@std/path";
import { ensureDirSync, existsSync } from "jsr:@std/fs";

import t from '../i18n.ts'

import Config from "../config.ts";
import HttpUtils from "../utils/http_utils.ts";
import DateUtils from "../utils/date_utils.ts";
import OsUtils from "../os/os_utils.ts";
import LevainVersion from "../../levain_version.ts";
import Loader from "../loader.ts";
import VersionNumber from "../utils/version_number.ts";

const UPDATE_REQUEST = 42

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
                        reject(Error(t("lib.releases.levain_releases.noRelease")))
                        return
                    }

                    response.json()
                    .then(json => {
                        LevainReleases.releasesCache = json
                        resolve(json)
                        return
                    })
                    .catch(error => {
                        log.error(t("lib.releases.levain_releases.errorLookingFor", { error: error }))
                        reject(error)
                        return
                    })    
                })
                .catch(error => {
                    log.error(t("lib.releases.levain_releases.errorLookingFor", { error: error }))
                    reject(error)
                    return
                })
        })
    }

    async levainZipUrl(version?: VersionNumber): Promise<string> {
        version = version || await this.latestVersion()

        if (!version) {
            throw Error(t("lib.releases.levain_releases.undefinedVersion"))
        }

        let versionPath = version.versionNumber
        if (!versionPath.startsWith("v")) {
            versionPath = "v" + versionPath
        }

        OsUtils.isWindows()
        return `${this.downloadUrl}/${versionPath}/levain-${versionPath}-windows-x86_64.zip`
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
                            log.debug(`Error looking for Levain latest release ${error}`)
                            reject(error)
                            return
                        })
                })
                .catch(error => {
                    log.debug(`2-Error - ${JSON.stringify(error)}`)
                    log.debug(`Error looking for Levain latest release ${error}`)
                    reject(error)
                    return
                })
        })
    }

    async latestVersion(): Promise<VersionNumber|undefined> {
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
                            resolve(new VersionNumber(release.tag_name.replace("v", "")))
                            return
                        }

                        log.debug(`Invalid release tag format - ${release.tag_name}`)
                        resolve(undefined)
                        return
                    }

                    resolve(undefined)
                    return
                })
                .catch((error) => {
                    log.debug(`Error - ${error}`)
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

    async checkLevainUpdate() {
        if (!this.allowsUpdate()) {
            log.debug("")
            log.debug(`My version does not allow updates - ${LevainVersion.levainVersion}`)
            log.debug("")
            return
        }

        try {
            let levainReleases = new LevainReleases(this.config)
            let latestVersion = await levainReleases.latestVersion()
            if (!this.needsUpdate(latestVersion)) {
                return
            }

            if (!latestVersion) {
                return
            }

            this.config.lastKnownVersion = latestVersion.versionNumber
            await levainReleases.newReleaseInfo()

            if (!this.config.autoUpdate) {
                if (this.config.lastUpdateQuestion == DateUtils.dateTag()) {
                    log.info(t("lib.releases.levain_releases.ignoringToday"))
                    return
                }

                console.log("")
                this.config.lastUpdateQuestion = DateUtils.dateTag()
                let answer = prompt(t("lib.releases.levain_releases.updateNow"), t("lib.releases.levain_releases.updateNowDefault"))
                if (!answer || ![t("lib.releases.levain_releases.updateNowDefault")].includes(answer.toUpperCase())) {
                    log.info(t("lib.releases.levain_releases.askLater"))
                    return
                }
            }

            log.info("")
            log.info(t("lib.releases.levain_releases.upgrading"))
            log.info("")

            this.config.shellCheckForUpdate = true

            await levainReleases.prepareNewRelease()
        } catch(error) {
            log.debug(`Error ${error}`)
            log.info(t("lib.releases.levain_releases.ignoring"))
        }
    }

    allowsUpdate(): boolean {
        return !LevainVersion.isHeadVersion()
    }

    needsUpdate(newVersion?: VersionNumber): boolean {
        if (!newVersion) {
            log.debug(`No update needed - no new version`)
            return false
        }

        let myVersion = LevainVersion.levainVersion
        if (myVersion.isHEAD) {
            log.debug(`No update needed - vHEAD version`)
            return false
        }

        if (!newVersion.isNewerThan(myVersion)) {
            log.debug(`No update needed - latest version ${newVersion} isn't newer than my version ${myVersion}`)
            return false
        }

        log.debug(`UPDATE needed - my version ${myVersion} is older than ${newVersion}`)
        return true
    }

    async newReleaseInfo() {
        log.info("")
        log.info("*********************************************************")
        log.info(t(
            "lib.releases.levain_releases.newReleaseAvailable", 
            { yourVersion: LevainVersion.levainVersion, newVersion: await this.latestVersion()}
        ))
        log.info("*********************************************************")
        log.info("")
    }

    async prepareNewRelease() {
        let releasesDir = path.resolve(OsUtils.tempDir, "levain")
        log.debug(`Levain releases dir ${releasesDir}`)
        ensureDirSync(releasesDir)

        let newVersionDir = path.resolve(releasesDir, `levain-${await this.latestVersion()}`)
        log.debug(`Checking (1) Levain at ${newVersionDir}`)
        if (!existsSync(newVersionDir)) {
            try {
                log.debug(`Extracting Levain to ${releasesDir}`)
                let url = await this.levainZipUrl()
                let action = `extract ${url} ${releasesDir}`
                let loader = new Loader(this.config)
                await loader.action(undefined, action)    
            } catch (error) {
                log.error(t("lib.releases.levain_releases.unableToExtract", { error: JSON.stringify(error) } ))
                return
            }
        }

        // Double check
        log.debug(`Checking (2) Levain at ${newVersionDir}`)
        if (!existsSync(newVersionDir)) {
            log.error(t("lib.releases.levain_releases.unableToLoad"))
            return
        }

        log.info("")
        log.info(t("lib.releases.levain_releases.restarting"))
        log.info("")

        Deno.exit(UPDATE_REQUEST)
    }
}
