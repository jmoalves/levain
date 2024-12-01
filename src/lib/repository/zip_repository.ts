import * as log from "jsr:@std/log";
import * as path from "jsr:@std/path";
import {ensureDirSync, existsSync} from "jsr:@std/fs";

import Package from '../package/package.ts'
import Config from '../config.ts';
import FileCache from "../fs/file_cache.ts";
import {Extractor} from "../extract/extractor.ts"

import Repository from "./repository.ts";
import AbstractRepository from './abstract_repository.ts';
import RepositoryFactory from "./repository_factory.ts";

import ReaderFactory from "../io/reader_factory.ts";
import {ExtractorFactory} from "../extract/extractor_factory.ts";

export default class ZipRepository extends AbstractRepository {
    private repoFactory: RepositoryFactory

    private readonly localZip: string
    private readonly localDir: string
    private localRepo: Repository | undefined

    constructor(private config: Config, public readonly rootUrl: string, private rootOnly: boolean = false) {
        super(`ZipRepo`, path.resolve(rootUrl))

        if (!rootUrl.endsWith(".zip")) {
            let message = `Zip not found: ${this.absoluteURI}`
            if (rootUrl !== this.absoluteURI) {
                message += ` resolved from ${rootUrl}`
            }
            throw Error(message)
        }

        log.debug(`ZipRepo: Root=${this.rootUrl}`)
        this.repoFactory = new RepositoryFactory(config)

        this.localZip = path.resolve(this.config.levainCacheDir, "zipRepos", "zips", path.basename(this.rootUrl))
        this.localDir = path.resolve(this.config.levainCacheDir, "zipRepos", "dirs", path.basename(this.rootUrl, ".zip"))
    }

    describe(): string {
        const description: string = super.describe()
        if (this.rootUrl !== this.absoluteURI) {
            return description.replace(/\)/, ` resolved from ${this.rootUrl})`)
        }
        return description
    }

    async init(): Promise<void> {
        if (!existsSync(this.localDir)) {
            const zipfile = await this.copyLocalZip()
            await this.extractLocalZip(zipfile)
        }

        this.localRepo = await this.repoFactory.getOrCreate(this.localDir, this.rootOnly)

        this.setInitialized()
    }

    listPackages(): Array<Package> {
        if (!this.localRepo) {
            throw Error(`${this.name} not loaded`)
        }

        return this.localRepo.listPackages();
    }

    resolvePackage(packageName: string): Package | undefined {
        if (!this.localRepo) {
            throw Error(`${this.name} not loaded`)
        }

        return this.localRepo.resolvePackage(packageName);
    }

    async reload(): Promise<void> {
        return this.localRepo?.reload()
    }

    /////////////////////////////////////////////////////////////////////
    private async copyLocalZip(): Promise<string> {
        let reader = ReaderFactory.readerFor(this.rootUrl)
        const fileCache = new FileCache(this.config)
        return await fileCache.get(reader)
    }

    private async extractLocalZip(zipfile: string) {
        ensureDirSync(this.localDir)

        const factory: ExtractorFactory = new ExtractorFactory()
        const extractor: Extractor = factory.createExtractor(this.config, zipfile)
        await extractor.extract(false, zipfile, this.localDir)
    }
}
