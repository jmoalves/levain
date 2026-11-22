import * as log from "@std/log";
import * as path from "@std/path";
import { ensureDirSync, existsSync } from "@std/fs";

import t from "../i18n.ts";

import type Config from "../config.ts";
import HttpUtils from "../utils/http_utils.ts";
import DateUtils from "../utils/date_utils.ts";
import OsUtils from "../os/os_utils.ts";
import LevainVersion from "../../levain_version.ts";
import VersionNumber from "../utils/version_number.ts";
import GeneralPaths from "../paths/general_paths.ts";
import FileCache from "../fs/file_cache.ts";
import { ExtractorFactory } from "../extract/extractor_factory.ts";

const UPDATE_REQUEST = 42;

export default class LevainReleases {
  private apiUrl = "https://api.github.com/repos/jmoalves/levain/releases";
  private downloadUrl = "https://github.com/jmoalves/levain/releases/download";

  private static releasesCache: any | undefined;
  private static latestCache: any | undefined;
  private static latestNotFound: boolean = false;

  constructor(private config: Config) {
  }

  // deno-lint-ignore require-await
  async releases(): Promise<any> {
    if (LevainReleases.releasesCache) {
      return Promise.resolve(LevainReleases.releasesCache);
    }

    return new Promise((resolve, reject) => {
      HttpUtils.get(`${this.apiUrl}`)
        .then((response) => {
          if (response.status == 404) {
            reject(Error(t("lib.releases.levain_releases.noRelease")));
            return;
          }

          response.json()
            .then((json) => {
              LevainReleases.releasesCache = json;
              resolve(json);
              return;
            })
            .catch((error) => {
              log.error(t("lib.releases.levain_releases.errorLookingFor", { error: error }));
              reject(error);
              return;
            });
        })
        .catch((error) => {
          log.error(t("lib.releases.levain_releases.errorLookingFor", { error: error }));
          reject(error);
          return;
        });
    });
  }

  async levainZipUrl(version?: VersionNumber): Promise<string> {
    version = version || await this.latestVersion();

    if (!version) {
      throw Error(t("lib.releases.levain_releases.undefinedVersion"));
    }

    let versionPath = version.versionNumber;
    if (!versionPath.startsWith("v")) {
      versionPath = "v" + versionPath;
    }

    OsUtils.isWindows();
    return `${this.downloadUrl}/${versionPath}/levain-${versionPath}-windows-x86_64.zip`;
  }

  static resetCache() {
    LevainReleases.releasesCache = undefined;
    LevainReleases.latestCache = undefined;
    LevainReleases.latestNotFound = false;
  }

  async latest(): Promise<any> {
    if (LevainReleases.latestNotFound) {
      return undefined;
    }

    if (LevainReleases.latestCache) {
      return LevainReleases.latestCache;
    }

    try {
      const response = await HttpUtils.get(`${this.apiUrl}/latest`);
      if (response.status == 404) {
        log.debug(`404 at latest release`);
        await response.body?.cancel();
        LevainReleases.latestNotFound = true;
        LevainReleases.latestCache = undefined;
        return undefined;
      }

      if (!response.ok) {
        await response.body?.cancel();
        throw new Error(`HTTP ${response.status} looking for latest release`);
      }

      const json = await response.json();
      LevainReleases.latestCache = json;
      return json;
    } catch (error) {
      log.debug(`Error looking for Levain latest release ${error}`);
      throw error;
    }
  }

  // deno-lint-ignore require-await
  async latestVersion(): Promise<VersionNumber | undefined> {
    return new Promise((resolve, reject) => {
      this.latest()
        .then((release) => {
          if (!release) {
            log.debug(`No latest release found`);
            resolve(undefined);
            return;
          }

          if (release.tag_name) {
            if (LevainReleases.isValidReleaseTag(release.tag_name)) {
              resolve(new VersionNumber(release.tag_name.replace("v", "")));
              return;
            }

            log.debug(`Invalid release tag format - ${release.tag_name}`);
            resolve(undefined);
            return;
          }

          resolve(undefined);
          return;
        })
        .catch((error) => {
          log.debug(`Error - ${error}`);
          reject(error);
        });
    });
  }

  static isValidReleaseTag(tag?: string): boolean {
    return (tag?.match(/^v[0-9]+\.[0-9]+\.[0-9]+$/) != null);
  }

  async releasesRepositoryUrl(): Promise<string> {
    return await this.levainZipUrl();
  }

  async checkLevainUpdate() {
    if (!this.allowsUpdate()) {
      log.debug("");
      log.debug(`My version does not allow updates - ${LevainVersion.levainVersion}`);
      log.debug("");
      return;
    }

    try {
      const levainReleases = new LevainReleases(this.config);
      const latestVersion = await levainReleases.latestVersion();
      if (!this.needsUpdate(latestVersion)) {
        return;
      }

      if (!latestVersion) {
        return;
      }

      this.config.lastKnownVersion = latestVersion.versionNumber;
      await levainReleases.newReleaseInfo();

      if (!this.config.autoUpdate) {
        if (this.config.lastUpdateQuestion == DateUtils.dateTag()) {
          log.info(t("lib.releases.levain_releases.ignoringToday"));
          return;
        }

        console.log("");
        this.config.lastUpdateQuestion = DateUtils.dateTag();
        const answer = prompt(
          t("lib.releases.levain_releases.updateNow"),
          t("lib.releases.levain_releases.updateNowDefault"),
        );
        if (!answer || ![t("lib.releases.levain_releases.updateNowDefault")].includes(answer.toUpperCase())) {
          log.info(t("lib.releases.levain_releases.askLater"));
          return;
        }
      }

      log.info("");
      log.info(t("lib.releases.levain_releases.upgrading"));
      log.info("");

      this.config.shellCheckForUpdate = true;

      await levainReleases.prepareNewRelease();
    } catch (error) {
      log.debug(`Error ${error}`);
      log.info(t("lib.releases.levain_releases.ignoring"));
    }
  }

  allowsUpdate(): boolean {
    return !LevainVersion.isHeadVersion();
  }

  needsUpdate(newVersion?: VersionNumber): boolean {
    if (!newVersion) {
      log.debug(`No update needed - no new version`);
      return false;
    }

    const myVersion = LevainVersion.levainVersion;
    if (myVersion.isHEAD) {
      log.debug(`No update needed - vHEAD version`);
      return false;
    }

    if (!newVersion.isNewerThan(myVersion)) {
      log.debug(`No update needed - latest version ${newVersion} isn't newer than my version ${myVersion}`);
      return false;
    }

    log.debug(`UPDATE needed - my version ${myVersion} is older than ${newVersion}`);
    return true;
  }

  async newReleaseInfo() {
    log.info("");
    log.info("*********************************************************");
    log.info(t(
      "lib.releases.levain_releases.newReleaseAvailable",
      { yourVersion: LevainVersion.levainVersion, newVersion: await this.latestVersion() },
    ));
    log.info("*********************************************************");
    log.info("");
  }

  static parseSha256(content: string): string {
    const token = content.trim().split(/\s+/)[0]?.toLowerCase() ?? "";
    if (!/^[0-9a-f]{64}$/.test(token)) {
      throw new Error("Invalid SHA-256 checksum content");
    }
    return token;
  }

  static async computeFileSha256(filePath: string): Promise<string> {
    const fileBytes = await Deno.readFile(filePath);
    const hashBuffer = await crypto.subtle.digest("SHA-256", fileBytes);
    return Array.from(new Uint8Array(hashBuffer))
      .map((b) => b.toString(16).padStart(2, "0"))
      .join("");
  }

  static async verifyFileSha256(filePath: string, expectedSha256Content: string): Promise<void> {
    const expected = LevainReleases.parseSha256(expectedSha256Content);
    const actual = await LevainReleases.computeFileSha256(filePath);
    if (actual !== expected) {
      throw new Error(`SHA-256 checksum mismatch for ${filePath}: expected ${expected}, got ${actual}`);
    }
  }

  async fetchExpectedSha256(zipUrl: string): Promise<string> {
    const shaUrl = `${zipUrl}.sha256`;
    const response = await HttpUtils.get(shaUrl);
    if (!response.ok) {
      await response.body?.cancel();
      throw new Error(`Unable to fetch SHA-256 checksum from ${shaUrl} (HTTP ${response.status})`);
    }
    return await response.text();
  }

  async prepareNewRelease() {
    const releasesDir = GeneralPaths.tempLevainReleasesDir;
    log.debug(`Levain releases dir ${releasesDir}`);
    ensureDirSync(releasesDir);

    const newVersionDir = path.resolve(releasesDir, `levain-${await this.latestVersion()}`);
    log.debug(`Checking (1) Levain at ${newVersionDir}`);
    if (!existsSync(newVersionDir)) {
      let cachedZipPath: string | undefined;
      try {
        log.debug(`Downloading and verifying Levain release`);
        const url = await this.levainZipUrl();
        const expectedSha256 = await this.fetchExpectedSha256(url);
        const fileCache = new FileCache(this.config);
        cachedZipPath = await fileCache.get(url);
        await LevainReleases.verifyFileSha256(cachedZipPath, expectedSha256);

        log.debug(`Extracting verified Levain release to ${releasesDir}`);
        const extractor = new ExtractorFactory().createExtractor(this.config, cachedZipPath);
        await extractor.extract(false, cachedZipPath, releasesDir);
      } catch (error) {
        if (cachedZipPath) {
          OsUtils.removeFile(cachedZipPath);
        }
        const message = error instanceof Error ? error.message : JSON.stringify(error);
        log.error(t("lib.releases.levain_releases.unableToExtract", { error: message }));
        return;
      }
    }

    // Double check
    log.debug(`Checking (2) Levain at ${newVersionDir}`);
    if (!existsSync(newVersionDir)) {
      log.error(t("lib.releases.levain_releases.unableToLoad"));
      return;
    }

    log.info("");
    log.info(t("lib.releases.levain_releases.restarting"));
    log.info("");

    Deno.exit(UPDATE_REQUEST);
  }
}
