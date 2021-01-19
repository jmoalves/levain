import * as log from "https://deno.land/std/log/mod.ts";
import * as path from "https://deno.land/std/path/mod.ts";
import { existsSync } from "https://deno.land/std/fs/exists.ts";

import Package from '../package/package.ts'
import Config from '../config.ts';

import AbstractRepository from './abstract_repository.ts';
import Repository from "./repository.ts";
import RepositoryFactory from "./repository_factory.ts";
import { FileUtils, ProgressReader } from "../file_utils.ts";
import HttpReader from "../io/http_reader.ts";
import FileReader from "../io/file_reader.ts";
import { unZipFromFile } from "https://deno.land/x/zip@v1.1.0/unzip.ts";

export default class ZipRepository extends AbstractRepository {
    readonly name

    private repoFactory: RepositoryFactory

    private readonly localZip: string
    private readonly localDir: string
    private localRepo: Repository|undefined

    constructor(private config: Config, private rootUrl: string, private rootOnly: boolean = false) {
        super()

        if (!rootUrl.endsWith(".zip")) {
            throw Error(`No zip url - ${rootUrl}`)
        }

        log.info(`ZipRepo: Root=${this.rootUrl}`)
        this.name = `zipRepo for ${this.rootUrl}`
        this.repoFactory = new RepositoryFactory(config)

        this.localZip = path.resolve(this.config.levainCacheDir, "zipRepos", "zips", path.basename(this.rootUrl))
        this.localDir = path.resolve(this.config.levainCacheDir, "zipRepos", "dirs", path.basename(this.rootUrl, ".zip"))
    }

    async init(): Promise<void> {
        if (!existsSync(this.localZip)) {
            await this.copyLocalZip()
        }

        if (!existsSync(this.localDir)) {
            await this.extractLocalZip()
        }

        this.localRepo = this.repoFactory.create(this.localDir, this.rootOnly);
        await this.localRepo.init();
    }

    invalidatePackages() {
        this.localRepo?.invalidatePackages();
    }

    get absoluteURI(): string {
        return this.rootUrl;
    }

    get packages(): Array<Package> {
        if (!this.localRepo) {
            throw Error(`${this.name} not loaded`)
        }

        return this.localRepo.packages;
    }

    resolvePackage(packageName: string): Package | undefined {
        if (!this.localRepo) {
            throw Error(`${this.name} not loaded`)
        }

        return this.localRepo.resolvePackage(packageName);
    }

    listPackages(): Array<Package> {
        if (!this.localRepo) {
            throw Error(`${this.name} not loaded`)
        }

        return this.localRepo.listPackages();
    }


    /////////////////////////////////////////////////////////////////////
    private async copyLocalZip() {
        let reader = this.createReader(this.rootUrl)
        await FileUtils.copyWithProgress(reader, this.localZip)
    }

    private async extractLocalZip() {
        return await unZipFromFile(
            this.localZip,
            this.localDir,
            {includeFileName: false}
        )
    }

    private createReader(url: string): ProgressReader {
        if (url.startsWith("http://") || url.startsWith("https://")) {
            return new HttpReader(this.config, this.rootUrl)
        }

        return new FileReader(url)
    }
}
